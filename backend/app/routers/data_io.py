import io
import csv
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query, status
from sqlalchemy.orm import Session
from dateutil import parser as date_parser
from ..database import get_db
from ..config import settings
from .. import crud, schemas, models
from ..seed_data import seed_demo_data

router = APIRouter(prefix="/api/data-io", tags=["Data Import/Export"])

def auto_detect_headers(headers: List[str]) -> Dict[str, Optional[str]]:
    mapping = {
        "date_col": None,
        "end_date_col": None,
        "utility_type_col": None,
        "usage_col": None,
        "cost_col": None,
        "standing_charge_col": None,
        "notes_col": None,
    }
    
    clean_headers = [h.strip() for h in headers]
    lower_map = {h.lower(): h for h in clean_headers}

    # Date column
    for candidate in ["start date", "period start", "bill date", "date", "reading date", "from"]:
        for k in lower_map:
            if candidate in k and not mapping["date_col"]:
                mapping["date_col"] = lower_map[k]
                break

    # End date column
    for candidate in ["end date", "period end", "to date", "to"]:
        for k in lower_map:
            if candidate in k and lower_map[k] != mapping["date_col"] and not mapping["end_date_col"]:
                mapping["end_date_col"] = lower_map[k]
                break

    # Utility type column
    for candidate in ["utility", "utility type", "fuel", "type", "service"]:
        for k in lower_map:
            if candidate in k and not mapping["utility_type_col"]:
                mapping["utility_type_col"] = lower_map[k]
                break

    # Usage column
    for candidate in ["usage", "consumption", "kwh", "units", "volume", "m3"]:
        for k in lower_map:
            if candidate in k and not mapping["usage_col"]:
                mapping["usage_col"] = lower_map[k]
                break

    # Standing charge column
    for candidate in ["standing charge", "standing_charge", "daily charge", "standing", "fixed charge", "daily fee", "standing fee", "standing cost"]:
        for k in lower_map:
            if candidate in k and not mapping["standing_charge_col"]:
                mapping["standing_charge_col"] = lower_map[k]
                break

    # Cost column
    for candidate in ["total cost", "total amount", "cost", "amount", "total", "charge", "price", "spend", "bill"]:
        for k in lower_map:
            if candidate in k and lower_map[k] != mapping["usage_col"] and lower_map[k] != mapping["standing_charge_col"] and not mapping["cost_col"]:
                mapping["cost_col"] = lower_map[k]
                break

    # Notes column
    for candidate in ["note", "memo", "description", "details"]:
        for k in lower_map:
            if candidate in k and not mapping["notes_col"]:
                mapping["notes_col"] = lower_map[k]
                break

    return mapping

@router.post("/preview-csv", response_model=schemas.CSVPreviewResponse)
async def preview_csv(file: UploadFile = File(...)):
    content_bytes = await file.read()
    try:
        text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content_bytes.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    fieldnames = reader.fieldnames or []
    
    sample_rows = []
    total_rows = 0
    for row in reader:
        total_rows += 1
        if len(sample_rows) < 5:
            sample_rows.append(row)

    suggested = auto_detect_headers(fieldnames)

    return schemas.CSVPreviewResponse(
        detected_headers=fieldnames,
        suggested_mapping=suggested,
        sample_rows=sample_rows,
        total_rows=total_rows
    )

@router.post("/commit-csv", response_model=schemas.CSVImportResult)
def commit_csv(
    req: schemas.CSVImportCommitRequest,
    db: Session = Depends(get_db)
):
    text = req.raw_csv_text
    reader = csv.DictReader(io.StringIO(text))
    
    imported_count = 0
    skipped_count = 0
    errors = []

    m = req.mapping

    for idx, row in enumerate(reader, start=1):
        try:
            # 1. Parse Date(s)
            raw_date_str = row.get(m.date_col)
            if not raw_date_str or not raw_date_str.strip():
                skipped_count += 1
                continue

            parsed_start = date_parser.parse(raw_date_str.strip()).date()
            if parsed_start > date.today():
                skipped_count += 1
                errors.append(f"Row {idx}: Future bill date {parsed_start} skipped.")
                continue

            if m.end_date_col and row.get(m.end_date_col):
                parsed_end = date_parser.parse(row[m.end_date_col].strip()).date()
            else:
                # Default end date to 30 days after or end of month
                import calendar
                days_in_m = calendar.monthrange(parsed_start.year, parsed_start.month)[1]
                parsed_end = date(parsed_start.year, parsed_start.month, days_in_m)

            # 2. Determine Utility Type
            if m.utility_type_col and row.get(m.utility_type_col):
                raw_u = row[m.utility_type_col].strip().upper()
                if "ELEC" in raw_u:
                    util = "ELECTRICITY"
                elif "GAS" in raw_u:
                    util = "GAS"
                elif "WATER" in raw_u:
                    util = "WATER"
                elif "COUNCIL" in raw_u or "TAX" in raw_u:
                    util = "COUNCIL_TAX"
                elif "BROADBAND" in raw_u or "INTERNET" in raw_u or "WIFI" in raw_u:
                    util = "BROADBAND"
                elif "SERVICE" in raw_u or "ESTATE" in raw_u:
                    util = "ESTATE_SERVICE_CHARGE"
                else:
                    util = raw_u
            elif m.default_utility_type:
                util = m.default_utility_type.upper()
            else:
                util = "ELECTRICITY"

            # 3. Usage & Cost
            raw_usage = row.get(m.usage_col, "0").replace(",", "").replace("£", "").replace("$", "").strip()
            total_units = float(raw_usage) if raw_usage else 0.0

            raw_cost = 0.0
            if m.cost_col and row.get(m.cost_col):
                c_str = row[m.cost_col].replace(",", "").replace("£", "").replace("$", "").strip()
                raw_cost = float(c_str) if c_str else 0.0

            raw_standing = 0.0
            has_standing = False
            if m.standing_charge_col and row.get(m.standing_charge_col):
                sc_str = row[m.standing_charge_col].replace(",", "").replace("£", "").replace("$", "").strip()
                if sc_str:
                    try:
                        raw_standing = float(sc_str)
                        has_standing = True
                    except ValueError:
                        pass

            raw_meter_units = None
            raw_unit_type = None

            # Handle gas m3 conversion if indicated
            if util == "GAS" and m.gas_unit_type == "M3":
                raw_meter_units = total_units
                raw_unit_type = "M3"
                total_units = round(raw_meter_units * 1.02264 * 40.0 / 3.6, 2)

            standing_charge_cost = raw_standing if has_standing else None
            unit_rate_cost = None

            # Auto calculate cost from tariff if not provided
            if raw_cost == 0.0:
                tariff = crud.get_active_tariff(db, req.property_id, util, parsed_start)
                if tariff:
                    days = max(1, (parsed_end - parsed_start).days)
                    vat_mult = 1.0 + tariff.vat_rate
                    calc_sc_cost = round(days * tariff.standing_charge * vat_mult, 2)
                    standing_charge_cost = calc_sc_cost
                    if tariff.unit_rate is not None:
                        calc_unit_cost = round(total_units * tariff.unit_rate * vat_mult, 2)
                        raw_cost = round(calc_unit_cost + calc_sc_cost, 2)
                        unit_rate_cost = calc_unit_cost
            else:
                if has_standing:
                    unit_rate_cost = round(max(0.0, raw_cost - raw_standing), 2)
                else:
                    tariff = crud.get_active_tariff(db, req.property_id, util, parsed_start)
                    if tariff and tariff.standing_charge > 0:
                        days = max(1, (parsed_end - parsed_start).days)
                        vat_mult = 1.0 + tariff.vat_rate
                        calc_sc_cost = round(days * tariff.standing_charge * vat_mult, 2)
                        if raw_cost >= calc_sc_cost:
                            standing_charge_cost = calc_sc_cost
                            unit_rate_cost = round(raw_cost - calc_sc_cost, 2)

            notes = row.get(m.notes_col) if m.notes_col else "Imported from CSV"

            # Create bill record
            db_bill = models.BillRecord(
                property_id=req.property_id,
                utility_type=util,
                period_start=parsed_start,
                period_end=parsed_end,
                total_units=total_units,
                raw_meter_units=raw_meter_units,
                raw_unit_type=raw_unit_type,
                total_cost=raw_cost,
                standing_charge_cost=standing_charge_cost,
                unit_rate_cost=unit_rate_cost,
                source="CSV_IMPORT",
                notes=notes
            )
            db.add(db_bill)
            imported_count += 1

        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")
            skipped_count += 1

    db.commit()
    return schemas.CSVImportResult(
        success=imported_count > 0,
        imported_count=imported_count,
        skipped_count=skipped_count,
        errors=errors[:10],  # Return up to 10 sample errors
        message=f"Successfully imported {imported_count} records ({skipped_count} skipped)."
    )

@router.get("/sample-csv")
def download_sample_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Period Start", "Period End", "Utility Type", "Consumption", "Standing Charge (£)", "Total Cost (£)", "Notes"])
    writer.writerow(["2025-01-01", "2025-01-31", "ELECTRICITY", "320.5", "17.90", "89.40", "Monthly bill"])
    writer.writerow(["2025-01-01", "2025-01-31", "GAS", "1850.0", "10.09", "131.25", "Winter gas usage"])
    writer.writerow(["2025-01-01", "2025-01-31", "WATER", "9.5", "8.68", "29.11", "Standard water bill"])
    writer.writerow(["2025-01-01", "2025-01-31", "COUNCIL_TAX", "0", "", "185.00", "Monthly Council Tax Band D"])
    writer.writerow(["2025-01-01", "2025-01-31", "BROADBAND", "0", "", "35.99", "Fibre broadband"])
    writer.writerow(["2025-01-01", "2025-01-31", "ESTATE_SERVICE_CHARGE", "0", "", "75.00", "Estate maintenance"])
    writer.writerow(["2025-02-01", "2025-02-28", "ELECTRICITY", "295.0", "16.16", "82.50", "Monthly bill"])
    writer.writerow(["2025-02-01", "2025-02-28", "GAS", "1620.0", "9.11", "116.10", "Winter gas usage"])
    writer.writerow(["2025-02-01", "2025-02-28", "WATER", "8.9", "7.84", "27.42", "Standard water bill"])
    writer.writerow(["2025-02-01", "2025-02-28", "COUNCIL_TAX", "0", "", "185.00", "Monthly Council Tax Band D"])
    writer.writerow(["2025-02-01", "2025-02-28", "BROADBAND", "0", "", "35.99", "Fibre broadband"])
    writer.writerow(["2025-02-01", "2025-02-28", "ESTATE_SERVICE_CHARGE", "0", "", "75.00", "Estate maintenance"])
    
    csv_bytes = output.getvalue().encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sample_utility_data.csv"}
    )

@router.post("/seed-demo")
def seed_demo_data_endpoint(force: bool = True, db: Session = Depends(get_db)):
    if settings.is_production:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo data loading is disabled in production mode"
        )
    prop = seed_demo_data(db, force_reset=force)
    return {"message": "Demo dataset loaded successfully", "property_id": prop.id, "property_name": prop.name}

@router.get("/export-backup")
def export_backup(db: Session = Depends(get_db)):
    props = db.query(models.Property).all()
    data = []
    for p in props:
        prop_data = {
            "name": p.name,
            "address": p.address,
            "currency_symbol": p.currency_symbol,
            "tariffs": [
                {
                    "utility_type": t.utility_type,
                    "name": t.name,
                    "valid_from": str(t.valid_from),
                    "valid_to": str(t.valid_to) if t.valid_to else None,
                    "unit_rate": t.unit_rate,
                    "standing_charge": t.standing_charge,
                    "vat_rate": t.vat_rate,
                    "is_active": t.is_active
                }
                for t in p.tariffs
            ],
            "bills": [
                {
                    "utility_type": b.utility_type,
                    "period_start": str(b.period_start),
                    "period_end": str(b.period_end),
                    "total_units": b.total_units,
                    "raw_meter_units": b.raw_meter_units,
                    "raw_unit_type": b.raw_unit_type,
                    "total_cost": b.total_cost,
                    "standing_charge_cost": b.standing_charge_cost,
                    "unit_rate_cost": b.unit_rate_cost,
                    "notes": b.notes,
                    "source": b.source
                }
                for b in p.bills
            ],
            "meter_readings": [
                {
                    "utility_type": m.utility_type,
                    "reading_date": str(m.reading_date),
                    "meter_index": m.meter_index,
                    "meter_unit": m.meter_unit,
                    "reading_type": m.reading_type,
                    "notes": m.notes
                }
                for m in p.meter_readings
            ]
        }
        data.append(prop_data)

    return {"version": 1, "exported_at": str(datetime.utcnow()), "properties": data}

@router.post("/import-backup", response_model=schemas.BackupImportResult)
async def import_backup(
    file: UploadFile = File(...),
    mode: str = Query("merge", pattern="^(merge|replace)$"),
    db: Session = Depends(get_db)
):
    import json
    content_bytes = await file.read()
    try:
        data = json.loads(content_bytes.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file: {str(e)}")

    if not isinstance(data, dict) or "properties" not in data:
        raise HTTPException(status_code=400, detail="Invalid backup file format: missing 'properties' key")

    prop_list = data.get("properties", [])
    if not isinstance(prop_list, list):
        raise HTTPException(status_code=400, detail="Invalid properties format in backup file")

    if mode == "replace":
        db.query(models.Property).delete()
        db.commit()

    props_count = 0
    bills_count = 0
    readings_count = 0
    tariffs_count = 0

    for prop_raw in prop_list:
        p_name = prop_raw.get("name", "Home")
        p_addr = prop_raw.get("address")
        p_curr = prop_raw.get("currency_symbol", "£")

        existing_prop = None
        if mode == "merge":
            existing_prop = db.query(models.Property).filter(models.Property.name == p_name).first()

        if existing_prop:
            prop = existing_prop
        else:
            prop = models.Property(name=p_name, address=p_addr, currency_symbol=p_curr)
            db.add(prop)
            db.flush()
            props_count += 1

        # Tariffs
        existing_tariffs = db.query(models.TariffPlan).filter(models.TariffPlan.property_id == prop.id).all()
        existing_tariff_keys = {
            (t.utility_type, t.name, str(t.valid_from)) for t in existing_tariffs
        }
        for t_raw in prop_raw.get("tariffs", []):
            try:
                t_util = t_raw["utility_type"].upper()
                t_name = t_raw.get("name", "Tariff")
                t_vfrom = date_parser.parse(str(t_raw["valid_from"])).date()
                key = (t_util, t_name, str(t_vfrom))
                if key in existing_tariff_keys:
                    continue
                t_vto = date_parser.parse(str(t_raw["valid_to"])).date() if t_raw.get("valid_to") else None
                db_t = models.TariffPlan(
                    property_id=prop.id,
                    utility_type=t_util,
                    name=t_name,
                    valid_from=t_vfrom,
                    valid_to=t_vto,
                    unit_rate=float(t_raw["unit_rate"]) if t_raw.get("unit_rate") is not None else None,
                    standing_charge=float(t_raw.get("standing_charge", 0.0)),
                    vat_rate=float(t_raw.get("vat_rate", 0.05)),
                    is_active=bool(t_raw.get("is_active", True))
                )
                db.add(db_t)
                existing_tariff_keys.add(key)
                tariffs_count += 1
            except Exception:
                continue

        # Bills
        existing_bills = db.query(models.BillRecord).filter(models.BillRecord.property_id == prop.id).all()
        existing_bill_keys = {
            (b.utility_type, str(b.period_start), str(b.period_end)) for b in existing_bills
        }
        for b_raw in prop_raw.get("bills", []):
            try:
                b_util = b_raw["utility_type"].upper()
                b_start = date_parser.parse(str(b_raw["period_start"])).date()
                b_end = date_parser.parse(str(b_raw["period_end"])).date()
                key = (b_util, str(b_start), str(b_end))
                if key in existing_bill_keys:
                    continue
                
                sc_cost = float(b_raw["standing_charge_cost"]) if b_raw.get("standing_charge_cost") is not None else None
                ur_cost = float(b_raw["unit_rate_cost"]) if b_raw.get("unit_rate_cost") is not None else None
                tot_cost = float(b_raw.get("total_cost", 0.0))

                if sc_cost is not None and ur_cost is None:
                    ur_cost = round(max(0.0, tot_cost - sc_cost), 2)
                elif ur_cost is not None and sc_cost is None:
                    sc_cost = round(max(0.0, tot_cost - ur_cost), 2)

                db_b = models.BillRecord(
                    property_id=prop.id,
                    utility_type=b_util,
                    period_start=b_start,
                    period_end=b_end,
                    total_units=float(b_raw.get("total_units", 0.0)),
                    raw_meter_units=float(b_raw["raw_meter_units"]) if b_raw.get("raw_meter_units") is not None else None,
                    raw_unit_type=b_raw.get("raw_unit_type"),
                    total_cost=tot_cost,
                    standing_charge_cost=sc_cost,
                    unit_rate_cost=ur_cost,
                    notes=b_raw.get("notes"),
                    source=b_raw.get("source", "JSON_IMPORT")
                )
                db.add(db_b)
                existing_bill_keys.add(key)
                bills_count += 1
            except Exception:
                continue

        # Meter Readings
        existing_reads = db.query(models.MeterReading).filter(models.MeterReading.property_id == prop.id).all()
        existing_read_keys = {
            (m.utility_type, str(m.reading_date)) for m in existing_reads
        }
        for m_raw in prop_raw.get("meter_readings", []):
            try:
                m_util = m_raw["utility_type"].upper()
                m_date = date_parser.parse(str(m_raw["reading_date"])).date()
                key = (m_util, str(m_date))
                if key in existing_read_keys:
                    continue
                db_m = models.MeterReading(
                    property_id=prop.id,
                    utility_type=m_util,
                    reading_date=m_date,
                    meter_index=float(m_raw.get("meter_index", 0.0)),
                    meter_unit=m_raw.get("meter_unit", "KWH"),
                    reading_type=m_raw.get("reading_type", "ACTUAL"),
                    notes=m_raw.get("notes")
                )
                db.add(db_m)
                existing_read_keys.add(key)
                readings_count += 1
            except Exception:
                continue

    db.commit()

    return schemas.BackupImportResult(
        success=True,
        message=f"Backup restored successfully in {mode} mode",
        properties_count=props_count if mode == "replace" or props_count > 0 else len(prop_list),
        bills_count=bills_count,
        readings_count=readings_count,
        tariffs_count=tariffs_count
    )
