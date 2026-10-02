from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SessionLocal, DATABASE_URL
from .routers import properties, tariffs, bills, meter_readings, analytics, data_io
from .seed_data import seed_demo_data

# Create database tables
Base.metadata.create_all(bind=engine)

def check_and_migrate_db():
    if not DATABASE_URL.startswith("sqlite"):
        return
    with engine.connect() as conn:
        result = conn.exec_driver_sql("PRAGMA table_info(tariff_plans)").fetchall()
        if not result:
            return
        for col in result:
            if col[1] == "unit_rate" and col[3] == 1:
                conn.exec_driver_sql("PRAGMA foreign_keys=OFF")
                conn.exec_driver_sql("""
                    CREATE TABLE tariff_plans_migration (
                        id VARCHAR(36) PRIMARY KEY,
                        property_id VARCHAR(36) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
                        utility_type VARCHAR(20) NOT NULL,
                        name VARCHAR(100) NOT NULL,
                        valid_from DATE NOT NULL,
                        valid_to DATE,
                        unit_rate FLOAT,
                        standing_charge FLOAT NOT NULL,
                        vat_rate FLOAT,
                        is_active BOOLEAN,
                        created_at DATETIME
                    )
                """)
                conn.exec_driver_sql("""
                    INSERT INTO tariff_plans_migration 
                    SELECT id, property_id, utility_type, name, valid_from, valid_to, unit_rate, standing_charge, vat_rate, is_active, created_at 
                    FROM tariff_plans
                """)
                conn.exec_driver_sql("DROP TABLE tariff_plans")
                conn.exec_driver_sql("ALTER TABLE tariff_plans_migration RENAME TO tariff_plans")
                conn.exec_driver_sql("PRAGMA foreign_keys=ON")
                conn.commit()
                break

check_and_migrate_db()

app = FastAPI(
    title="UtilityLens API",
    description="Backend API for tracking and analyzing household utilities (Electricity, Gas, Water, Council Tax, Broadband, Service Charges).",
    version="1.0.1"
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
    return {"status": "ok", "service": "utility-lens-api"}
