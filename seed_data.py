"""
Seed Data Generator for Disaster Response Coordination Platform.
Populates realistic disaster incidents and distributed emergency resources
across a metropolitan disaster coordination zone (lat 28.50 - 28.75, lon 77.10 - 77.35).
"""
import json
from datetime import datetime, timezone, timedelta
from app.database import db_session
from app.services.priority_scoring import calculate_priority_score
from app.services.resource_allocation import run_greedy_allocation

SAMPLE_RESOURCES = [
    {
        "id": "RES-AMB-01",
        "name": "Rapid EMT Ambulance Unit 1",
        "resource_type": "Ambulance",
        "base_station": "Central Trauma Hospital Depot",
        "latitude": 28.6280,
        "longitude": 77.2150,
        "capacity": 2,
        "status": "Available"
    },
    {
        "id": "RES-AMB-02",
        "name": "Rapid EMT Ambulance Unit 2",
        "resource_type": "Ambulance",
        "base_station": "South District Medical Hub",
        "latitude": 28.5400,
        "longitude": 77.2300,
        "capacity": 2,
        "status": "Available"
    },
    {
        "id": "RES-AMB-03",
        "name": "East Regional Ambulance Unit 3",
        "resource_type": "Ambulance",
        "base_station": "Mayur Vihar Fire & EMS Station",
        "latitude": 28.6010,
        "longitude": 77.2950,
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
        "capacity": 3,
        "status": "Available"
    },
    {
        "id": "RES-RSC-02",
        "name": "Disaster Response Force Bravo",
        "resource_type": "Rescue Team",
        "base_station": "North Emergency Operational Base",
        "latitude": 28.6900,
        "longitude": 77.1850,
        "capacity": 2,
        "status": "Available"
    },
    {
        "id": "RES-FIR-01",
        "name": "Heavy Foam Fire Tender Unit 1",
        "resource_type": "Fire Brigade",
        "base_station": "Industrial Area Fire Headquarters",
        "latitude": 28.6550,
        "longitude": 77.1400,
        "capacity": 2,
        "status": "Available"
    },
    {
        "id": "RES-FIR-02",
        "name": "High-Rise Ladder Fire Brigade 2",
        "resource_type": "Fire Brigade",
        "base_station": "Downtown Fire Station 12",
        "latitude": 28.6320,
        "longitude": 77.2200,
        "capacity": 2,
        "status": "Available"
    },
    {
        "id": "RES-MED-01",
        "name": "Mobile Field Hospital & Trauma Kit",
        "resource_type": "Medical Kit & Staff",
        "base_station": "Red Cross Emergency Center",
        "latitude": 28.6180,
        "longitude": 77.2400,
        "capacity": 5,
        "status": "Available"
    },
    {
        "id": "RES-MED-02",
        "name": "Disaster Medical Triage Kit Unit 2",
        "resource_type": "Medical Kit & Staff",
        "base_station": "West District Medical Depot",
        "latitude": 28.6400,
        "longitude": 77.1200,
        "capacity": 4,
        "status": "Available"
    },
    {
        "id": "RES-FOD-01",
        "name": "Emergency Food & Clean Water Convoy A",
        "resource_type": "Food & Drinking Water",
        "base_station": "State Disaster Relief Warehouse 3",
        "latitude": 28.5800,
        "longitude": 77.1600,
        "capacity": 6,
        "status": "Available"
    },
    {
        "id": "RES-BOT-01",
        "name": "Inflatable Zodiac Flood Rescue Boat 1",
        "resource_type": "Evacuation Boat",
        "base_station": "Riverfront Flood Management Depot",
        "latitude": 28.6700,
        "longitude": 77.2500,
        "capacity": 3,
        "status": "Available"
    },
    {
        "id": "RES-EMO-01",
        "name": "Heavy Hydraulic Earthmover Unit 1",
        "resource_type": "Heavy Earthmover",
        "base_station": "Highway Infrastructure Depot",
        "latitude": 28.5200,
        "longitude": 77.2700,
        "capacity": 1,
        "status": "Available"
    }
]

SAMPLE_INCIDENTS = [
    {
        "id": "INC-2026-001",
        "title": "Commercial Complex Structural Collapse",
        "disaster_type": "Building Collapse",
        "location_name": "Sector 18 Commercial Hub, Block B",
        "latitude": 28.6328,
        "longitude": 77.2197,
        "urgency": 4,
        "injured_count": 38,
        "affected_count": 350,
        "resource_need": 3,
        "resource_type": "Rescue Team",
        "minutes_ago": 45
    },
    {
        "id": "INC-2026-002",
        "title": "Petrochemical Plant Explosion & Chemical Blaze",
        "disaster_type": "Industrial Chemical Leak",
        "location_name": "Okhla Industrial Area Phase II",
        "latitude": 28.5355,
        "longitude": 77.2732,
        "urgency": 4,
        "injured_count": 26,
        "affected_count": 280,
        "resource_need": 2,
        "resource_type": "Fire Brigade",
        "minutes_ago": 35
    },
    {
        "id": "INC-2026-003",
        "title": "Yamuna Riverbank Flash Inundation",
        "disaster_type": "Flood",
        "location_name": "Low-Lying Settlement, Wazirabad Ghat",
        "latitude": 28.7112,
        "longitude": 77.2345,
        "urgency": 3,
        "injured_count": 12,
        "affected_count": 220,
        "resource_need": 3,
        "resource_type": "Evacuation Boat",
        "minutes_ago": 25
    },
    {
        "id": "INC-2026-004",
        "title": "Highway Multi-Vehicle Pileup in Heavy Fog",
        "disaster_type": "Urban Fire",
        "location_name": "Eastern Peripheral Expressway KM 24",
        "latitude": 28.5721,
        "longitude": 77.3102,
        "urgency": 3,
        "injured_count": 18,
        "affected_count": 65,
        "resource_need": 3,
        "resource_type": "Ambulance",
        "minutes_ago": 20
    },
    {
        "id": "INC-2026-005",
        "title": "Drinking Water Contamination Post Pipeline Burst",
        "disaster_type": "Flood",
        "location_name": "Kalyanpuri Residential Sector 11",
        "latitude": 28.6184,
        "longitude": 77.3090,
        "urgency": 2,
        "injured_count": 4,
        "affected_count": 140,
        "resource_need": 2,
        "resource_type": "Food & Drinking Water",
        "minutes_ago": 15
    },
    {
        "id": "INC-2026-006",
        "title": "Landslide Roadblock on Ridge Access Route",
        "disaster_type": "Landslide",
        "location_name": "Northern Ridge Scenic Byway Sector 7",
        "latitude": 28.6850,
        "longitude": 77.2050,
        "urgency": 2,
        "injured_count": 2,
        "affected_count": 40,
        "resource_need": 1,
        "resource_type": "Heavy Earthmover",
        "minutes_ago": 10
    },
    {
        "id": "INC-2026-007",
        "title": "Minor Transformer Fire at Substation",
        "disaster_type": "Urban Fire",
        "location_name": "Rohini Sector 3 Utility Compound",
        "latitude": 28.7050,
        "longitude": 77.1150,
        "urgency": 1,
        "injured_count": 0,
        "affected_count": 15,
        "resource_need": 1,
        "resource_type": "Fire Brigade",
        "minutes_ago": 5
    }
]

def seed_database(reset: bool = False):
    """Inserts initial resources and incidents, calculates priority scores, and runs initial allocation."""
    now = datetime.now(timezone.utc)

    with db_session() as conn:
        cursor = conn.cursor()

        if reset:
            cursor.execute("DELETE FROM allocations")
            cursor.execute("DELETE FROM audit_logs")
            cursor.execute("DELETE FROM incidents")
            cursor.execute("DELETE FROM resources")

        # Check if resources already exist
        cursor.execute("SELECT COUNT(*) as count FROM resources")
        if cursor.fetchone()["count"] == 0:
            for r in SAMPLE_RESOURCES:
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

        # Check if incidents already exist
        cursor.execute("SELECT COUNT(*) as count FROM incidents")
        if cursor.fetchone()["count"] == 0:
            for inc in SAMPLE_INCIDENTS:
                reported_at = (now - timedelta(minutes=inc["minutes_ago"])).isoformat()
                
                # Rule-based calculation from research project formula
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
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 0, ?, ?, ?)
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
                    f"Incident {inc['id']}: {inc['title']} reported with {score_data['severity_level']} severity.",
                    json.dumps(score_data),
                    reported_at
                ))

        # Run greedy allocation engine to allocate initial resources based on priority
        run_greedy_allocation(conn)
