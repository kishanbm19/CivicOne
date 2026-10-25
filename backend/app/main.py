import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .core.config import settings
from .core.database import Base, engine
from .routers import auth, complaints, documents, consent, notifications, services, analytics, admin

app = FastAPI(
    title="CivicOne API",
    description="Unified Digital Identity & Secure Citizen Services Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup
origins = [origin.strip() for origin in settings.FRONTEND_ORIGINS.split(",") if origin.strip()]
if "*" not in origins and "http://localhost:5173" not in origins:
    origins.append("http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all versioned routers under /api/v1
app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(documents.router)
app.include_router(consent.router)
app.include_router(notifications.router)
app.include_router(services.router)
app.include_router(analytics.router)
app.include_router(admin.router)

# Mount local upload directory for synthetic image attachments and documents
upload_dir = settings.UPLOAD_DIRECTORY
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

@app.on_event("startup")
def _create_tables_dev():
    if settings.APP_ENV == "development":
        Base.metadata.create_all(engine)

@app.get("/health")
def health():
    return {"status": "ok", "app": "CivicOne", "environment": settings.APP_ENV}
