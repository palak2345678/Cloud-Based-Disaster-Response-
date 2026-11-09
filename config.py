"""
Configuration and Parameters for Disaster Response Coordination Platform.
Defines weights, normalization constants, and severity thresholds from the PBL research project.
"""
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATABASE_PATH = BASE_DIR / "disaster_coordination.db"
MODEL_PATH = DATA_DIR / "rf_severity_model.joblib"
HISTORICAL_DATASET_PATH = DATA_DIR / "historical_disasters.csv"

# Formula Weights from Research Project:
# Priority Score = (0.40 × Urgency) + (0.25 × Injured) + (0.20 × Affected) + (0.15 × Resource Need)
WEIGHT_URGENCY = 0.40
WEIGHT_INJURED = 0.25
WEIGHT_AFFECTED = 0.20
WEIGHT_RESOURCE_NEED = 0.15

# Normalization Upper Bounds (used to scale domain values to [0.0, 1.0])
MAX_URGENCY = 4.0          # Urgency is on scale 1 to 4
MAX_INJURED = 50.0         # Incidents with >= 50 injured receive maximum injured score factor
MAX_AFFECTED = 500.0       # Incidents with >= 500 affected receive maximum affected score factor
MAX_RESOURCE_NEED = 20.0   # Incidents needing >= 20 units receive maximum resource need factor

# Severity Categorization Thresholds from PBL Specification:
# - Low: score < 0.25
# - Medium: score >= 0.25
# - High: score >= 0.45
# - Critical: score >= 0.65
THRESHOLD_LOW = 0.00
THRESHOLD_MEDIUM = 0.25
THRESHOLD_HIGH = 0.45
THRESHOLD_CRITICAL = 0.65

# Severities Ordering for Multi-tier Priority Ranking
SEVERITY_ORDER = {
    "Critical": 4,
    "High": 3,
    "Medium": 2,
    "Low": 1
}

# Standard Resource Types supported by the coordination platform
RESOURCE_TYPES = [
    "Ambulance",
    "Rescue Team",
    "Fire Brigade",
    "Medical Kit & Staff",
    "Food & Drinking Water",
    "Evacuation Boat",
    "Heavy Earthmover"
]

# Standard Disaster Types
DISASTER_TYPES = [
    "Earthquake",
    "Flood",
    "Urban Fire",
    "Wildfire",
    "Cyclone",
    "Industrial Chemical Leak",
    "Landslide",
    "Building Collapse",
    "Tsunami"
]
