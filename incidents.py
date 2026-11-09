"""
Incidents API Router.
Handles incident intake, automated priority scoring, status tracking, and resolution.
"""
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.database import db_session, dict_from_row, dicts_from_rows
from app.schemas.incident import IncidentCreate, IncidentResponse
from app.services.priority_scoring import calculate_priority_score
from app.services.resource_allocation import run_greedy_allocation, resolve_incident

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

def generate_incident_id(conn) -> str:
    """Generates sequential incident ID formatted as INC-2026-XXX."""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM incidents ORDER BY ROWID DESC LIMIT 1")
    row = cursor.fetchone()
    if not row or not row["id"].startswith("INC-2026-"):
        next_num = 1
    else:
        try:
            current_num = int(row["id"].split("-")[-1])
            next_num = current_num + 1
        except Exception:
            next_num = 1
    return f"INC-2026-{next_num:03d}"

@router.get("", response_model=List[IncidentResponse])
def get_incidents(
    severity: Optional[str] = Query(None, description="Filter by Critical, High, Medium, Low"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    disaster_type: Optional[str] = Query(None, description="Filter by disaster type"),
    search: Optional[str] = Query(None, description="Search by title or location")
):
    """Retrieves all incidents with optional multi-criteria filtering."""
    with db_session() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM incidents WHERE 1=1"
        params = []

        if severity:
            query += " AND severity_level = ?"
            params.append(severity)
        if status_filter:
            if status_filter == "Waiting for Resources":
                query += " AND (status = 'Waiting for Resources' OR status = 'Pending')"
            elif status_filter == "Fully Allocated":
                query += " AND (status = 'Fully Allocated' OR status = 'Assigned')"
            else:
                query += " AND status = ?"
                params.append(status_filter)
        if disaster_type:
            query += " AND disaster_type = ?"
            params.append(disaster_type)
        if search:
            query += " AND (title LIKE ? OR location_name LIKE ? OR id LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

        # Order by priority score descending, then reported_at ascending
        query += " ORDER BY priority_score DESC, reported_at ASC"
        cursor.execute(query, params)
        rows = dicts_from_rows(cursor.fetchall())

        result = []
        for r in rows:
            if r.get("score_breakdown"):
                try:
                    r["score_breakdown"] = json.loads(r["score_breakdown"])
                except Exception:
                    r["score_breakdown"] = None
            result.append(r)
        return result

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: str):
    """Retrieves a single incident by ID with full priority calculation breakdown."""
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
        row = dict_from_row(cursor.fetchone())
        if not row:
            raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")

        if row.get("score_breakdown"):
            try:
                row["score_breakdown"] = json.loads(row["score_breakdown"])
            except Exception:
                row["score_breakdown"] = None
        return row

@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def report_incident(payload: IncidentCreate):
    """
    Intake a new emergency incident:
    1. Generates unique incident ID
    2. Calculates priority score using PBL research formula:
       Priority Score = (0.40 × Urgency) + (0.25 × Injured) + (0.20 × Affected) + (0.15 × Resource Need)
    3. Categorizes severity level (Critical, High, Medium, Low)
    4. Persists record and creates audit log
    5. Automatically runs greedy resource allocation engine
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    # Step 1 & 2: Calculate Priority Score, Severity, and Explanation
    score_data = calculate_priority_score(
        urgency=payload.urgency,
        injured=payload.injured_count,
        affected=payload.affected_count,
        resource_need=payload.resource_need
    )

    with db_session() as conn:
        cursor = conn.cursor()
        incident_id = generate_incident_id(conn)

        # Step 3: Insert Incident with initial 'Waiting for Resources'
        cursor.execute("""
            INSERT INTO incidents (
                id, disaster_type, title, location_name, latitude, longitude,
                urgency, affected_count, injured_count, resource_need, resource_type,
                priority_score, severity_level, status, allocated_units, score_breakdown,
                reported_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Waiting for Resources', 0, ?, ?, ?)
        """, (
            incident_id, payload.disaster_type, payload.title, payload.location_name,
            payload.latitude, payload.longitude, payload.urgency, payload.affected_count,
            payload.injured_count, payload.resource_need, payload.resource_type,
            score_data["priority_score"], score_data["severity_level"],
            json.dumps(score_data), now_iso, now_iso
        ))

        # Audit log for reporting
        cursor.execute("""
            INSERT INTO audit_logs (incident_id, resource_id, event_type, message, details, created_at)
            VALUES (?, NULL, 'INCIDENT_REPORTED', ?, ?, ?)
        """, (
            incident_id,
            f"Emergency reported: {payload.title} [{score_data['severity_level']} - Score: {score_data['priority_score']:.3f}]. {score_data['explanation']}",
            json.dumps(score_data),
            now_iso
        ))

        # Step 4: Run greedy resource allocation automatically
        run_greedy_allocation(conn)

        # Fetch updated record with latest allocation status
        cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
        updated_row = dict_from_row(cursor.fetchone())
        if updated_row and updated_row.get("score_breakdown"):
            updated_row["score_breakdown"] = json.loads(updated_row["score_breakdown"])

        return updated_row

@router.post("/{incident_id}/resolve")
def resolve_incident_endpoint(incident_id: str):
    """Marks an incident as resolved, releases all assigned resources, and auto-reallocates."""
    try:
        result = resolve_incident(incident_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{incident_id}")
def delete_incident(incident_id: str):
    """Deletes an incident and releases any associated resources."""
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
        inc = dict_from_row(cursor.fetchone())
        if not inc:
            raise HTTPException(status_code=404, detail="Incident not found.")

        # Release assigned resources
        cursor.execute("UPDATE resources SET status = 'Available', assigned_incident_id = NULL WHERE assigned_incident_id = ?", (incident_id,))
        cursor.execute("DELETE FROM allocations WHERE incident_id = ?", (incident_id,))
        cursor.execute("DELETE FROM incidents WHERE id = ?", (incident_id,))

        # Run allocation for remaining incidents
        run_greedy_allocation(conn)
        return {"success": True, "message": f"Incident {incident_id} removed."}
