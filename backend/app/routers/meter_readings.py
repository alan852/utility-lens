from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/api/meter-readings", tags=["Meter Readings"])

@router.get("", response_model=List[schemas.MeterReadingResponse])
def read_meter_readings(
    property_id: str,
    utility_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_meter_readings(db, property_id, utility_type)

@router.post("", response_model=schemas.MeterReadingResponse, status_code=status.HTTP_201_CREATED)
def create_meter_reading(
    reading_in: schemas.MeterReadingCreate,
    db: Session = Depends(get_db)
):
    return crud.create_meter_reading(db, reading_in)

@router.delete("/{reading_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meter_reading(reading_id: str, db: Session = Depends(get_db)):
    success = crud.delete_meter_reading(db, reading_id)
    if not success:
        raise HTTPException(status_code=404, detail="Meter reading not found")
    return None
