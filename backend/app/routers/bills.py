from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas, models

router = APIRouter(prefix="/api/bills", tags=["Bills"])

def convert_gas_m3_to_kwh(m3_units: float) -> float:
    # Standard UK formula: m3 * 1.02264 * 40.0 / 3.6
    return round(m3_units * 1.02264 * 40.0 / 3.6, 2)

@router.get("", response_model=List[schemas.BillRecordResponse])
def read_bills(
    property_id: str,
    utility_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    return crud.get_bills(db, property_id, utility_type, start_date, end_date)

@router.post("", response_model=schemas.BillRecordResponse, status_code=status.HTTP_201_CREATED)
def create_bill(bill_in: schemas.BillRecordCreate, db: Session = Depends(get_db)):
    data = bill_in.model_dump()
    util = data["utility_type"].upper()

    # If Gas was entered in m3, calculate standardized kWh
    if util == "GAS" and data.get("raw_unit_type") == "M3" and data.get("raw_meter_units"):
        data["total_units"] = convert_gas_m3_to_kwh(data["raw_meter_units"])

    # If total_cost is 0 or None, try auto-calculating with active tariff
    if not data.get("total_cost") or data["total_cost"] == 0:
        tariff = crud.get_active_tariff(db, data["property_id"], util, data["period_start"])
        if tariff:
            days = max(1, (data["period_end"] - data["period_start"]).days)
            vat_mult = 1.0 + tariff.vat_rate
            unit_cost = round(data["total_units"] * tariff.unit_rate * vat_mult, 2)
            sc_cost = round(days * tariff.standing_charge * vat_mult, 2)
            data["standing_charge_cost"] = sc_cost
            data["unit_rate_cost"] = unit_cost
            data["total_cost"] = round(unit_cost + sc_cost, 2)

    return crud.create_bill(db, schemas.BillRecordCreate(**data))

@router.get("/{bill_id}", response_model=schemas.BillRecordResponse)
def read_bill(bill_id: str, db: Session = Depends(get_db)):
    bill = crud.get_bill(db, bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Bill record not found")
    return bill

@router.put("/{bill_id}", response_model=schemas.BillRecordResponse)
def update_bill(bill_id: str, bill_in: schemas.BillRecordUpdate, db: Session = Depends(get_db)):
    bill = crud.update_bill(db, bill_id, bill_in)
    if not bill:
        raise HTTPException(status_code=404, detail="Bill record not found")
    return bill

@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bill(bill_id: str, db: Session = Depends(get_db)):
    success = crud.delete_bill(db, bill_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bill record not found")
    return None
