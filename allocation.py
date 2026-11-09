"""
Pydantic Schemas for Resource Allocations and Audit Logs.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class AllocationRecord(BaseModel):
    id: int
    incident_id: str
    resource_id: str
    resource_type: str
    units_allocated: int
    distance_km: float
    status: str
    allocated_at: str
    released_at: Optional[str] = None

class GreedyAllocationRunResponse(BaseModel):
    message: str
    evaluated_incidents: int
    allocations_made: int
    allocations: List[Dict[str, Any]]
    shortages: List[Dict[str, Any]]

class AuditLogEntry(BaseModel):
    id: int
    incident_id: Optional[str] = None
    resource_id: Optional[str] = None
    event_type: str
    message: str
    details: Optional[str] = None
    created_at: str
