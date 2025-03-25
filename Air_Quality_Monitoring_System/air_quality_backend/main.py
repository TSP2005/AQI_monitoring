from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from .routers import auth, users, stations, measurements, contributions, notifications, forum
from .routers import (
    auth,
    users,
    stations,
    measurements,
    contributions,
    notifications
)
from .config import settings

app = FastAPI(
    title="Air Quality Monitoring System API",
    description="API for real-time air quality monitoring and analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Proper CORS configuration
app.add_middleware(
    CORSMiddleware,  # type: ignore
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers (same as before)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(stations.router)
app.include_router(measurements.router)
app.include_router(contributions.router)
app.include_router(notifications.router)
app.include_router(forum.router)


# Startup event and health check (same as before)
@app.on_event("startup")
async def startup_event():
    print(f"Starting Air Quality API version {settings.VERSION}")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Database: {settings.DATABASE_URL}")


@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "OK",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("air_quality_backend.main:app", host="0.0.0.0", port=8002, reload=settings.DEBUG)
