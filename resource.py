"""
Pydantic Schemas for Resource Management.
"""
from typing import Optional
from pydantic import BaseModel, Field

class ResourceCreate(BaseModel):
    id: Optional[str] = None  # If omitted, auto-generated
    name: str = Field(..., min_length=2, max_length=100)
    resource_type: str = Field(...)
    base_station: str = Field(..., min_length=2, max_length=150)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    capacity: int = Field(1, ge=1, le=50)
    status: str = Field("Available")

class ResourceStatusUpdate(BaseModel):
    status: str = Field(..., description="'Available', 'Deployed', or 'Released'")

class ResourceResponse(BaseModel):
    id: str
    name: str
    resource_type: str
    base_station: str
    latitude: float
    longitude: float
    capacity: int
    status: str
    assigned_incident_id: Optional[str] = None
    created_at: str
    updated_at: str
