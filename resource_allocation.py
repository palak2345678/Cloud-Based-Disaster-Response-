"""
Greedy Multi-Tier Resource Allocation Engine for Disaster Response.
Implements the PBL Research Algorithm:
1. Primary ranking: Severity Level (Critical > High > Medium > Low)
2. Secondary ranking: Priority Score (Descending)
3. Tertiary tie-breaker: Report Time (Earliest first / FIFO)
4. Resource matching: Strict type matching
5. Geographic selection: Nearest available resource via Haversine distance
6. Allocation states:
   - Fully Allocated: all required units satisfied
   - Partially Satisfied: only some available units allocated
   - Waiting for Resources: no matching units available
7. Automatic re-allocation when resources are released.
"""
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import sqlite3

from app.config import SEVERITY_ORDER
from app.database import db_session, dict_from_row, dicts_from_rows
from app.services.distance import haversine_distance_km

def get_current_iso_time() -> str:
    """Returns current UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).isoformat()

def rank_incidents_key(incident: Dict[str, Any]):
    """
    Sorting key for incidents multi-tier ranking:
    1. Severity rank: -SEVERITY_ORDER (Critical=4, High=3, Medium=2, Low=1 -> Critical first)
    2. Priority score: -priority_score (highest score first)
    3. Reported at: reported_at (earliest report first / FIFO tie-breaker)
    """
    sev_rank = SEVERITY_ORDER.get(incident.get("severity_level", "Low"), 0)
    score = incident.get("priority_score", 0.0)
    reported_at = incident.get("reported_at", "")
    return (-sev_rank, -score, reported_at)

def run_greedy_allocation(existing_conn: Optional[sqlite3.Connection] = None) -> Dict[str, Any]:
    """
    Executes the greedy priority-based resource allocation algorithm across all active incidents.
    """
    def _execute(conn: sqlite3.Connection) -> Dict[str, Any]:
        cursor = conn.cursor()
        now_str = get_current_iso_time()

        # Step 1: Query unresolved incidents that still require resources
        cursor.execute("""
            SELECT * FROM incidents
            WHERE status != 'Resolved' AND allocated_units < resource_need
        """)
        raw_incidents = dicts_from_rows(cursor.fetchall())

        if not raw_incidents:
            return {
                "message": "All active incidents have completed resource allocation or no demand is waiting.",
                "evaluated_incidents": 0,
                "allocations_made": 0,
                "allocations": [],
                "shortages": []
            }

        # Step 2: Multi-tier ranking (Severity Level -> Priority Score -> Report Time FIFO)
        ranked_incidents = sorted(raw_incidents, key=rank_incidents_key)

        allocations_made: List[Dict[str, Any]] = []
        shortages: List[Dict[str, Any]] = []

        for incident in ranked_incidents:
            inc_id = incident["id"]
            req_type = incident["resource_type"]
            need_total = incident["resource_need"]
            already_allocated = incident["allocated_units"]
            remaining_need = need_total - already_allocated

            if remaining_need <= 0:
                continue

            # Step 3: Strict type matching with Available resources only
            cursor.execute("""
                SELECT * FROM resources
                WHERE resource_type = ? AND status = 'Available'
            """, (req_type,))
            available_resources = dicts_from_rows(cursor.fetchall())

            if not available_resources:
                # No resources of matching type are currently available
                new_status = "Partially Satisfied" if already_allocated > 0 else "Waiting for Resources"
                cursor.execute("""
                    UPDATE incidents
                    SET status = ?, updated_at = ?
                    WHERE id = ?
                """, (new_status, now_str, inc_id))

                shortages.append({
                    "incident_id": inc_id,
                    "incident_title": incident["title"],
                    "severity": incident["severity_level"],
                    "priority_score": incident["priority_score"],
                    "resource_type": req_type,
                    "units_needed": remaining_need,
                    "reason": f"Inventory depleted. Shortage of {remaining_need} {req_type} unit(s)."
                })
                continue

            # Step 4: Nearest available resource selection via Haversine distance
            candidates_with_dist = []
            for res in available_resources:
                dist = haversine_distance_km(
                    lat1=incident["latitude"],
                    lon1=incident["longitude"],
                    lat2=res["latitude"],
                    lon2=res["longitude"]
                )
                candidates_with_dist.append((dist, res))

            # Sort candidate resources ascending by distance (nearest depot first)
            candidates_with_dist.sort(key=lambda item: item[0])

            # Step 5: Greedy deployment of nearest units
            units_allocated_this_run = 0
            for dist, res in candidates_with_dist:
                if remaining_need <= 0:
                    break

                res_id = res["id"]
                capacity = max(1, res["capacity"])
                units_to_take = min(remaining_need, capacity)

                # Deploy resource to this incident
                cursor.execute("""
                    UPDATE resources
                    SET status = 'Deployed', assigned_incident_id = ?, updated_at = ?
                    WHERE id = ?
                """, (inc_id, now_str, res_id))

                # Insert allocation record
                cursor.execute("""
                    INSERT INTO allocations (
                        incident_id, resource_id, resource_type,
                        units_allocated, distance_km, status, allocated_at
                    ) VALUES (?, ?, ?, ?, ?, 'Active', ?)
                """, (inc_id, res_id, req_type, units_to_take, dist, now_str))

                alloc_record = {
                    "incident_id": inc_id,
                    "incident_title": incident["title"],
                    "resource_id": res_id,
                    "resource_name": res["name"],
                    "resource_type": req_type,
                    "units_allocated": units_to_take,
                    "distance_km": dist,
                    "base_station": res["base_station"]
                }
                allocations_made.append(alloc_record)

                # Insert into audit log
                cursor.execute("""
                    INSERT INTO audit_logs (incident_id, resource_id, event_type, message, details, created_at)
                    VALUES (?, ?, 'RESOURCE_ALLOCATED', ?, ?, ?)
                """, (
                    inc_id,
                    res_id,
                    f"Dispatched {units_to_take} {res['name']} ({dist:.1f} km away at {res['base_station']}) to {incident['title']}",
                    json.dumps(alloc_record),
                    now_str
                ))

                remaining_need -= units_to_take
                units_allocated_this_run += units_to_take

            # Step 6: Categorize final incident status
            total_allocated = already_allocated + units_allocated_this_run
            if total_allocated >= need_total:
                final_status = "Fully Allocated"
                event_type = "INCIDENT_FULLY_ALLOCATED"
                log_msg = f"Incident {inc_id} Fully Allocated ({total_allocated}/{need_total} {req_type} units satisfied)."
            elif total_allocated > 0:
                final_status = "Partially Satisfied"
                event_type = "PARTIAL_ALLOCATION"
                log_msg = f"Incident {inc_id} Partially Satisfied ({total_allocated}/{need_total} units allocated, shortage of {need_total - total_allocated})."
            else:
                final_status = "Waiting for Resources"
                event_type = "SHORTAGE_DETECTED"
                log_msg = f"Incident {inc_id} Waiting for Resources ({req_type} unavailable in inventory)."

            cursor.execute("""
                UPDATE incidents
                SET allocated_units = ?, status = ?, updated_at = ?
                WHERE id = ?
            """, (total_allocated, final_status, now_str, inc_id))

            cursor.execute("""
                INSERT INTO audit_logs (incident_id, resource_id, event_type, message, details, created_at)
                VALUES (?, NULL, ?, ?, ?, ?)
            """, (
                inc_id,
                event_type,
                log_msg,
                json.dumps({
                    "allocated_units": total_allocated,
                    "required_units": need_total,
                    "final_status": final_status
                }),
                now_str
            ))

            if remaining_need > 0:
                shortages.append({
                    "incident_id": inc_id,
                    "incident_title": incident["title"],
                    "severity": incident["severity_level"],
                    "priority_score": incident["priority_score"],
                    "resource_type": req_type,
                    "units_needed": remaining_need,
                    "reason": f"Inventory shortage: needed {need_total}, allocated {total_allocated}, {remaining_need} still required."
                })

        return {
            "message": f"Greedy allocation complete. Allocated {len(allocations_made)} resource units across incidents.",
            "evaluated_incidents": len(ranked_incidents),
            "allocations_made": len(allocations_made),
            "allocations": allocations_made,
            "shortages": shortages
        }

    if existing_conn:
        return _execute(existing_conn)
    else:
        with db_session() as conn:
            return _execute(conn)

def release_resource(resource_id: str, existing_conn: Optional[sqlite3.Connection] = None) -> Dict[str, Any]:
    """
    Releases a deployed resource, sets it to 'Available', marks allocation as 'Released',
    and automatically triggers greedy re-allocation for pending/partially satisfied incidents.
    """
    def _execute(conn: sqlite3.Connection) -> Dict[str, Any]:
        cursor = conn.cursor()
        now_str = get_current_iso_time()

        cursor.execute("SELECT * FROM resources WHERE id = ?", (resource_id,))
        res = dict_from_row(cursor.fetchone())
        if not res:
            raise ValueError(f"Resource with ID {resource_id} not found.")

        old_incident_id = res["assigned_incident_id"]

        # Mark resource available
        cursor.execute("""
            UPDATE resources
            SET status = 'Available', assigned_incident_id = NULL, updated_at = ?
            WHERE id = ?
        """, (now_str, resource_id))

        # Close active allocation if any
        cursor.execute("""
            UPDATE allocations
            SET status = 'Released', released_at = ?
            WHERE resource_id = ? AND status = 'Active'
        """, (now_str, resource_id))

        # Update previous incident's allocated count if it exists
        if old_incident_id:
            cursor.execute("""
                SELECT COUNT(*) as count FROM allocations
                WHERE incident_id = ? AND status = 'Active'
            """, (old_incident_id,))
            active_count = cursor.fetchone()["count"]

            cursor.execute("SELECT resource_need, status FROM incidents WHERE id = ?", (old_incident_id,))
            inc_row = cursor.fetchone()
            if inc_row:
                req_need = inc_row["resource_need"]
                curr_status = inc_row["status"]
                new_status = curr_status
                if curr_status != "Resolved":
                    if active_count == 0:
                        new_status = "Waiting for Resources"
                    elif active_count < req_need:
                        new_status = "Partially Satisfied"
                    else:
                        new_status = "Fully Allocated"
                cursor.execute("""
                    UPDATE incidents
                    SET allocated_units = ?, status = ?, updated_at = ?
                    WHERE id = ?
                """, (active_count, new_status, now_str, old_incident_id))

        # Log event
        cursor.execute("""
            INSERT INTO audit_logs (incident_id, resource_id, event_type, message, details, created_at)
            VALUES (?, ?, 'RESOURCE_RELEASED', ?, ?, ?)
        """, (
            old_incident_id,
            resource_id,
            f"Resource {res['name']} ({resource_id}) released back to Available fleet inventory.",
            json.dumps({"resource_id": resource_id, "previous_incident_id": old_incident_id}),
            now_str
        ))

        # Automatically recheck pending and partially satisfied incidents in priority order
        reallocation_result = run_greedy_allocation(conn)

        return {
            "success": True,
            "message": f"Resource {res['name']} released. Priority-based auto-reallocation completed.",
            "resource_id": resource_id,
            "reallocation_summary": reallocation_result
        }

    if existing_conn:
        return _execute(existing_conn)
    else:
        with db_session() as conn:
            return _execute(conn)

def resolve_incident(incident_id: str, existing_conn: Optional[sqlite3.Connection] = None) -> Dict[str, Any]:
    """
    Marks an incident as 'Resolved', automatically releases all resources assigned to it,
    and runs the greedy priority-based allocation process again to redeploy them to waiting incidents.
    """
    def _execute(conn: sqlite3.Connection) -> Dict[str, Any]:
        cursor = conn.cursor()
        now_str = get_current_iso_time()

        cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
        inc = dict_from_row(cursor.fetchone())
        if not inc:
            raise ValueError(f"Incident with ID {incident_id} not found.")

        # Update incident status to Resolved
        cursor.execute("""
            UPDATE incidents
            SET status = 'Resolved', updated_at = ?
            WHERE id = ?
        """, (now_str, incident_id))

        # Find all resources currently assigned to this incident
        cursor.execute("""
            SELECT id, name FROM resources
            WHERE assigned_incident_id = ?
        """, (incident_id,))
        assigned_resources = dicts_from_rows(cursor.fetchall())

        released_ids = []
        for r in assigned_resources:
            r_id = r["id"]
            released_ids.append(r_id)
            cursor.execute("""
                UPDATE resources
                SET status = 'Available', assigned_incident_id = NULL, updated_at = ?
                WHERE id = ?
            """, (now_str, r_id))

        # Mark all allocations for this incident as released
        cursor.execute("""
            UPDATE allocations
            SET status = 'Released', released_at = ?
            WHERE incident_id = ? AND status = 'Active'
        """, (now_str, incident_id))

        # Audit log for resolution
        cursor.execute("""
            INSERT INTO audit_logs (incident_id, resource_id, event_type, message, details, created_at)
            VALUES (?, NULL, 'INCIDENT_RESOLVED', ?, ?, ?)
        """, (
            incident_id,
            f"Incident {inc['title']} ({incident_id}) marked as Resolved. Released {len(released_ids)} resource unit(s) back to Available fleet.",
            json.dumps({"incident_id": incident_id, "released_resources": released_ids}),
            now_str
        ))

        # Automatically re-run greedy allocation across pending/partially satisfied incidents
        realloc_result = run_greedy_allocation(conn)

        return {
            "success": True,
            "message": f"Incident {incident_id} marked as Resolved. {len(released_ids)} resource(s) freed and re-allocated based on priority.",
            "released_resources_count": len(released_ids),
            "reallocation_summary": realloc_result
        }

    if existing_conn:
        return _execute(existing_conn)
    else:
        with db_session() as conn:
            return _execute(conn)
