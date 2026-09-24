from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SessionLocal
from .routers import properties, tariffs, bills, meter_readings, analytics, data_io
from .seed_data import seed_demo_data

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Home Utility Analysis API",
    description="Backend API for tracking and analyzing household electricity, gas, and water utilities.",
    version="1.0.0"
)

# Enable CORS for local dev and docker containers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(properties.router)
app.include_router(tariffs.router)
app.include_router(bills.router)
app.include_router(meter_readings.router)
app.include_router(analytics.router)
app.include_router(data_io.router)

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        # Seed initial demo property & realistic records if DB is empty
        seed_demo_data(db, force_reset=False)
    finally:
        db.close()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "home-utility-analysis-api"}
