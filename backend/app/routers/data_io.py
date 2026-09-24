import io
import csv
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, status
from sqlalchemy.orm import Session
from dateutil import parser as date_parser
from ..database import get_db
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

    # Cost column
    for candidate in ["cost", "amount", "total", "charge", "price", "spend", "bill"]:
        for k in lower_map:
            if candidate in k and lower_map[k] != mapping["usage_col"] and not mapping["cost_col"]:
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

            raw_meter_units = None
            raw_unit_type = None

            # Handle gas m3 conversion if indicated
            if util == "GAS" and m.gas_unit_type == "M3":
                raw_meter_units = total_units
                raw_unit_type = "M3"
                total_units = round(raw_meter_units * 1.02264 * 40.0 / 3.6, 2)

            # Auto calculate cost from tariff if not provided
            if raw_cost == 0.0:
                tariff = crud.get_active_tariff(db, req.property_id, util, parsed_start)
                if tariff:
                    days = max(1, (parsed_end - parsed_start).days)
                    vat_mult = 1.0 + tariff.vat_rate
                    raw_cost = round((total_units * tariff.unit_rate * vat_mult) + (days * tariff.standing_charge * vat_mult), 2)

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
    writer.writerow(["Period Start", "Period End", "Utility Type", "Consumption", "Total Cost (£)", "Notes"])
    writer.writerow(["2025-01-01", "2025-01-31", "ELECTRICITY", "320.5", "89.40", "Monthly bill"])
    writer.writerow(["2025-01-01", "2025-01-31", "GAS", "1850.0", "131.25", "Winter gas usage"])
    writer.writerow(["2025-01-01", "2025-01-31", "WATER", "9.5", "29.11", "Standard water bill"])
    writer.writerow(["2025-02-01", "2025-02-28", "ELECTRICITY", "295.0", "82.50", "Monthly bill"])
    writer.writerow(["2025-02-01", "2025-02-28", "GAS", "1620.0", "116.10", "Winter gas usage"])
    writer.writerow(["2025-02-01", "2025-02-28", "WATER", "8.9", "27.42", "Standard water bill"])
    
    csv_bytes = output.getvalue().encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sample_utility_data.csv"}
    )

@router.post("/seed-demo")
def seed_demo_data_endpoint(force: bool = True, db: Session = Depends(get_db)):
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
