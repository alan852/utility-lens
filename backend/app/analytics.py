from typing import Dict, List, Optional, Tuple
from datetime import date, datetime, timedelta
import calendar
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from . import models, schemas, crud

def compute_kpis(db: Session, property_id: str) -> schemas.KPISummaryResponse:
    prop = crud.get_property(db, property_id)
    currency = prop.currency_symbol if prop else "£"

    bills = crud.get_bills(db, property_id)
    if not bills:
        return schemas.KPISummaryResponse(
            total_spend_trailing_12m=0.0,
            current_month_spend=0.0,
            previous_month_spend=0.0,
            month_over_month_change_pct=None,
            daily_avg_spend=0.0,
            spend_by_utility_trailing_12m={"ELECTRICITY": 0.0, "GAS": 0.0, "WATER": 0.0},
            currency_symbol=currency
        )

    # Convert bills to dataframe
    records = []
    for b in bills:
        records.append({
            "utility_type": b.utility_type,
            "period_start": b.period_start,
            "period_end": b.period_end,
            "total_units": b.total_units,
            "total_cost": b.total_cost,
        })
    df = pd.DataFrame(records)
    df["period_start"] = pd.to_datetime(df["period_start"])
    df["period_end"] = pd.to_datetime(df["period_end"])
    df["month_period"] = df["period_start"].dt.to_period("M")

    # Group by month period and utility
    monthly_total = df.groupby("month_period")["total_cost"].sum().sort_index()

    # Trailing 12 months
    latest_period = monthly_total.index.max() if not monthly_total.empty else None
    
    if latest_period is not None:
        t12_start = latest_period - 11
        df_t12 = df[df["month_period"] >= t12_start]
        total_t12_spend = round(float(df_t12["total_cost"].sum()), 2)
        
        # Spend by utility trailing 12m
        util_t12 = df_t12.groupby("utility_type")["total_cost"].sum().to_dict()
        spend_by_util = {
            "ELECTRICITY": round(float(util_t12.get("ELECTRICITY", 0.0)), 2),
            "GAS": round(float(util_t12.get("GAS", 0.0)), 2),
            "WATER": round(float(util_t12.get("WATER", 0.0)), 2)
        }

        # Current vs previous month
        current_spend = round(float(monthly_total.get(latest_period, 0.0)), 2)
        prev_period = latest_period - 1
        prev_spend = round(float(monthly_total.get(prev_period, 0.0)), 2)

        mom_pct = None
        if prev_spend > 0:
            mom_pct = round(((current_spend - prev_spend) / prev_spend) * 100, 1)

        # Days in current month
        days_in_current_month = calendar.monthrange(latest_period.year, latest_period.month)[1]
        daily_avg = round(current_spend / days_in_current_month, 2)
    else:
        total_t12_spend = 0.0
        current_spend = 0.0
        prev_spend = 0.0
        mom_pct = None
        daily_avg = 0.0
        spend_by_util = {"ELECTRICITY": 0.0, "GAS": 0.0, "WATER": 0.0}

    return schemas.KPISummaryResponse(
        total_spend_trailing_12m=total_t12_spend,
        current_month_spend=current_spend,
        previous_month_spend=prev_spend,
        month_over_month_change_pct=mom_pct,
        daily_avg_spend=daily_avg,
        spend_by_utility_trailing_12m=spend_by_util,
        currency_symbol=currency
    )

def compute_monthly_breakdown(db: Session, property_id: str, months_lookback: int = 24) -> schemas.MonthlyBreakdownResponse:
    prop = crud.get_property(db, property_id)
    currency = prop.currency_symbol if prop else "£"

    bills = crud.get_bills(db, property_id)
    if not bills:
        return schemas.MonthlyBreakdownResponse(data=[], currency_symbol=currency)

    records = []
    for b in bills:
        records.append({
            "utility_type": b.utility_type,
            "period_start": b.period_start,
            "total_units": b.total_units,
            "total_cost": b.total_cost,
        })
    df = pd.DataFrame(records)
    df["period_start"] = pd.to_datetime(df["period_start"])
    df["year"] = df["period_start"].dt.year
    df["month"] = df["period_start"].dt.month
    df["month_label"] = df["period_start"].dt.strftime("%Y-%m")

    # Group by month_label and utility_type
    pivoted_cost = df.pivot_table(index=["year", "month", "month_label"], columns="utility_type", values="total_cost", aggfunc="sum").fillna(0.0)
    pivoted_units = df.pivot_table(index=["year", "month", "month_label"], columns="utility_type", values="total_units", aggfunc="sum").fillna(0.0)

    # Sort chronologically
    combined = pd.DataFrame(index=pivoted_cost.index)
    combined["electricity_cost"] = pivoted_cost.get("ELECTRICITY", 0.0)
    combined["gas_cost"] = pivoted_cost.get("GAS", 0.0)
    combined["water_cost"] = pivoted_cost.get("WATER", 0.0)
    combined["electricity_units"] = pivoted_units.get("ELECTRICITY", 0.0)
    combined["gas_units"] = pivoted_units.get("GAS", 0.0)
    combined["water_units"] = pivoted_units.get("WATER", 0.0)

    combined = combined.sort_index().tail(months_lookback)

    result_items = []
    for (year, month, label), row in combined.iterrows():
        days = calendar.monthrange(int(year), int(month))[1]
        tot_cost = round(float(row["electricity_cost"] + row["gas_cost"] + row["water_cost"]), 2)
        daily_avg = round(tot_cost / days, 2)

        result_items.append(schemas.MonthlyBreakdownItem(
            month_label=str(label),
            year=int(year),
            month=int(month),
            electricity_cost=round(float(row["electricity_cost"]), 2),
            gas_cost=round(float(row["gas_cost"]), 2),
            water_cost=round(float(row["water_cost"]), 2),
            total_cost=tot_cost,
            electricity_units=round(float(row["electricity_units"]), 1),
            gas_units=round(float(row["gas_units"]), 1),
            water_units=round(float(row["water_units"]), 1),
            days_in_month=days,
            daily_avg_cost=daily_avg
        ))

    return schemas.MonthlyBreakdownResponse(data=result_items, currency_symbol=currency)

def compute_yoy_comparison(
    db: Session, 
    property_id: str, 
    year_current: Optional[int] = None, 
    year_previous: Optional[int] = None
) -> schemas.YoYComparisonResponse:
    bills = crud.get_bills(db, property_id)
    if not bills:
        cur_year = datetime.now().year
        return schemas.YoYComparisonResponse(
            years_available=[cur_year],
            comparison_year_current=cur_year,
            comparison_year_previous=cur_year - 1,
            data=[]
        )

    records = []
    for b in bills:
        records.append({
            "utility_type": b.utility_type,
            "year": b.period_start.year,
            "month": b.period_start.month,
            "total_units": b.total_units,
            "total_cost": b.total_cost,
        })
    df = pd.DataFrame(records)

    years_available = sorted(df["year"].unique().tolist())
    if not year_current:
        year_current = max(years_available)
    if not year_previous:
        # Default to preceding year or year_current - 1
        older_years = [y for y in years_available if y < year_current]
        year_previous = max(older_years) if older_years else (year_current - 1)

    # Filter for both years
    df_curr = df[df["year"] == year_current]
    df_prev = df[df["year"] == year_previous]

    # Aggregate by month
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    items = []

    for m in range(1, 13):
        m_curr = df_curr[df_curr["month"] == m]
        m_prev = df_prev[df_prev["month"] == m]

        c_cost = float(m_curr["total_cost"].sum()) if not m_curr.empty else 0.0
        c_elec = float(m_curr[m_curr["utility_type"] == "ELECTRICITY"]["total_units"].sum()) if not m_curr.empty else 0.0
        c_gas = float(m_curr[m_curr["utility_type"] == "GAS"]["total_units"].sum()) if not m_curr.empty else 0.0

        p_cost = float(m_prev["total_cost"].sum()) if not m_prev.empty else 0.0
        p_elec = float(m_prev[m_prev["utility_type"] == "ELECTRICITY"]["total_units"].sum()) if not m_prev.empty else 0.0
        p_gas = float(m_prev[m_prev["utility_type"] == "GAS"]["total_units"].sum()) if not m_prev.empty else 0.0

        cost_diff_pct = None
        if p_cost > 0:
            cost_diff_pct = round(((c_cost - p_cost) / p_cost) * 100, 1)

        tot_c_kwh = c_elec + c_gas
        tot_p_kwh = p_elec + p_gas
        kwh_diff_pct = None
        if tot_p_kwh > 0:
            kwh_diff_pct = round(((tot_c_kwh - tot_p_kwh) / tot_p_kwh) * 100, 1)

        items.append(schemas.YoYComparisonItem(
            month=m,
            month_name=month_names[m - 1],
            year_current=year_current,
            current_total_cost=round(c_cost, 2),
            current_electricity_kwh=round(c_elec, 1),
            current_gas_kwh=round(c_gas, 1),
            year_previous=year_previous,
            previous_total_cost=round(p_cost, 2),
            previous_electricity_kwh=round(p_elec, 1),
            previous_gas_kwh=round(p_gas, 1),
            cost_diff_pct=cost_diff_pct,
            kwh_diff_pct=kwh_diff_pct
        ))

    return schemas.YoYComparisonResponse(
        years_available=years_available,
        comparison_year_current=year_current,
        comparison_year_previous=year_previous,
        data=items
    )

def compute_baseload_analysis(db: Session, property_id: str) -> schemas.BaseloadAnalysisResponse:
    prop = crud.get_property(db, property_id)
    currency = prop.currency_symbol if prop else "£"

    bills = crud.get_bills(db, property_id)
    if not bills:
        return schemas.BaseloadAnalysisResponse(currency_symbol=currency, items=[], insights=["No bill records found to analyze baseload."])

    records = []
    for b in bills:
        records.append({
            "utility_type": b.utility_type,
            "month": b.period_start.month,
            "total_units": b.total_units,
            "total_cost": b.total_cost
        })
    df = pd.DataFrame(records)

    items = []
    insights = []

    # Analyze Gas (Space Heating indicator)
    df_gas = df[df["utility_type"] == "GAS"]
    if not df_gas.empty:
        # Summer months (June, July, August) = hot water / cooking baseline
        summer_gas = df_gas[df_gas["month"].isin([6, 7, 8])]["total_units"].mean()
        if pd.isna(summer_gas) or summer_gas <= 0:
            summer_gas = df_gas["total_units"].min()
        
        winter_gas = df_gas[df_gas["month"].isin([12, 1, 2])]["total_units"].max()
        if pd.isna(winter_gas):
            winter_gas = df_gas["total_units"].max()

        gas_cost_rate = (df_gas["total_cost"].sum() / df_gas["total_units"].sum()) if df_gas["total_units"].sum() > 0 else 0.08
        heating_share = max(0.0, min(100.0, round(((winter_gas - summer_gas) / winter_gas) * 100, 1))) if winter_gas > 0 else 0.0

        items.append(schemas.BaseloadItem(
            utility_type="GAS",
            estimated_baseload_monthly_units=round(float(summer_gas), 1),
            estimated_baseload_monthly_cost=round(float(summer_gas * gas_cost_rate), 2),
            heating_season_peak_units=round(float(winter_gas), 1),
            heating_share_pct=heating_share,
            summer_baseline_units=round(float(summer_gas), 1),
            winter_peak_units=round(float(winter_gas), 1)
        ))
        insights.append(
            f"Gas Baseload: Estimated at ~{round(summer_gas, 0)} kWh/month for non-heating needs (hot water & cooking). "
            f"Winter space heating accounts for ~{heating_share}% of winter gas demand."
        )

    # Analyze Electricity (Always-on appliances & electronics)
    df_elec = df[df["utility_type"] == "ELECTRICITY"]
    if not df_elec.empty:
        min_elec = df_elec["total_units"].min()
        max_elec = df_elec["total_units"].max()
        elec_cost_rate = (df_elec["total_cost"].sum() / df_elec["total_units"].sum()) if df_elec["total_units"].sum() > 0 else 0.28
        elec_seasonal_swing = max(0.0, min(100.0, round(((max_elec - min_elec) / max_elec) * 100, 1))) if max_elec > 0 else 0.0

        items.append(schemas.BaseloadItem(
            utility_type="ELECTRICITY",
            estimated_baseload_monthly_units=round(float(min_elec), 1),
            estimated_baseload_monthly_cost=round(float(min_elec * elec_cost_rate), 2),
            heating_season_peak_units=round(float(max_elec), 1),
            heating_share_pct=elec_seasonal_swing,
            summer_baseline_units=round(float(min_elec), 1),
            winter_peak_units=round(float(max_elec), 1)
        ))
        insights.append(
            f"Electricity Baseload: Consistent minimum draw is ~{round(min_elec, 0)} kWh/month ({currency}{round(min_elec * elec_cost_rate, 2)}/mo), "
            f"reflecting continuous refrigeration, stand-by appliances, and lighting."
        )

    return schemas.BaseloadAnalysisResponse(currency_symbol=currency, items=items, insights=insights)

def simulate_tariffs(db: Session, request: schemas.TariffSimulationRequest) -> schemas.TariffSimulationResponse:
    prop = crud.get_property(db, request.property_id)
    currency = prop.currency_symbol if prop else "£"

    bills = crud.get_bills(db, request.property_id)
    if not bills:
        return schemas.TariffSimulationResponse(
            property_id=request.property_id,
            months_analyzed=0,
            total_historical_cost=0.0,
            total_simulated_cost=0.0,
            total_savings=0.0,
            total_savings_pct=0.0,
            currency_symbol=currency,
            breakdown=[]
        )

    # Convert to dataframe
    records = []
    for b in bills:
        records.append({
            "utility_type": b.utility_type,
            "period_start": b.period_start,
            "period_end": b.period_end,
            "total_units": b.total_units,
            "total_cost": b.total_cost,
            "days": max(1, (b.period_end - b.period_start).days)
        })
    df = pd.DataFrame(records)
    df["period_start"] = pd.to_datetime(df["period_start"])
    
    # Filter by lookback months
    cutoff = datetime.now() - timedelta(days=request.months_lookback * 30.5)
    df = df[df["period_start"] >= cutoff]

    scenario_map = {s.utility_type.upper(): s for s in request.scenarios}
    
    total_historical = 0.0
    total_simulated = 0.0
    breakdown_items = []

    for util_type, group in df.groupby("utility_type"):
        hist_units = float(group["total_units"].sum())
        hist_cost = float(group["total_cost"].sum())
        tot_days = int(group["days"].sum())
        total_historical += hist_cost

        scenario = scenario_map.get(util_type)
        if scenario:
            vat_mult = 1.0 + scenario.vat_rate
            unit_cost = hist_units * scenario.new_unit_rate * vat_mult
            standing_cost = tot_days * scenario.new_standing_charge * vat_mult
            sim_cost = round(unit_cost + standing_cost, 2)
        else:
            unit_cost = hist_cost * 0.7
            standing_cost = hist_cost * 0.3
            sim_cost = hist_cost

        total_simulated += sim_cost
        diff = round(hist_cost - sim_cost, 2)
        savings_pct = round((diff / hist_cost) * 100, 1) if hist_cost > 0 else 0.0

        breakdown_items.append(schemas.TariffSimulationItemResult(
            utility_type=util_type,
            historical_units=round(hist_units, 1),
            historical_actual_cost=round(hist_cost, 2),
            simulated_cost=round(sim_cost, 2),
            cost_difference=diff,
            savings_pct=savings_pct,
            unit_rate_cost=round(unit_cost, 2),
            standing_charge_cost=round(standing_cost, 2)
        ))

    total_diff = round(total_historical - total_simulated, 2)
    tot_savings_pct = round((total_diff / total_historical) * 100, 1) if total_historical > 0 else 0.0

    return schemas.TariffSimulationResponse(
        property_id=request.property_id,
        months_analyzed=request.months_lookback,
        total_historical_cost=round(total_historical, 2),
        total_simulated_cost=round(total_simulated, 2),
        total_savings=total_diff,
        total_savings_pct=tot_savings_pct,
        currency_symbol=currency,
        breakdown=breakdown_items
    )
