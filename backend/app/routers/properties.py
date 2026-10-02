from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import settings
from .. import crud, schemas

router = APIRouter(prefix="/api/properties", tags=["Properties"])

@router.get("", response_model=List[schemas.PropertyResponse])
def read_properties(db: Session = Depends(get_db)):
    props = crud.get_properties(db)
    # If no property exists and not in production, seed initial demo property
    if not props and not settings.is_production:
        from ..seed_data import seed_demo_data
        seed_demo_data(db, force_reset=False)
        props = crud.get_properties(db)
    return props

@router.get("/{property_id}", response_model=schemas.PropertyResponse)
def read_property(property_id: str, db: Session = Depends(get_db)):
    prop = crud.get_property(db, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop

@router.post("", response_model=schemas.PropertyResponse, status_code=status.HTTP_201_CREATED)
def create_property(prop_in: schemas.PropertyCreate, db: Session = Depends(get_db)):
    return crud.create_property(db, prop_in)

@router.put("/{property_id}", response_model=schemas.PropertyResponse)
def update_property(property_id: str, prop_in: schemas.PropertyUpdate, db: Session = Depends(get_db)):
    prop = crud.update_property(db, property_id, prop_in)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop

@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(property_id: str, db: Session = Depends(get_db)):
    success = crud.delete_property(db, property_id)
    if not success:
        raise HTTPException(status_code=404, detail="Property not found")
    return None
