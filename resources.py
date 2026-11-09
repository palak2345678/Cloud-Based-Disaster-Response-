"""
Resources API Router.
Handles live emergency resource fleet management, status updates, releases, and auto-allocation.
"""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.database import db_session, dict_from_row, dicts_from_rows
from app.schemas.resource import ResourceCreate, ResourceResponse, ResourceStatusUpdate
from app.services.resource_allocation import run_greedy_allocation, release_resource

router = APIRouter(prefix="/api/resources", tags=["Resources"])

def generate_resource_id(conn, res_type: str) -> str:
    """Generates a clean resource identifier based on type prefix (e.g. RES-AMB-04)."""
    prefix_map = {
        "Ambulance": "AMB",
        "Rescue Team": "RSC",
        "Fire Brigade": "FIR",
        "Medical Kit & Staff": "MED",
        "Food & Drinking Water": "FOD",
        "Evacuation Boat": "BOT",
        "Heavy Earthmover": "EMO"
    }
    short_code = prefix_map.get(res_type, "GEN")
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM resources WHERE id LIKE ?", (f"RES-{short_code}-%",))
    count = cursor.fetchone()["count"]
    return f"RES-{short_code}-{count + 1:02d}"

@router.get("", response_model=List[ResourceResponse])
def get_resources(
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by Available, Deployed, Released"),
    search: Optional[str] = Query(None, description="Search by name or base station")
):
    """Retrieves all emergency resources with optional filtering."""
    with db_session() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM resources WHERE 1=1"
        params = []

        if resource_type:
            query += " AND resource_type = ?"
            params.append(resource_type)
        if status_filter:
            query += " AND status = ?"
            params.append(status_filter)
        if search:
            query += " AND (name LIKE ? OR base_station LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])

        query += " ORDER BY resource_type ASC, name ASC"
        cursor.execute(query, params)
        return dicts_from_rows(cursor.fetchall())

@router.get("/{resource_id}", response_model=ResourceResponse)
def get_resource(resource_id: str):
    """Retrieves single resource details by ID."""
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM resources WHERE id = ?", (resource_id,))
        row = dict_from_row(cursor.fetchone())
        if not row:
            raise HTTPException(status_code=404, detail=f"Resource {resource_id} not found.")
        return row

@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def add_resource(payload: ResourceCreate):
    """
    Adds a new emergency response resource to inventory.
    If added with status 'Available', automatically triggers greedy allocation to satisfy waiting incidents.
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    with db_session() as conn:
        cursor = conn.cursor()
        res_id = payload.id or generate_resource_id(conn, payload.resource_type)

        cursor.execute("SELECT id FROM resources WHERE id = ?", (res_id,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail=f"Resource ID {res_id} already exists.")

        cursor.execute("""
            INSERT INTO resources (
                id, name, resource_type, base_station, latitude, longitude,
                capacity, status, assigned_incident_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
        """, (
            res_id, payload.name, payload.resource_type, payload.base_station,
            payload.latitude, payload.longitude, payload.capacity, payload.status,
            now_iso, now_iso
        ))

        cursor.execute("""
            INSERT INTO audit_logs (incident_id, resource_id, event_type, message, details, created_at)
            VALUES (NULL, ?, 'RESOURCE_ADDED', ?, ?, ?)
        """, (
            res_id,
            f"Added new resource {payload.name} ({payload.resource_type}) at {payload.base_station} with capacity {payload.capacity}.",
            None,
            now_iso
        ))

        if payload.status == "Available":
            # Auto-allocate to waiting incidents
            run_greedy_allocation(conn)

        cursor.execute("SELECT * FROM resources WHERE id = ?", (res_id,))
        return dict_from_row(cursor.fetchone())

@router.patch("/{resource_id}/status")
def update_resource_status(resource_id: str, payload: ResourceStatusUpdate):
    """
    Updates the operational status of a resource ('Available', 'Deployed', 'Released').
    If released or made available, triggers automatic reallocation.
    """
    new_status = payload.status
    if new_status not in ["Available", "Deployed", "Released", "Maintenance"]:
        raise HTTPException(status_code=400, detail="Invalid status value.")

    if new_status in ["Available", "Released"]:
        return release_resource(resource_id)

    now_iso = datetime.now(timezone.utc).isoformat()
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM resources WHERE id = ?", (resource_id,))
        res = dict_from_row(cursor.fetchone())
        if not res:
            raise HTTPException(status_code=404, detail="Resource not found.")

        cursor.execute("""
            UPDATE resources
            SET status = ?, updated_at = ?
            WHERE id = ?
        """, (new_status, now_iso, resource_id))

        return {"success": True, "message": f"Resource status updated to {new_status}.", "resource_id": resource_id}

@router.post("/{resource_id}/release")
def release_resource_endpoint(resource_id: str):
    """Explicitly releases a deployed resource and reallocates to waiting incidents."""
    try:
        return release_resource(resource_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{resource_id}")
def delete_resource(resource_id: str):
    """Deletes an unassigned resource from inventory."""
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM resources WHERE id = ?", (resource_id,))
        res = dict_from_row(cursor.fetchone())
        if not res:
            raise HTTPException(status_code=404, detail="Resource not found.")

        if res["status"] == "Deployed":
            raise HTTPException(status_code=400, detail="Cannot delete a deployed resource. Release it first.")

        cursor.execute("DELETE FROM resources WHERE id = ?", (resource_id,))
        return {"success": True, "message": f"Resource {resource_id} deleted."}
