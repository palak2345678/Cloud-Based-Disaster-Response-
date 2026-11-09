"""
Disaster Response Coordination Platform - FastAPI Backend Application.
Academic PBL Project: Cloud-Based Disaster Response Coordination Platform
with Priority-Based Live Resource Allocation.
"""
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import init_db
from app.seed_data import seed_database
from app.routers import incidents, resources, allocations, dashboard, ai_prediction, demo

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: database initialization and seed data verification."""
    print("Initializing Disaster Coordination SQLite database...")
    init_db()
    print("Verifying sample disaster incidents and emergency resources...")
    seed_database()
    print("Disaster Response Coordination Platform is ready for operations.")
    yield

app = FastAPI(
    title="Disaster Response Coordination Platform",
    description="Cloud-Based Disaster Response Coordination Platform with Priority-Based Live Resource Allocation",
    version="1.1.0",
    lifespan=lifespan
)

# Enable CORS for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(dashboard.router)
app.include_router(incidents.router)
app.include_router(resources.router)
app.include_router(allocations.router)
app.include_router(ai_prediction.router)
app.include_router(demo.router)

# Mount static assets
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/", include_in_schema=False)
def serve_spa():
    """Serves the main single page web application."""
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Disaster Response Coordination Platform API is running. UI index.html not found."}

@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Disaster Response Coordination Platform", "version": "1.1.0"}
