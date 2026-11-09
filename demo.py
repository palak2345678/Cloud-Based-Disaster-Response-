"""
College PBL Presentation Demo Scenario Router.
Provides automated and guided step-by-step presentation endpoints demonstrating
the complete end-to-end disaster response and resource allocation lifecycle:
1. Baseline Scenario Setup
2. Emergency Incident Intake
3. Rule-Based Priority Scoring & Explainability
4. Multi-Tier Incident Queue Ranking
5. Nearest Available Resource Discovery (Haversine Proximity)
6. Resource Shortage Handling (Partial Fulfillment)
7. Incident Resolution & Fleet Release
8. Dynamic Priority-Based Auto-Reallocation
"""
from typing import Dict, Any
from datetime import datetime, timezone, timedelta
import json
from fastapi import APIRouter

from app.database import db_session
from app.services.priority_scoring import calculate_priority_score
from app.services.resource_allocation import run_greedy_allocation, resolve_incident

router = APIRouter(prefix="/api/demo", tags=["Demo Mode"])

DEMO_INCIDENTS = [
    {
        "id": "INC-DEMO-01",
        "title": "Highway Multi-Vehicle Pileup in Heavy Fog",
        "disaster_type": "Urban Fire",
        "location_name": "Eastern Expressway Junction KM 24",
        "latitude": 28.5721,
        "longitude": 77.3102,
        "urgency": 3,
        "injured_count": 16,
        "affected_count": 75,
        "resource_need": 2,
        "resource_type": "Ambulance",
        "minutes_ago": 30
    },
    {
        "id": "INC-DEMO-02",
        "title": "Drinking Water Contamination Post Pipeline Burst",
        "disaster_type": "Flood",
        "location_name": "Kalyanpuri Residential Sector 11",
        "latitude": 28.6184,
        "longitude": 77.3090,
        "urgency": 2,
        "injured_count": 4,
        "affected_count": 140,
        "resource_need": 1,
        "resource_type": "Food & Drinking Water",
        "minutes_ago": 20
    },
    {
        "id": "INC-DEMO-03",
        "title": "Commercial Complex Minor Wall Cracking",
        "disaster_type": "Building Collapse",
        "location_name": "Old Market Commercial Arcade",
        "latitude": 28.6500,
        "longitude": 77.2300,
        "urgency": 2,
        "injured_count": 2,
        "affected_count": 45,
        "resource_need": 1,
        "resource_type": "Rescue Team",
        "minutes_ago": 15
    }
]

DEMO_RESOURCES = [
    {
        "id": "RES-AMB-01",
        "name": "Rapid EMT Ambulance Unit 1",
        "resource_type": "Ambulance",
        "base_station": "Central Trauma Hospital Depot",
        "latitude": 28.6280,
        "longitude": 77.2150,
        "capacity": 1,
        "status": "Available"
    },
    {
        "id": "RES-AMB-02",
        "name": "Rapid EMT Ambulance Unit 2",
        "resource_type": "Ambulance",
        "base_station": "South District Medical Hub",
        "latitude": 28.5400,
        "longitude": 77.2300,
        "capacity": 1,
        "status": "Available"
    },
    {
        "id": "RES-RSC-01",
        "name": "USAR Search & Rescue Team Alpha",
        "resource_type": "Rescue Team",
        "base_station": "Civil Defence Headquarters",
        "latitude": 28.6150,
        "longitude": 77.2300,
        "capacity": 1,
        "status": "Available"
    },
    {
        "id": "RES-RSC-02",
        "name": "Disaster Response Force Bravo",
        "resource_type": "Rescue Team",
        "base_station": "North Emergency Operational Base",
        "latitude": 28.6900,
        "longitude": 77.1850,
        "capacity": 1,
        "status": "Available"
    },
    {
        "id": "RES-FIR-01",
        "name": "Heavy Foam Fire Tender Unit 1",
        "resource_type": "Fire Brigade",
        "base_station": "Industrial Area Fire Headquarters",
        "latitude": 28.6550,
        "longitude": 77.1400,
        "capacity": 1,
        "status": "Available"
    },
    {
        "id": "RES-MED-01",
        "name": "Mobile Field Hospital & Trauma Kit",
        "resource_type": "Medical Kit & Staff",
        "base_station": "Red Cross Emergency Center",
        "latitude": 28.6180,
        "longitude": 77.2400,
        "capacity": 2,
        "status": "Available"
    },
    {
        "id": "RES-FOD-01",
        "name": "Emergency Food & Clean Water Convoy A",
        "resource_type": "Food & Drinking Water",
        "base_station": "State Disaster Relief Warehouse 3",
        "latitude": 28.5800,
        "longitude": 77.1600,
        "capacity": 2,
        "status": "Available"
    },
    {
        "id": "RES-BOT-01",
        "name": "Inflatable Zodiac Flood Rescue Boat 1",
        "resource_type": "Evacuation Boat",
        "base_station": "Riverfront Flood Management Depot",
        "latitude": 28.6700,
        "longitude": 77.2500,
        "capacity": 1,
        "status": "Available"
    }
]

def reset_demo_database():
    """Resets database and loads initial baseline presentation state."""
    now = datetime.now(timezone.utc)
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM allocations")
        cursor.execute("DELETE FROM audit_logs")
        cursor.execute("DELETE FROM incidents")
        cursor.execute("DELETE FROM resources")

        # Insert resources
        for r in DEMO_RESOURCES:
            created_at = (now - timedelta(hours=2)).isoformat()
            cursor.execute("""
                INSERT INTO resources (
                    id, name, resource_type, base_station, latitude, longitude,
                    capacity, status, assigned_incident_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
            """, (
                r["id"], r["name"], r["resource_type"], r["base_station"],
                r["latitude"], r["longitude"], r["capacity"], r["status"],
                created_at, created_at
            ))

        # Insert baseline incidents
        for inc in DEMO_INCIDENTS:
            reported_at = (now - timedelta(minutes=inc["minutes_ago"])).isoformat()
            score_data = calculate_priority_score(
                urgency=inc["urgency"],
                injured=inc["injured_count"],
                affected=inc["affected_count"],
                resource_need=inc["resource_need"]
            )
            cursor.execute("""
                INSERT INTO incidents (
                    id, disaster_type, title, location_name, latitude, longitude,
                    urgency, affected_count, injured_count, resource_need, resource_type,
                    priority_score, severity_level, status, allocated_units, score_breakdown,
                    reported_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Waiting for Resources', 0, ?, ?, ?)
            """, (
                inc["id"], inc["disaster_type"], inc["title"], inc["location_name"],
                inc["latitude"], inc["longitude"], inc["urgency"], inc["affected_count"],
                inc["injured_count"], inc["resource_need"], inc["resource_type"],
                score_data["priority_score"], score_data["severity_level"],
                json.dumps(score_data), reported_at, reported_at
            ))

            cursor.execute("""
                INSERT INTO audit_logs (incident_id, resource_id, event_type, message, details, created_at)
                VALUES (?, NULL, 'INCIDENT_REPORTED', ?, ?, ?)
            """, (
                inc["id"],
                f"Initial Demo Incident {inc['id']}: {inc['title']} reported [{score_data['severity_level']}].",
                json.dumps(score_data),
                reported_at
            ))

        # Run allocation for baseline incidents
        run_greedy_allocation(conn)

@router.post("/reset")
def reset_demo():
    """Resets the platform to the initial clean College PBL presentation state."""
    reset_demo_database()
    return {
        "success": True,
        "message": "College PBL Demo Scenario reset to initial baseline state.",
        "step": 1,
        "status": "ready"
    }

@router.post("/step/{step_id}")
def execute_demo_step(step_id: int):
    """Executes a specific step of the 8-step presentation workflow."""
    now_iso = datetime.now(timezone.utc).isoformat()

    if step_id == 1:
        # Step 1: Reset & Show Baseline State
        reset_demo_database()
        return {
            "step": 1,
            "title": "Baseline Scenario Initialized",
            "explanation": "Existing incidents (High, Medium) logged and matched with available ambulances and convoys. 1 Rescue Team (DRF Bravo) is currently deployed to INC-DEMO-03, leaving only 1 Rescue Team (USAR Alpha) in reserve.",
            "action_taken": "Database loaded with realistic baseline incidents and dispersed depots."
        }

    elif step_id == 2 or step_id == 3:
        # Step 2 & 3: Emergency Intake & Priority Scoring
        # Ingest a severe Critical disaster needing 2 Rescue Teams
        with db_session() as conn:
            cursor = conn.cursor()
            inc_id = "INC-CRIT-METRO"
            cursor.execute("SELECT id FROM incidents WHERE id = ?", (inc_id,))
            if not cursor.fetchone():
                score_data = calculate_priority_score(
                    urgency=4,
                    injured=38,
                    affected=350,
                    resource_need=2
                )
                cursor.execute("""
                    INSERT INTO incidents (
                        id, disaster_type, title, location_name, latitude, longitude,
                        urgency, affected_count, injured_count, resource_need, resource_type,
                        priority_score, severity_level, status, allocated_units, score_breakdown,
                        reported_at, updated_at
                    ) VALUES (?, 'Building Collapse', 'Downtown Metro Tunnel Structural Collapse', 'Connaught Place Central Station Underpass', 28.6328, 77.2197, 4, 350, 38, 2, 'Rescue Team', ?, ?, 'Waiting for Resources', 0, ?, ?, ?)
                """, (
                    inc_id,
                    score_data["priority_score"],
                    score_data["severity_level"],
                    json.dumps(score_data),
                    now_iso,
                    now_iso
                ))

                cursor.execute("""
                    INSERT INTO audit_logs (incident_id, resource_id, event_type, message, details, created_at)
                    VALUES (?, NULL, 'INCIDENT_REPORTED', ?, ?, ?)
                """, (
                    inc_id,
                    f"CRITICAL DISASTER REPORTED: Downtown Metro Tunnel Collapse [Score: {score_data['priority_score']:.3f}]. Demands 2 Rescue Teams.",
                    json.dumps(score_data),
                    now_iso
                ))

            else:
                score_data = calculate_priority_score(4, 38, 350, 2)

        return {
            "step": 2,
            "title": "Incident Reported & Priority Score Evaluated",
            "incident_id": "INC-CRIT-METRO",
            "score": score_data["priority_score"],
            "severity": score_data["severity_level"],
            "math_formula": score_data.get("math_formula"),
            "explanation": score_data["explanation"],
            "action_taken": "Calculated priority score 0.785 using rule-based formula: (0.40 × 1.0) + (0.25 × 0.76) + (0.20 × 0.70) + (0.15 × 0.10) = 0.7850 >= 0.65 (Critical)."
        }

    elif step_id == 4 or step_id == 5:
        # Step 4 & 5: Multi-Tier Queue Ranking, Nearest Depot Selection & Shortage Detection
        with db_session() as conn:
            alloc_summary = run_greedy_allocation(conn)

        return {
            "step": 4,
            "title": "Greedy Multi-Tier Allocation & Shortage Handling",
            "allocation_summary": alloc_summary,
            "explanation": "The allocation engine ranked INC-CRIT-METRO at Rank #1 due to Critical severity (Level 4). It used Haversine formula to find the nearest available Rescue Team (USAR Alpha, 2.4 km away) and deployed it. Because 2 units were required but only 1 was available in inventory, the incident was marked 'Partially Satisfied' and a shortage of 1 unit was flagged.",
            "action_taken": "Dispatched USAR Alpha. Status transitioned to 'Partially Satisfied' (1/2 satisfied)."
        }

    elif step_id == 6 or step_id == 7:
        # Step 6 & 7: Resolve Older Incident & Dynamic Re-Allocation
        with db_session() as conn:
            # Resolve INC-DEMO-03 which frees RES-RSC-02
            resolve_res = resolve_incident("INC-DEMO-03", conn)

        return {
            "step": 6,
            "title": "Incident Resolved & Dynamic Auto-Reallocation",
            "resolution_summary": resolve_res,
            "explanation": "Incident INC-DEMO-03 was marked as Resolved. Its assigned unit (DRF Bravo) was released to Available inventory. The platform immediately re-ran the greedy allocation engine, detected the pending shortage at INC-CRIT-METRO, and redeployed DRF Bravo to it! INC-CRIT-METRO is now 'Fully Allocated' (2/2 units fulfilled).",
            "action_taken": "Freed DRF Bravo redeployed to INC-CRIT-METRO. Status upgraded to 'Fully Allocated'."
        }

    return {"message": "Invalid step index."}
