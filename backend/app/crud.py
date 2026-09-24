from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from . import models, schemas

# Properties
def get_properties(db: Session) -> List[models.Property]:
    return db.query(models.Property).order_by(models.Property.created_at.asc()).all()

def get_property(db: Session, property_id: str) -> Optional[models.Property]:
    return db.query(models.Property).filter(models.Property.id == property_id).first()

def create_property(db: Session, prop: schemas.PropertyCreate) -> models.Property:
    db_prop = models.Property(**prop.model_dump())
    db.add(db_prop)
    db.commit()
    db.refresh(db_prop)
    return db_prop

def update_property(db: Session, property_id: str, prop_in: schemas.PropertyUpdate) -> Optional[models.Property]:
    db_prop = get_property(db, property_id)
    if not db_prop:
        return None
    for k, v in prop_in.model_dump(exclude_unset=True).items():
        setattr(db_prop, k, v)
    db.commit()
    db.refresh(db_prop)
    return db_prop

def delete_property(db: Session, property_id: str) -> bool:
    db_prop = get_property(db, property_id)
    if not db_prop:
        return False
    db.delete(db_prop)
    db.commit()
    return True

# Tariffs
def get_tariffs(db: Session, property_id: str, utility_type: Optional[str] = None) -> List[models.TariffPlan]:
    q = db.query(models.TariffPlan).filter(models.TariffPlan.property_id == property_id)
    if utility_type:
        q = q.filter(models.TariffPlan.utility_type == utility_type.upper())
    return q.order_by(desc(models.TariffPlan.valid_from)).all()

def get_active_tariff(db: Session, property_id: str, utility_type: str, for_date: Optional[date] = None) -> Optional[models.TariffPlan]:
    check_date = for_date or date.today()
    q = db.query(models.TariffPlan).filter(
        models.TariffPlan.property_id == property_id,
        models.TariffPlan.utility_type == utility_type.upper(),
        models.TariffPlan.valid_from <= check_date,
        models.TariffPlan.is_active == True
    )
    return q.order_by(desc(models.TariffPlan.valid_from)).first()

def create_tariff(db: Session, tariff_in: schemas.TariffPlanCreate) -> models.TariffPlan:
    data = tariff_in.model_dump()
    data["utility_type"] = data["utility_type"].upper()
    db_tariff = models.TariffPlan(**data)
    db.add(db_tariff)
    db.commit()
    db.refresh(db_tariff)
    return db_tariff

def delete_tariff(db: Session, tariff_id: str) -> bool:
    tariff = db.query(models.TariffPlan).filter(models.TariffPlan.id == tariff_id).first()
    if not tariff:
        return False
    db.delete(tariff)
    db.commit()
    return True

# Bills
def get_bills(
    db: Session, 
    property_id: str, 
    utility_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[models.BillRecord]:
    q = db.query(models.BillRecord).filter(models.BillRecord.property_id == property_id)
    if utility_type:
        q = q.filter(models.BillRecord.utility_type == utility_type.upper())
    if start_date:
        q = q.filter(models.BillRecord.period_start >= start_date)
    if end_date:
        q = q.filter(models.BillRecord.period_end <= end_date)
    return q.order_by(desc(models.BillRecord.period_start)).all()

def get_bill(db: Session, bill_id: str) -> Optional[models.BillRecord]:
    return db.query(models.BillRecord).filter(models.BillRecord.id == bill_id).first()

def create_bill(db: Session, bill_in: schemas.BillRecordCreate) -> models.BillRecord:
    data = bill_in.model_dump()
    data["utility_type"] = data["utility_type"].upper()
    db_bill = models.BillRecord(**data)
    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)
    return db_bill

def update_bill(db: Session, bill_id: str, bill_in: schemas.BillRecordUpdate) -> Optional[models.BillRecord]:
    db_bill = get_bill(db, bill_id)
    if not db_bill:
        return None
    for k, v in bill_in.model_dump(exclude_unset=True).items():
        setattr(db_bill, k, v)
    db.commit()
    db.refresh(db_bill)
    return db_bill

def delete_bill(db: Session, bill_id: str) -> bool:
    db_bill = get_bill(db, bill_id)
    if not db_bill:
        return False
    db.delete(db_bill)
    db.commit()
    return True

# Meter Readings
def get_meter_readings(
    db: Session, 
    property_id: str, 
    utility_type: Optional[str] = None
) -> List[models.MeterReading]:
    q = db.query(models.MeterReading).filter(models.MeterReading.property_id == property_id)
    if utility_type:
        q = q.filter(models.MeterReading.utility_type == utility_type.upper())
    return q.order_by(desc(models.MeterReading.reading_date)).all()

def create_meter_reading(db: Session, reading_in: schemas.MeterReadingCreate) -> models.MeterReading:
    data = reading_in.model_dump()
    data["utility_type"] = data["utility_type"].upper()
    db_reading = models.MeterReading(**data)
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    return db_reading

def delete_meter_reading(db: Session, reading_id: str) -> bool:
    db_reading = db.query(models.MeterReading).filter(models.MeterReading.id == reading_id).first()
    if not db_reading:
        return False
    db.delete(db_reading)
    db.commit()
    return True
