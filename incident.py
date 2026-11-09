"""
Pydantic Schemas for Incident Reporting, Scoring, and Management.
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator
from app.config import RESOURCE_TYPES, DISASTER_TYPES

class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150, description="Short descriptive title of incident")
    disaster_type: str = Field(..., description="Type of disaster")
    location_name: str = Field(..., min_length=2, max_length=150, description="Address or Landmark")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate")
    urgency: int = Field(..., ge=1, le=4, description="Urgency scale 1 to 4")
    affected_count: int = Field(..., ge=0, description="Number of people affected")
    injured_count: int = Field(..., ge=0, description="Number of people injured")
    resource_need: int = Field(..., ge=1, le=100, description="Number of resource units required")
    resource_type: str = Field(..., description="Type of emergency resource needed")

    @model_validator(mode="after")
    def validate_casualties_and_types(self):
        if self.injured_count > self.affected_count and self.affected_count > 0:
            raise ValueError("Injured count cannot exceed total affected count.")
        if self.resource_type not in RESOURCE_TYPES:
            # Allow custom string if coordinator specifies, but validate non-empty
            if not self.resource_type.strip():
                raise ValueError("Resource type cannot be empty.")
        return self

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    urgency: Optional[int] = Field(None, ge=1, le=4)
    affected_count: Optional[int] = Field(None, ge=0)
    injured_count: Optional[int] = Field(None, ge=0)
    resource_need: Optional[int] = Field(None, ge=1)
    status: Optional[str] = None

class IncidentResponse(BaseModel):
    id: str
    disaster_type: str
    title: str
    location_name: str
    latitude: float
    longitude: float
    urgency: int
    affected_count: int
    injured_count: int
    resource_need: int
    resource_type: str
    priority_score: float
    severity_level: str
    status: str
    allocated_units: int
    score_breakdown: Optional[Dict[str, Any]] = None
    reported_at: str
    updated_at: str
