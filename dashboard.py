"""
Dashboard Summary and Telemetry API Router.
Provides real-time aggregated metrics, alerts, charts, and spatial coordinates for map rendering.
All metrics are computed dynamically from actual incident and resource tables in SQLite.
"""
from typing import Dict, Any, List
from fastapi import APIRouter

from app.database import db_session, dicts_from_rows, dict_from_row

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats() -> Dict[str, Any]:
    """Returns aggregated live metrics for the coordinator dashboard."""
    with db_session() as conn:
        cursor = conn.cursor()

        # Total, Active, and Resolved Incidents
        cursor.execute("SELECT COUNT(*) as total FROM incidents")
        total_incidents = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) as active FROM incidents WHERE status != 'Resolved'")
        active_incidents = cursor.fetchone()["active"]

        cursor.execute("SELECT COUNT(*) as resolved FROM incidents WHERE status = 'Resolved'")
        resolved_incidents = cursor.fetchone()["resolved"]

        # Severity breakdown for active incidents (Critical, High, Medium, Low)
        cursor.execute("""
            SELECT severity_level, COUNT(*) as count
            FROM incidents
            WHERE status != 'Resolved'
            GROUP BY severity_level
        """)
        sev_rows = cursor.fetchall()
        severity_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        for r in sev_rows:
            if r["severity_level"] in severity_counts:
                severity_counts[r["severity_level"]] = r["count"]

        # Allocation status counts for active incidents
        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM incidents
            WHERE status != 'Resolved'
            GROUP BY status
        """)
        status_rows = cursor.fetchall()
        status_map = {}
        for r in status_rows:
            status_map[r["status"]] = r["count"]

        # Partial demand (Partially Satisfied incidents)
        partially_satisfied_count = status_map.get("Partially Satisfied", 0)

        # Waiting for resources (either 'Waiting for Resources' or legacy 'Pending')
        waiting_count = status_map.get("Waiting for Resources", 0) + status_map.get("Pending", 0)

        # Fully allocated (either 'Fully Allocated' or legacy 'Assigned' / 'Active')
        fully_allocated_count = (
            status_map.get("Fully Allocated", 0) +
            status_map.get("Assigned", 0) +
            status_map.get("Active", 0)
        )

        # Resource assets counts (Available vs Deployed)
        cursor.execute("SELECT COUNT(*) as total FROM resources")
        total_resources = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) as available FROM resources WHERE status = 'Available'")
        available_resources = cursor.fetchone()["available"]

        cursor.execute("SELECT COUNT(*) as deployed FROM resources WHERE status = 'Deployed'")
        deployed_resources = cursor.fetchone()["deployed"]

        # Resource units (capacity sums)
        cursor.execute("SELECT COALESCE(SUM(capacity), 0) as total_units FROM resources")
        total_units = cursor.fetchone()["total_units"]

        cursor.execute("SELECT COALESCE(SUM(capacity), 0) as avail_units FROM resources WHERE status = 'Available'")
        available_units = cursor.fetchone()["avail_units"]

        cursor.execute("SELECT COALESCE(SUM(capacity), 0) as dep_units FROM resources WHERE status = 'Deployed'")
        deployed_units = cursor.fetchone()["dep_units"]

        # Resource breakdown by type (Available units vs Deployed units)
        cursor.execute("""
            SELECT resource_type,
                   SUM(CASE WHEN status = 'Available' THEN capacity ELSE 0 END) as available_units,
                   SUM(CASE WHEN status = 'Deployed' THEN capacity ELSE 0 END) as deployed_units
            FROM resources
            GROUP BY resource_type
            ORDER BY resource_type ASC
        """)
        resource_breakdown = dicts_from_rows(cursor.fetchall())

        # Recent alerts (latest 8 audit logs for the Emergency Log Feed)
        cursor.execute("""
            SELECT id, incident_id, resource_id, event_type, message, details, created_at
            FROM audit_logs
            ORDER BY id DESC
            LIMIT 8
        """)
        recent_alerts = dicts_from_rows(cursor.fetchall())

        # Top critical incidents ranked by priority score
        cursor.execute("""
            SELECT id, title, disaster_type, severity_level, priority_score,
                   urgency, injured_count, affected_count, resource_need,
                   resource_type, allocated_units, status, location_name,
                   score_breakdown, reported_at
            FROM incidents
            WHERE status != 'Resolved'
            ORDER BY priority_score DESC, reported_at ASC
            LIMIT 6
        """)
        top_critical = dicts_from_rows(cursor.fetchall())

        return {
            "total_incidents": total_incidents,
            "active_incidents": active_incidents,
            "resolved_incidents": resolved_incidents,
            "critical_count": severity_counts["Critical"],
            "high_count": severity_counts["High"],
            "medium_count": severity_counts["Medium"],
            "low_count": severity_counts["Low"],
            "total_resources": total_resources,
            "available_resources": available_resources,
            "deployed_resources": deployed_resources,
            "total_units": total_units,
            "available_units": available_units,
            "deployed_units": deployed_units,
            "partially_satisfied_count": partially_satisfied_count,
            "waiting_count": waiting_count,
            "fully_allocated_count": fully_allocated_count,
            "severity_counts": severity_counts,
            "resource_breakdown": resource_breakdown,
            "recent_alerts": recent_alerts,
            "top_critical_incidents": top_critical
        }

@router.get("/map-data")
def get_map_telemetry() -> Dict[str, Any]:
    """Returns spatial coordinates for all incidents, resources, and active allocation links for Leaflet map."""
    with db_session() as conn:
        cursor = conn.cursor()

        # All unresolved incidents
        cursor.execute("""
            SELECT id, title, disaster_type, location_name, latitude, longitude,
                   urgency, injured_count, affected_count, resource_need,
                   resource_type, priority_score, severity_level, status, allocated_units,
                   score_breakdown, reported_at
            FROM incidents
            WHERE status != 'Resolved'
            ORDER BY priority_score DESC
        """)
        incidents = dicts_from_rows(cursor.fetchall())

        # All resources
        cursor.execute("""
            SELECT id, name, resource_type, base_station, latitude, longitude,
                   capacity, status, assigned_incident_id
            FROM resources
            ORDER BY resource_type ASC
        """)
        resources = dicts_from_rows(cursor.fetchall())

        # Active allocation lines (connecting resource location to incident location)
        cursor.execute("""
            SELECT a.id, a.incident_id, a.resource_id, a.resource_type, a.units_allocated, a.distance_km,
                   i.latitude as inc_lat, i.longitude as inc_lon, i.title as inc_title, i.severity_level as inc_severity,
                   r.latitude as res_lat, r.longitude as res_lon, r.name as res_name, r.base_station as res_base
            FROM allocations a
            JOIN incidents i ON a.incident_id = i.id
            JOIN resources r ON a.resource_id = r.id
            WHERE a.status = 'Active' AND i.status != 'Resolved'
        """)
        links = dicts_from_rows(cursor.fetchall())

        return {
            "incidents": incidents,
            "resources": resources,
            "active_links": links
        }
