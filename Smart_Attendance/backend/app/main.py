from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.session import Base, engine
import app.models  # Ensures all models are registered

# Import routers
from app.routers import auth, student, teacher, camera

# Create tables in the database automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Attendance Management API",
    description="Backend API for Smart Attendance with AI Headcount Verification and Proxy Detection",
    version="1.0.0",
)

# Enable CORS for Vite React frontend and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(student.router)
app.include_router(teacher.router)
app.include_router(camera.router)


@app.get("/")
def root():
    return {
        "status": "online",
        "system": "Smart Attendance Management System",
        "version": "1.0.0",
        "docs_url": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "connected"}
