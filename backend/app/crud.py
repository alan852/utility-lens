from typing import List, Optional, Tuple
from datetime import date, timedelta
import calendar
from dateutil.relativedelta import relativedelta
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

def get_tariff(db: Session, tariff_id: str) -> Optional[models.TariffPlan]:
    return db.query(models.TariffPlan).filter(models.TariffPlan.id == tariff_id).first()

def update_tariff(db: Session, tariff_id: str, tariff_in: schemas.TariffPlanUpdate) -> Optional[models.TariffPlan]:
    db_tariff = get_tariff(db, tariff_id)
    if not db_tariff:
        return None
    data = tariff_in.model_dump(exclude_unset=True)
    if "utility_type" in data and data["utility_type"]:
        data["utility_type"] = data["utility_type"].upper()
    for k, v in data.items():
        setattr(db_tariff, k, v)
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
def get_bills_for_properties(
    db: Session,
    property_ids: List[str],
    utility_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[models.BillRecord]:
    if not property_ids:
        return []
    q = db.query(models.BillRecord).filter(models.BillRecord.property_id.in_(property_ids))
    if utility_type:
        q = q.filter(models.BillRecord.utility_type == utility_type.upper())
    if start_date:
        q = q.filter(models.BillRecord.period_start >= start_date)
    if end_date:
        q = q.filter(models.BillRecord.period_end <= end_date)
    return q.order_by(desc(models.BillRecord.period_start)).all()

def get_bills(
    db: Session, 
    property_id: str, 
    utility_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> List[models.BillRecord]:
    if not property_id or property_id == "ALL":
        all_props = db.query(models.Property.id).all()
        ids = [p[0] for p in all_props]
        return get_bills_for_properties(db, ids, utility_type, start_date, end_date)
    if "," in property_id:
        ids = [p.strip() for p in property_id.split(",") if p.strip()]
        return get_bills_for_properties(db, ids, utility_type, start_date, end_date)
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
    data = bill_in.model_dump(exclude_unset=True)
    if "utility_type" in data and data["utility_type"]:
        data["utility_type"] = data["utility_type"].upper()
    for k, v in data.items():
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

def create_recurring_contract_bills(
    db: Session, contract_in: schemas.RecurringContractBillCreate
) -> Tuple[List[models.BillRecord], int, int, Optional[models.TariffPlan]]:
    util = contract_in.utility_type.upper()
    start_date = contract_in.start_date
    end_date = contract_in.end_date
    duration = contract_in.duration_months

    if not duration and end_date:
        duration = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month) + 1
        duration = max(1, duration)
    elif not duration:
        duration = 12

    created_bills: List[models.BillRecord] = []
    skipped_count = 0
    created_count = 0
    final_period_end = start_date

    for i in range(duration):
        m_start = start_date + relativedelta(months=i)
        if start_date.day == 1:
            last_day = calendar.monthrange(m_start.year, m_start.month)[1]
            m_end = date(m_start.year, m_start.month, last_day)
        else:
            m_end = (start_date + relativedelta(months=i + 1)) - timedelta(days=1)

        if end_date and m_end > end_date:
            m_end = end_date

        final_period_end = max(final_period_end, m_end)

        existing_bill = db.query(models.BillRecord).filter(
            models.BillRecord.property_id == contract_in.property_id,
            models.BillRecord.utility_type == util,
            models.BillRecord.period_start == m_start,
            models.BillRecord.period_end == m_end,
        ).first()

        if existing_bill and contract_in.skip_existing:
            skipped_count += 1
            continue

        # Determine cost breakout
        if contract_in.standing_charge_cost is not None and contract_in.unit_rate_cost is not None:
            sc_cost = contract_in.standing_charge_cost
            ur_cost = contract_in.unit_rate_cost
        elif util in ["COUNCIL_TAX", "BROADBAND", "ESTATE_SERVICE_CHARGE"]:
            sc_cost = contract_in.monthly_amount
            ur_cost = 0.0
        else:
            if contract_in.standing_charge_cost is not None:
                sc_cost = contract_in.standing_charge_cost
                ur_cost = round(max(0.0, contract_in.monthly_amount - sc_cost), 2)
            elif contract_in.unit_rate_cost is not None:
                ur_cost = contract_in.unit_rate_cost
                sc_cost = round(max(0.0, contract_in.monthly_amount - ur_cost), 2)
            else:
                tariff = get_active_tariff(db, contract_in.property_id, util, m_start)
                days = max(1, (m_end - m_start).days + 1)
                if tariff and tariff.standing_charge > 0:
                    vat_mult = 1.0 + (tariff.vat_rate or 0.0)
                    sc_cost = round(days * tariff.standing_charge * vat_mult, 2)
                    if contract_in.monthly_amount >= sc_cost:
                        ur_cost = round(contract_in.monthly_amount - sc_cost, 2)
                    else:
                        sc_cost = contract_in.monthly_amount
                        ur_cost = 0.0
                else:
                    sc_cost = contract_in.monthly_amount
                    ur_cost = 0.0

        contract_title = contract_in.contract_name or f"{util.replace('_', ' ').title()} Contract"
        month_label = f"Month {i+1} of {duration}"
        bill_notes = f"{contract_title} ({month_label})"
        if contract_in.notes:
            bill_notes += f" - {contract_in.notes}"

        if existing_bill:
            existing_bill.total_cost = contract_in.monthly_amount
            existing_bill.standing_charge_cost = sc_cost
            existing_bill.unit_rate_cost = ur_cost
            existing_bill.total_units = contract_in.total_units
            existing_bill.source = "RECURRING_CONTRACT"
            existing_bill.notes = bill_notes
            created_bills.append(existing_bill)
            created_count += 1
        else:
            new_bill = models.BillRecord(
                property_id=contract_in.property_id,
                utility_type=util,
                period_start=m_start,
                period_end=m_end,
                total_units=contract_in.total_units,
                total_cost=contract_in.monthly_amount,
                standing_charge_cost=sc_cost,
                unit_rate_cost=ur_cost,
                notes=bill_notes,
                source="RECURRING_CONTRACT",
            )
            db.add(new_bill)
            created_bills.append(new_bill)
            created_count += 1

    tariff_plan = None
    if contract_in.create_tariff_plan and created_count > 0:
        vat = 0.0
        if util == "BROADBAND":
            vat = 0.20
        elif util in ["ELECTRICITY", "GAS"]:
            vat = 0.05

        standing_daily = round(contract_in.monthly_amount / 30.4167, 2) if util in ["COUNCIL_TAX", "BROADBAND", "ESTATE_SERVICE_CHARGE"] else (round((contract_in.standing_charge_cost or 0.0) / 30.4167, 2))

        tariff_name = contract_in.contract_name or f"{util.replace('_', ' ').title()} Fixed Contract"
        tariff_plan = models.TariffPlan(
            property_id=contract_in.property_id,
            utility_type=util,
            name=tariff_name,
            valid_from=start_date,
            valid_to=final_period_end,
            unit_rate=None if util in ["COUNCIL_TAX", "BROADBAND", "ESTATE_SERVICE_CHARGE"] else 0.0,
            standing_charge=standing_daily,
            vat_rate=vat,
            is_active=True,
        )
        db.add(tariff_plan)

    db.commit()
    for b in created_bills:
        db.refresh(b)
    if tariff_plan:
        db.refresh(tariff_plan)

    return created_bills, created_count, skipped_count, tariff_plan

# Meter Readings
def get_meter_readings_for_properties(
    db: Session,
    property_ids: List[str],
    utility_type: Optional[str] = None
) -> List[models.MeterReading]:
    if not property_ids:
        return []
    q = db.query(models.MeterReading).filter(models.MeterReading.property_id.in_(property_ids))
    if utility_type:
        q = q.filter(models.MeterReading.utility_type == utility_type.upper())
    return q.order_by(desc(models.MeterReading.reading_date)).all()

def get_meter_readings(
    db: Session, 
    property_id: str, 
    utility_type: Optional[str] = None
) -> List[models.MeterReading]:
    if not property_id or property_id == "ALL":
        all_props = db.query(models.Property.id).all()
        ids = [p[0] for p in all_props]
        return get_meter_readings_for_properties(db, ids, utility_type)
    if "," in property_id:
        ids = [p.strip() for p in property_id.split(",") if p.strip()]
        return get_meter_readings_for_properties(db, ids, utility_type)
    q = db.query(models.MeterReading).filter(models.MeterReading.property_id == property_id)
    if utility_type:
        q = q.filter(models.MeterReading.utility_type == utility_type.upper())
    return q.order_by(desc(models.MeterReading.reading_date)).all()

def get_meter_reading(db: Session, reading_id: str) -> Optional[models.MeterReading]:
    return db.query(models.MeterReading).filter(models.MeterReading.id == reading_id).first()

def create_meter_reading(db: Session, reading_in: schemas.MeterReadingCreate) -> models.MeterReading:
    data = reading_in.model_dump()
    data["utility_type"] = data["utility_type"].upper()
    db_reading = models.MeterReading(**data)
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    return db_reading

def update_meter_reading(db: Session, reading_id: str, reading_in: schemas.MeterReadingUpdate) -> Optional[models.MeterReading]:
    db_reading = get_meter_reading(db, reading_id)
    if not db_reading:
        return None
    data = reading_in.model_dump(exclude_unset=True)
    if "utility_type" in data and data["utility_type"]:
        data["utility_type"] = data["utility_type"].upper()
    for k, v in data.items():
        setattr(db_reading, k, v)
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
