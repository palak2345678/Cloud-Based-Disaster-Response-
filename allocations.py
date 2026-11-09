"""
Allocations and Audit Logs API Router.
Provides endpoints for executing the greedy allocation engine and querying audit trails.
"""
from typing import List, Optional
from fastapi import APIRouter, Query

from app.database import db_session, dicts_from_rows
from app.schemas.allocation import AllocationRecord, GreedyAllocationRunResponse, AuditLogEntry
from app.services.resource_allocation import run_greedy_allocation

router = APIRouter(prefix="/api/allocations", tags=["Allocations"])

@router.post("/run", response_model=GreedyAllocationRunResponse)
def trigger_greedy_allocation():
    """
    Manually runs the Priority-Based Greedy Resource Allocation Algorithm:
    1. Multi-tier ranking: Severity Level -> Priority Score -> Report Time
    2. Exact resource type matching
    3. Nearest geographic assignment via Haversine distance
    4. Categorizes into Fully Allocated, Partially Satisfied, or Waiting for Resources
    """
    result = run_greedy_allocation()
    return result

@router.get("", response_model=List[AllocationRecord])
def get_allocations(
    incident_id: Optional[str] = Query(None, description="Filter by incident ID"),
    resource_id: Optional[str] = Query(None, description="Filter by resource ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by Active or Released")
):
    """Retrieves all allocation historical records."""
    with db_session() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM allocations WHERE 1=1"
        params = []

        if incident_id:
            query += " AND incident_id = ?"
            params.append(incident_id)
        if resource_id:
            query += " AND resource_id = ?"
            params.append(resource_id)
        if status_filter:
            query += " AND status = ?"
            params.append(status_filter)

        query += " ORDER BY allocated_at DESC"
        cursor.execute(query, params)
        return dicts_from_rows(cursor.fetchall())

@router.get("/logs", response_model=List[AuditLogEntry])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    incident_id: Optional[str] = Query(None)
):
    """Retrieves system audit logs and allocation telemetry."""
    with db_session() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM audit_logs WHERE 1=1"
        params = []

        if incident_id:
            query += " AND incident_id = ?"
            params.append(incident_id)

        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        return dicts_from_rows(cursor.fetchall())
