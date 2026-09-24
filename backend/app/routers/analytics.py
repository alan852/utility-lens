from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session
from ..database import get_db
from .. import analytics, schemas

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/kpis", response_model=schemas.KPISummaryResponse)
def get_kpis(
    property_id: str,
    db: Session = Depends(get_db)
):
    return analytics.compute_kpis(db, property_id)

@router.get("/monthly-breakdown", response_model=schemas.MonthlyBreakdownResponse)
def get_monthly_breakdown(
    property_id: str,
    months_lookback: int = Query(24, ge=1, le=120),
    db: Session = Depends(get_db)
):
    return analytics.compute_monthly_breakdown(db, property_id, months_lookback)

@router.get("/yoy-comparison", response_model=schemas.YoYComparisonResponse)
def get_yoy_comparison(
    property_id: str,
    year_current: Optional[int] = None,
    year_previous: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return analytics.compute_yoy_comparison(db, property_id, year_current, year_previous)

@router.get("/baseload", response_model=schemas.BaseloadAnalysisResponse)
def get_baseload(
    property_id: str,
    db: Session = Depends(get_db)
):
    return analytics.compute_baseload_analysis(db, property_id)

@router.post("/simulate-tariffs", response_model=schemas.TariffSimulationResponse)
def simulate_tariffs_endpoint(
    request: schemas.TariffSimulationRequest,
    db: Session = Depends(get_db)
):
    return analytics.simulate_tariffs(db, request)
