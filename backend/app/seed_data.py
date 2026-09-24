from datetime import date, datetime, timedelta
import calendar
from sqlalchemy.orm import Session
from . import models

def seed_demo_data(db: Session, force_reset: bool = False) -> models.Property:
    # If property already exists and not force_reset, return existing
    existing = db.query(models.Property).first()
    if existing and not force_reset:
        return existing

    if force_reset:
        db.query(models.BillRecord).delete()
        db.query(models.MeterReading).delete()
        db.query(models.TariffPlan).delete()
        db.query(models.UtilityAccount).delete()
        db.query(models.Property).delete()
        db.commit()

    # Create Primary Property
    prop = models.Property(
        name="Main Home (Bristol)",
        address="42 Green Lane, Bristol, BS1 5AH",
        currency_symbol="£"
    )
    db.add(prop)
    db.flush()

    # Create Secondary Property for multi-property switcher demo
    prop2 = models.Property(
        name="Holiday Cottage (Cornwall)",
        address="Seaside Road, St Ives, TR26 1AB",
        currency_symbol="£"
    )
    db.add(prop2)
    db.flush()

    # Create Tariffs for Main Home
    tariffs = [
        models.TariffPlan(
            property_id=prop.id,
            utility_type="ELECTRICITY",
            name="Octopus Flexible Electric",
            valid_from=date(2024, 1, 1),
            unit_rate=0.245,        # 24.5p / kWh
            standing_charge=0.55,   # 55p / day
            vat_rate=0.05,
            is_active=True
        ),
        models.TariffPlan(
            property_id=prop.id,
            utility_type="GAS",
            name="Octopus Flexible Gas",
            valid_from=date(2024, 1, 1),
            unit_rate=0.065,        # 6.5p / kWh
            standing_charge=0.31,   # 31p / day
            vat_rate=0.05,
            is_active=True
        ),
        models.TariffPlan(
            property_id=prop.id,
            utility_type="WATER",
            name="Bristol Water Metered",
            valid_from=date(2024, 1, 1),
            unit_rate=2.15,         # £2.15 / m3 (clean + waste)
            standing_charge=0.28,   # 28p / day
            vat_rate=0.0,
            is_active=True
        ),
    ]
    for t in tariffs:
        db.add(t)

    # Generate 18 months of realistic historical bills up to previous month
    # We will simulate months from (today - 18 months) to last month
    today = date.today()
    bills = []
    
    # Cumulative meter reading tracking
    elec_meter = 14200.0
    gas_meter = 4100.0

    # Seasonality multipliers for gas heating by month (1 to 12)
    # Winter is high, summer is baseline
    gas_monthly_kwh = {
        1: 1850.0, 2: 1650.0, 3: 1300.0, 4: 850.0, 5: 450.0, 6: 220.0,
        7: 190.0,  8: 210.0,  9: 380.0,  10: 950.0, 11: 1450.0, 12: 1950.0
    }
    elec_monthly_kwh = {
        1: 340.0, 2: 320.0, 3: 295.0, 4: 270.0, 5: 250.0, 6: 240.0,
        7: 235.0, 8: 245.0, 9: 265.0, 10: 290.0, 11: 320.0, 12: 360.0
    }
    water_monthly_m3 = {
        1: 9.2, 2: 8.8, 3: 9.5, 4: 9.0, 5: 10.2, 6: 11.5,
        7: 12.0, 8: 11.8, 9: 10.0, 10: 9.4, 11: 9.0, 12: 9.6
    }

    # Start from 18 months ago
    start_year = today.year - 2 if today.month <= 6 else today.year - 1
    start_month = (today.month - 18) % 12 or 12

    cur_dt = date(today.year, today.month, 1) - timedelta(days=540)
    cur_year = cur_dt.year
    cur_m = cur_dt.month

    for _ in range(18):
        days_in_m = calendar.monthrange(cur_year, cur_m)[1]
        p_start = date(cur_year, cur_m, 1)
        p_end = date(cur_year, cur_m, days_in_m)

        # 1. Electricity
        e_kwh = elec_monthly_kwh[cur_m]
        e_unit_cost = e_kwh * 0.245 * 1.05
        e_sc_cost = days_in_m * 0.55 * 1.05
        e_total = round(e_unit_cost + e_sc_cost, 2)
        bills.append(models.BillRecord(
            property_id=prop.id,
            utility_type="ELECTRICITY",
            period_start=p_start,
            period_end=p_end,
            total_units=e_kwh,
            total_cost=e_total,
            standing_charge_cost=round(e_sc_cost, 2),
            unit_rate_cost=round(e_unit_cost, 2),
            source="SEED_DATA",
            notes="Monthly statement"
        ))
        elec_meter += e_kwh

        # 2. Gas
        g_kwh = gas_monthly_kwh[cur_m]
        # Standard UK calorific conversion m3 to kWh: kWh = m3 * 1.02264 * 40.0 / 3.6 = m3 * 11.36
        g_m3 = round(g_kwh / 11.36, 1)
        g_unit_cost = g_kwh * 0.065 * 1.05
        g_sc_cost = days_in_m * 0.31 * 1.05
        g_total = round(g_unit_cost + g_sc_cost, 2)
        bills.append(models.BillRecord(
            property_id=prop.id,
            utility_type="GAS",
            period_start=p_start,
            period_end=p_end,
            total_units=g_kwh,
            raw_meter_units=g_m3,
            raw_unit_type="M3",
            total_cost=g_total,
            standing_charge_cost=round(g_sc_cost, 2),
            unit_rate_cost=round(g_unit_cost, 2),
            source="SEED_DATA",
            notes=f"Converted from {g_m3} m³ meter read"
        ))
        gas_meter += g_m3

        # 3. Water
        w_m3 = water_monthly_m3[cur_m]
        w_unit_cost = w_m3 * 2.15
        w_sc_cost = days_in_m * 0.28
        w_total = round(w_unit_cost + w_sc_cost, 2)
        bills.append(models.BillRecord(
            property_id=prop.id,
            utility_type="WATER",
            period_start=p_start,
            period_end=p_end,
            total_units=w_m3,
            total_cost=w_total,
            standing_charge_cost=round(w_sc_cost, 2),
            unit_rate_cost=round(w_unit_cost, 2),
            source="SEED_DATA",
            notes="Metered supply & sewerage"
        ))

        # Add occasional meter readings
        if cur_m % 3 == 0:
            db.add(models.MeterReading(
                property_id=prop.id,
                utility_type="ELECTRICITY",
                reading_date=p_end,
                meter_index=round(elec_meter, 1),
                meter_unit="KWH",
                reading_type="ACTUAL",
                notes="Quarterly smart check"
            ))
            db.add(models.MeterReading(
                property_id=prop.id,
                utility_type="GAS",
                reading_date=p_end,
                meter_index=round(gas_meter, 1),
                meter_unit="M3",
                reading_type="ACTUAL",
                notes="Quarterly meter index check"
            ))

        # Move to next month
        cur_m += 1
        if cur_m > 12:
            cur_m = 1
            cur_year += 1

    for b in bills:
        db.add(b)

    db.commit()
    db.refresh(prop)
    return prop
