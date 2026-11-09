"""
Geographic Distance Calculation Service.
Implements the Haversine formula to compute great-circle distance between
disaster incident locations and emergency resource base stations.
"""
import math

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes distance in kilometers between two geographic coordinates using the Haversine formula:
    d = 2R * asin(sqrt(sin^2((lat2 - lat1)/2) + cos(lat1)*cos(lat2)*sin^2((lon2 - lon1)/2)))
    """
    # Earth radius in kilometers
    R = 6371.0

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))

    # Clamp a to [0.0, 1.0] for floating point precision edge cases
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    distance = R * c
    return round(distance, 2)
