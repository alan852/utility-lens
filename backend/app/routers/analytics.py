from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from sqlalchemy.orm import Session
from ..database import get_db
from .. import analytics, schemas

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

def _extract_ids(property_id: Optional[str], property_ids: Optional[List[str]]) -> Optional[List[str]]:
    ids = []
    if property_ids:
        for p in property_ids:
            if "," in p:
                ids.extend([x.strip() for x in p.split(",") if x.strip()])
            elif p.strip():
                ids.append(p.strip())
    if property_id:
        if "," in property_id:
            ids.extend([x.strip() for x in property_id.split(",") if x.strip()])
        elif property_id.strip():
            ids.append(property_id.strip())
    return list(dict.fromkeys(ids)) if ids else None

@router.get("/kpis", response_model=schemas.KPISummaryResponse)
def get_kpis(
    property_id: Optional[str] = None,
    property_ids: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db)
):
    ids = _extract_ids(property_id, property_ids)
    return analytics.compute_kpis(db, ids)

@router.get("/monthly-breakdown", response_model=schemas.MonthlyBreakdownResponse)
def get_monthly_breakdown(
    property_id: Optional[str] = None,
    property_ids: Optional[List[str]] = Query(None),
    months_lookback: int = Query(24, ge=1, le=120),
    db: Session = Depends(get_db)
):
    ids = _extract_ids(property_id, property_ids)
    return analytics.compute_monthly_breakdown(db, ids, months_lookback)

@router.get("/yoy-comparison", response_model=schemas.YoYComparisonResponse)
def get_yoy_comparison(
    property_id: Optional[str] = None,
    property_ids: Optional[List[str]] = Query(None),
    year_current: Optional[int] = None,
    year_previous: Optional[int] = None,
    db: Session = Depends(get_db)
):
    ids = _extract_ids(property_id, property_ids)
    return analytics.compute_yoy_comparison(db, ids, year_current, year_previous)

@router.get("/baseload", response_model=schemas.BaseloadAnalysisResponse)
def get_baseload(
    property_id: Optional[str] = None,
    property_ids: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db)
):
    ids = _extract_ids(property_id, property_ids)
    return analytics.compute_baseload_analysis(db, ids)

@router.post("/simulate-tariffs", response_model=schemas.TariffSimulationResponse)
def simulate_tariffs_endpoint(
    request: schemas.TariffSimulationRequest,
    db: Session = Depends(get_db)
):
    return analytics.simulate_tariffs(db, request)
