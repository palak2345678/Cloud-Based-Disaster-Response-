"""
Launch script for Disaster Response Coordination Platform.
Usage:
    python run.py
Then open http://localhost:8000 in your web browser.
"""
import sys
import uvicorn

if __name__ == "__main__":
    print("=" * 70)
    print("Disaster Response Coordination Platform")
    print("Cloud-Based Disaster Response Coordination with Priority-Based Live Resource Allocation")
    print("=" * 70)
    print("Starting server at http://127.0.0.1:8000 ...")
    print("API Documentation: http://127.0.0.1:8000/docs")
    print("=" * 70)
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
