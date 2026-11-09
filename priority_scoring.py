"""
Priority Scoring Service for Disaster Response Coordination.
Implements the rule-based formula from the PBL research project:
Priority Score = (0.40 × Urgency) + (0.25 × Injured) + (0.20 × Affected) + (0.15 × Resource Need)
"""
from typing import Dict, Any
from app.config import (
    WEIGHT_URGENCY,
    WEIGHT_INJURED,
    WEIGHT_AFFECTED,
    WEIGHT_RESOURCE_NEED,
    MAX_URGENCY,
    MAX_INJURED,
    MAX_AFFECTED,
    MAX_RESOURCE_NEED,
    THRESHOLD_MEDIUM,
    THRESHOLD_HIGH,
    THRESHOLD_CRITICAL,
)

def normalize_values(
    urgency: int,
    injured: int,
    affected: int,
    resource_need: int
) -> Dict[str, float]:
    """
    Normalizes disaster input metrics to standard [0.0, 1.0] interval.
    - Urgency: 1 to 4 -> urgency / 4.0
    - Injured: 0 to MAX_INJURED -> min(injured / MAX_INJURED, 1.0)
    - Affected: 0 to MAX_AFFECTED -> min(affected / MAX_AFFECTED, 1.0)
    - Resource Need: 0 to MAX_RESOURCE_NEED -> min(need / MAX_RESOURCE_NEED, 1.0)
    """
    urgency_clamped = max(1, min(4, int(urgency)))
    injured_clamped = max(0, int(injured))
    affected_clamped = max(0, int(affected))
    resource_clamped = max(1, int(resource_need))

    u_norm = urgency_clamped / MAX_URGENCY
    i_norm = min(1.0, injured_clamped / MAX_INJURED)
    a_norm = min(1.0, affected_clamped / MAX_AFFECTED)
    r_norm = min(1.0, resource_clamped / MAX_RESOURCE_NEED)

    return {
        "urgency_norm": round(u_norm, 4),
        "injured_norm": round(i_norm, 4),
        "affected_norm": round(a_norm, 4),
        "resource_norm": round(r_norm, 4),
    }

def categorize_severity(score: float) -> str:
    """
    Categorizes the priority score into one of four project severity levels:
    - Critical: score >= 0.65
    - High: score >= 0.45 and < 0.65
    - Medium: score >= 0.25 and < 0.45
    - Low: score < 0.25
    """
    if score >= THRESHOLD_CRITICAL:
        return "Critical"
    elif score >= THRESHOLD_HIGH:
        return "High"
    elif score >= THRESHOLD_MEDIUM:
        return "Medium"
    else:
        return "Low"

def generate_explanation(
    score: float,
    severity: str,
    urgency: int,
    injured: int,
    affected: int,
    resource_need: int,
    components: Dict[str, float]
) -> str:
    """
    Generates a clear, transparent, and explainable justification for why an incident
    received its specific priority level and severity tier.
    Example:
    'Critical priority because of high urgency (Level 4), a large number of injured people (38 casualties), and high resource requirements (3 units demanded).'
    """
    reasons = []

    # 1. Urgency justification
    if urgency >= 4:
        reasons.append("high life-threatening urgency (Level 4 - Catastrophic)")
    elif urgency == 3:
        reasons.append("high urgency (Level 3 - Severe)")
    elif urgency == 2:
        reasons.append("moderate urgency (Level 2 - Contained)")
    else:
        reasons.append("low urgency (Level 1 - Advisory)")

    # 2. Casualty justification
    if injured >= 25:
        reasons.append(f"a large number of injured people ({injured} casualties)")
    elif injured >= 5:
        reasons.append(f"multiple injured people ({injured} casualties)")
    elif injured > 0:
        reasons.append(f"{injured} injured person(s)")

    # 3. Affected population justification
    if affected >= 200:
        reasons.append(f"a widespread affected population ({affected} people)")
    elif affected >= 50:
        reasons.append(f"moderate community impact ({affected} people affected)")

    # 4. Resource demand justification
    if resource_need >= 6:
        reasons.append(f"high resource requirements ({resource_need} units demanded)")
    elif resource_need >= 3:
        reasons.append(f"substantial resource requirements ({resource_need} units demanded)")
    elif resource_need > 0:
        reasons.append(f"{resource_need} resource unit(s) required")

    reasons_str = ", ".join(reasons) if reasons else "baseline emergency indicators"
    explanation = f"{severity} priority because of {reasons_str}."

    return explanation

def calculate_priority_score(
    urgency: int,
    injured: int,
    affected: int,
    resource_need: int
) -> Dict[str, Any]:
    """
    Calculates priority score, severity category, normalized values, and breakdown.
    Formula:
    Priority Score = (0.40 × Urgency) + (0.25 × Injured) + (0.20 × Affected) + (0.15 × Resource Need)
    """
    normalized = normalize_values(urgency, injured, affected, resource_need)

    u_contrib = WEIGHT_URGENCY * normalized["urgency_norm"]
    i_contrib = WEIGHT_INJURED * normalized["injured_norm"]
    a_contrib = WEIGHT_AFFECTED * normalized["affected_norm"]
    r_contrib = WEIGHT_RESOURCE_NEED * normalized["resource_norm"]

    total_score = round(u_contrib + i_contrib + a_contrib + r_contrib, 4)
    severity_level = categorize_severity(total_score)

    components = {
        "urgency_raw": urgency,
        "urgency_norm": normalized["urgency_norm"],
        "urgency_weight": WEIGHT_URGENCY,
        "urgency_contribution": round(u_contrib, 4),

        "injured_raw": injured,
        "injured_norm": normalized["injured_norm"],
        "injured_weight": WEIGHT_INJURED,
        "injured_contribution": round(i_contrib, 4),

        "affected_raw": affected,
        "affected_norm": normalized["affected_norm"],
        "affected_weight": WEIGHT_AFFECTED,
        "affected_contribution": round(a_contrib, 4),

        "resource_raw": resource_need,
        "resource_norm": normalized["resource_norm"],
        "resource_weight": WEIGHT_RESOURCE_NEED,
        "resource_contribution": round(r_contrib, 4),
    }

    explanation = generate_explanation(
        score=total_score,
        severity=severity_level,
        urgency=urgency,
        injured=injured,
        affected=affected,
        resource_need=resource_need,
        components=components
    )

    math_formula = (
        f"Priority Score = (0.40 × {normalized['urgency_norm']:.3f}) + "
        f"(0.25 × {normalized['injured_norm']:.3f}) + "
        f"(0.20 × {normalized['affected_norm']:.3f}) + "
        f"(0.15 × {normalized['resource_norm']:.3f}) = {total_score:.4f}"
    )

    return {
        "priority_score": total_score,
        "severity_level": severity_level,
        "components": components,
        "explanation": explanation,
        "math_formula": math_formula
    }
