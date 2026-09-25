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
    property_id: Optional[str] = Query(None),
    utility_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    target_property_id = property_id or "ALL"
    return crud.get_bills(db, target_property_id, utility_type, start_date, end_date)

@router.post("", response_model=schemas.BillRecordResponse, status_code=status.HTTP_201_CREATED)
def create_bill(bill_in: schemas.BillRecordCreate, db: Session = Depends(get_db)):
    data = bill_in.model_dump()
    util = data["utility_type"].upper()

    # If Gas was entered in m3, calculate standardized kWh
    if util == "GAS" and data.get("raw_unit_type") == "M3" and data.get("raw_meter_units"):
        data["total_units"] = convert_gas_m3_to_kwh(data["raw_meter_units"])

    days = max(1, (data["period_end"] - data["period_start"]).days)
    sc = data.get("standing_charge_cost")
    ur = data.get("unit_rate_cost")
    tot = data.get("total_cost")

    if sc is not None and ur is not None and (tot is None or tot == 0):
        data["total_cost"] = round(sc + ur, 2)
    elif sc is not None and (tot is not None and tot > 0) and ur is None:
        data["unit_rate_cost"] = round(max(0.0, tot - sc), 2)
    elif ur is not None and (tot is not None and tot > 0) and sc is None:
        data["standing_charge_cost"] = round(max(0.0, tot - ur), 2)
    elif not tot or tot == 0:
        tariff = crud.get_active_tariff(db, data["property_id"], util, data["period_start"])
        if tariff:
            vat_mult = 1.0 + tariff.vat_rate
            sc_cost = round(days * tariff.standing_charge * vat_mult, 2)
            data["standing_charge_cost"] = sc_cost
            if tariff.unit_rate is not None:
                unit_cost = round(data["total_units"] * tariff.unit_rate * vat_mult, 2)
                data["unit_rate_cost"] = unit_cost
                data["total_cost"] = round(unit_cost + sc_cost, 2)
    elif sc is None:
        tariff = crud.get_active_tariff(db, data["property_id"], util, data["period_start"])
        if tariff and tariff.standing_charge > 0:
            vat_mult = 1.0 + tariff.vat_rate
            sc_cost = round(days * tariff.standing_charge * vat_mult, 2)
            if data["total_cost"] >= sc_cost:
                data["standing_charge_cost"] = sc_cost
                data["unit_rate_cost"] = round(data["total_cost"] - sc_cost, 2)

    return crud.create_bill(db, schemas.BillRecordCreate(**data))

@router.post("/recurring", response_model=schemas.RecurringContractBillResponse, status_code=status.HTTP_201_CREATED)
def create_recurring_bills(contract_in: schemas.RecurringContractBillCreate, db: Session = Depends(get_db)):
    prop = crud.get_property(db, contract_in.property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    bills, created_count, skipped_count, tariff = crud.create_recurring_contract_bills(db, contract_in)
    msg = f"Successfully generated {created_count} contract bill(s)"
    if skipped_count > 0:
        msg += f" ({skipped_count} existing bill(s) skipped)"
    
    return schemas.RecurringContractBillResponse(
        success=True,
        created_count=created_count,
        skipped_count=skipped_count,
        message=msg,
        bills=bills,
        tariff_plan=tariff
    )

@router.get("/{bill_id}", response_model=schemas.BillRecordResponse)
def read_bill(bill_id: str, db: Session = Depends(get_db)):
    bill = crud.get_bill(db, bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Bill record not found")
    return bill

@router.put("/{bill_id}", response_model=schemas.BillRecordResponse)
def update_bill(bill_id: str, bill_in: schemas.BillRecordUpdate, db: Session = Depends(get_db)):
    data = bill_in.model_dump(exclude_unset=True)
    existing = crud.get_bill(db, bill_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Bill record not found")
    
    util = data.get("utility_type", existing.utility_type).upper()
    if util == "GAS" and data.get("raw_unit_type", existing.raw_unit_type) == "M3" and data.get("raw_meter_units"):
        data["total_units"] = convert_gas_m3_to_kwh(data["raw_meter_units"])

    # Reconcile costs
    if "standing_charge_cost" in data and "unit_rate_cost" in data and "total_cost" not in data:
        data["total_cost"] = round(data["standing_charge_cost"] + data["unit_rate_cost"], 2)
    else:
        new_tot = data.get("total_cost", existing.total_cost)
        new_sc = data.get("standing_charge_cost", existing.standing_charge_cost)
        if "unit_rate_cost" not in data and new_sc is not None and new_tot is not None:
            data["unit_rate_cost"] = round(max(0.0, new_tot - new_sc), 2)
        elif "unit_rate_cost" in data and "standing_charge_cost" not in data and new_tot is not None:
            data["standing_charge_cost"] = round(max(0.0, new_tot - data["unit_rate_cost"]), 2)
        
    bill = crud.update_bill(db, bill_id, schemas.BillRecordUpdate(**data))
    return bill

@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bill(bill_id: str, db: Session = Depends(get_db)):
    success = crud.delete_bill(db, bill_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bill record not found")
    return None
