"""
AI Severity Prediction API Router (Random Forest Module - Future Enhancement).
Provides architectural specifications, feature vector definitions, target classes,
and a prototype simulation comparison for future Random Forest model integration.
"""
from typing import Dict, Any, List
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.priority_scoring import calculate_priority_score

router = APIRouter(prefix="/api/ai", tags=["AI Severity Prediction"])

class FutureAISimulationRequest(BaseModel):
    disaster_type: str = Field(..., description="e.g. Flood, Earthquake")
    urgency: int = Field(..., ge=1, le=4)
    injured: int = Field(..., ge=0)
    affected: int = Field(..., ge=0)
    resource_need: int = Field(..., ge=1)
    weather_condition: str = Field("Clear")
    infrastructure_damage: str = Field("Moderate")

@router.get("/info")
def get_future_ai_overview() -> Dict[str, Any]:
    """
    Returns the architectural blueprint and integration specification
    for the future Random Forest Machine Learning module.
    """
    return {
        "title": "Random Forest Severity Prediction – Future Enhancement",
        "purpose": (
            "The future Random Forest classifier is designed to augment rule-based emergency triage "
            "by learning multi-variate, non-linear relationships across multi-agency disaster datasets. "
            "It assists emergency coordinators by capturing compounding environmental factors (e.g., severe storm "
            "compounding flood triage, or catastrophic structural collapse in high-density urban corridors) "
            "without introducing cognitive overload during fast-moving disaster responses."
        ),
        "input_features": [
            {"name": "urgency", "type": "Discrete (1-4)", "description": "Triage urgency rating from field personnel"},
            {"name": "injured", "type": "Continuous integer", "description": "Number of recorded injured casualties requiring medical care"},
            {"name": "affected", "type": "Continuous integer", "description": "Estimated total civilian population impacted or displaced"},
            {"name": "resource_need", "type": "Discrete integer", "description": "Number of emergency response units requested"},
            {"name": "disaster_type", "type": "Categorical (One-Hot)", "description": "Hazard taxonomy (Earthquake, Flood, Fire, Cyclone, Chemical, etc.)"},
            {"name": "weather_condition", "type": "Categorical", "description": "Atmospheric telemetry (Clear, Rain, Severe Storm, Gale Wind, Extreme Heat, Fog)"},
            {"name": "infrastructure_damage", "type": "Ordinal", "description": "Physical asset integrity (Minor, Moderate, Severe, Catastrophic)"},
            {"name": "population_density", "type": "Continuous ratio", "description": "Urban density index of disaster coordinate target zone"}
        ],
        "output_classes": [
            {"class_name": "Critical", "threshold_equivalent": "Score >= 0.65", "action": "Immediate life-saving dispatch, multi-depot mobilization"},
            {"class_name": "High", "threshold_equivalent": "Score >= 0.45 and < 0.65", "action": "Urgent deployment, regional fleet standby"},
            {"class_name": "Medium", "threshold_equivalent": "Score >= 0.25 and < 0.45", "action": "Contained threat response, standard dispatch queue"},
            {"class_name": "Low", "threshold_equivalent": "Score < 0.25", "action": "Advisory monitoring, local community support"}
        ],
        "model_architecture": {
            "algorithm": "RandomForestClassifier",
            "ensemble_size": "100 - 300 Decision Trees",
            "splitting_criterion": "Gini Impurity / Entropy",
            "integration_status": "Architectural Blueprint & Prototype Simulation (Future Enhancement)"
        }
    }

@router.post("/simulate")
def simulate_future_prediction(payload: FutureAISimulationRequest) -> Dict[str, Any]:
    """
    Simulates how the future Random Forest classification pipeline will evaluate a scenario
    alongside the rule-based priority score.
    """
    # 1. Authentic Rule-based calculation
    rule_based = calculate_priority_score(
        urgency=payload.urgency,
        injured=payload.injured,
        affected=payload.affected,
        resource_need=payload.resource_need
    )

    base_score = rule_based["priority_score"]
    adjusted_score = base_score

    # Simulated non-linear compounding factor from weather & infrastructure
    if payload.weather_condition in ["Storm", "Extreme Wind"]:
        adjusted_score += 0.05
    if payload.infrastructure_damage in ["Severe", "Catastrophic"]:
        adjusted_score += 0.04

    adjusted_score = min(1.0, adjusted_score)

    if adjusted_score >= 0.65:
        sim_class = "Critical"
    elif adjusted_score >= 0.45:
        sim_class = "High"
    elif adjusted_score >= 0.25:
        sim_class = "Medium"
    else:
        sim_class = "Low"

    # Soft probability distribution placeholder
    probabilities = {
        "Critical": round(max(0.01, (adjusted_score - 0.4) if adjusted_score > 0.5 else 0.05), 3),
        "High": round(max(0.05, 0.4 - abs(adjusted_score - 0.55)), 3),
        "Medium": round(max(0.05, 0.4 - abs(adjusted_score - 0.35)), 3),
        "Low": round(max(0.01, (0.5 - adjusted_score) if adjusted_score < 0.3 else 0.02), 3)
    }

    # Normalize probabilities to sum to 1.0
    prob_sum = sum(probabilities.values())
    probabilities = {k: round(v / prob_sum, 3) for k, v in probabilities.items()}

    return {
        "future_rf_classification": {
            "predicted_severity": sim_class,
            "estimated_confidence": probabilities[sim_class],
            "class_probabilities": probabilities,
            "status": "Prototype Architecture Simulation"
        },
        "rule_based_ground_truth": rule_based,
        "features_evaluated": {
            "urgency": payload.urgency,
            "injured": payload.injured,
            "affected": payload.affected,
            "resource_need": payload.resource_need,
            "weather": payload.weather_condition,
            "damage": payload.infrastructure_damage
        },
        "comparative_analysis": (
            f"Rule-Based model evaluated score as {rule_based['priority_score']:.3f} ({rule_based['severity_level']}). "
            f"The proposed Random Forest model evaluates contextual features (Weather: {payload.weather_condition}, "
            f"Damage: {payload.infrastructure_damage}) to classify the scenario as {sim_class}."
        )
    }
