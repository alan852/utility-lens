from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/api/tariffs", tags=["Tariffs"])

@router.get("", response_model=List[schemas.TariffPlanResponse])
def read_tariffs(
    property_id: str, 
    utility_type: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    return crud.get_tariffs(db, property_id, utility_type)

@router.get("/active", response_model=Optional[schemas.TariffPlanResponse])
def read_active_tariff(
    property_id: str, 
    utility_type: str, 
    db: Session = Depends(get_db)
):
    tariff = crud.get_active_tariff(db, property_id, utility_type)
    if not tariff:
        return None
    return tariff

@router.post("", response_model=schemas.TariffPlanResponse, status_code=status.HTTP_201_CREATED)
def create_tariff(
    tariff_in: schemas.TariffPlanCreate, 
    db: Session = Depends(get_db)
):
    return crud.create_tariff(db, tariff_in)

@router.delete("/{tariff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tariff(tariff_id: str, db: Session = Depends(get_db)):
    success = crud.delete_tariff(db, tariff_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tariff not found")
    return None
