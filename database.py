"""
Database module for Disaster Response Coordination Platform.
Uses SQLite with connection management, row serialization, and schema initialization.
"""
import sqlite3
from typing import Generator, Any, Dict, List, Optional
from contextlib import contextmanager
from app.config import DATABASE_PATH

def get_db_connection() -> sqlite3.Connection:
    """Creates a new SQLite connection configured with Row factory."""
    conn = sqlite3.connect(DATABASE_PATH, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

@contextmanager
def db_session() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for database transactions with automatic commit and rollback."""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db() -> None:
    """Initializes tables for incidents, resources, allocations, and audit logs."""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db_session() as conn:
        cursor = conn.cursor()

        # Incidents Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            disaster_type TEXT NOT NULL,
            title TEXT NOT NULL,
            location_name TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            urgency INTEGER NOT NULL,
            affected_count INTEGER NOT NULL,
            injured_count INTEGER NOT NULL,
            resource_need INTEGER NOT NULL,
            resource_type TEXT NOT NULL,
            priority_score REAL NOT NULL,
            severity_level TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            allocated_units INTEGER NOT NULL DEFAULT 0,
            score_breakdown TEXT,
            reported_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # Resources Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS resources (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            base_station TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            capacity INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'Available',
            assigned_incident_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (assigned_incident_id) REFERENCES incidents (id) ON DELETE SET NULL
        );
        """)

        # Allocations Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS allocations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_id TEXT NOT NULL,
            resource_id TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            units_allocated INTEGER NOT NULL DEFAULT 1,
            distance_km REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'Active',
            allocated_at TEXT NOT NULL,
            released_at TEXT,
            FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE,
            FOREIGN KEY (resource_id) REFERENCES resources (id) ON DELETE CASCADE
        );
        """)

        # Audit Logs Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_id TEXT,
            resource_id TEXT,
            event_type TEXT NOT NULL,
            message TEXT NOT NULL,
            details TEXT,
            created_at TEXT NOT NULL
        );
        """)

def dict_from_row(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    """Converts a sqlite3.Row object to a standard Python dictionary."""
    if row is None:
        return None
    return dict(row)

def dicts_from_rows(rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    """Converts a list of sqlite3.Row objects to standard Python dictionaries."""
    return [dict(r) for r in rows]
