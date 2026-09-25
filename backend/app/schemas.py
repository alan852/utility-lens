from datetime import date, datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Property Schemas
class PropertyBase(BaseModel):
    name: str = Field(..., example="Main Home")
    address: Optional[str] = Field(None, example="123 High Street, London")
    currency_symbol: str = Field("£", example="£")

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    currency_symbol: Optional[str] = None

class PropertyResponse(PropertyBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Tariff Plan Schemas
class TariffPlanBase(BaseModel):
    property_id: str
    utility_type: str = Field(..., example="ELECTRICITY")  # ELECTRICITY, GAS, WATER, COUNCIL_TAX, BROADBAND, ESTATE_SERVICE_CHARGE
    name: str = Field(..., example="Flexible Standard")
    valid_from: date
    valid_to: Optional[date] = None
    unit_rate: Optional[float] = Field(None, ge=0, example=0.245)  # £ per kWh or m3 (optional for variable/tracker tariffs)
    standing_charge: float = Field(..., ge=0, example=0.55)  # £ per day
    vat_rate: float = Field(0.05, ge=0, le=1.0)
    is_active: bool = True

class TariffPlanCreate(TariffPlanBase):
    pass

class TariffPlanUpdate(BaseModel):
    name: Optional[str] = None
    utility_type: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    unit_rate: Optional[float] = None
    standing_charge: Optional[float] = None
    vat_rate: Optional[float] = None
    is_active: Optional[bool] = None

class TariffPlanResponse(TariffPlanBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Bill Record Schemas
class BillRecordBase(BaseModel):
    property_id: str
    utility_type: str = Field(..., example="ELECTRICITY")  # ELECTRICITY, GAS, WATER, COUNCIL_TAX, BROADBAND, ESTATE_SERVICE_CHARGE
    period_start: date
    period_end: date
    total_units: float = Field(default=0.0, ge=0, example=350.0)
    raw_meter_units: Optional[float] = None
    raw_unit_type: Optional[str] = None
    total_cost: float = Field(..., ge=0, example=95.50)
    standing_charge_cost: Optional[float] = None
    unit_rate_cost: Optional[float] = None
    notes: Optional[str] = None
    source: str = "MANUAL"

class BillRecordCreate(BillRecordBase):
    pass

class BillRecordUpdate(BaseModel):
    utility_type: Optional[str] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    total_units: Optional[float] = None
    raw_meter_units: Optional[float] = None
    raw_unit_type: Optional[str] = None
    total_cost: Optional[float] = None
    standing_charge_cost: Optional[float] = None
    unit_rate_cost: Optional[float] = None
    notes: Optional[str] = None

class BillRecordResponse(BillRecordBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Meter Reading Schemas
class MeterReadingBase(BaseModel):
    property_id: str
    utility_type: str = Field(..., example="ELECTRICITY")  # ELECTRICITY, GAS, WATER, COUNCIL_TAX, BROADBAND, ESTATE_SERVICE_CHARGE
    reading_date: date
    meter_index: float = Field(..., ge=0, example=12450.5)
    meter_unit: str = Field("KWH", example="KWH")
    reading_type: str = Field("ACTUAL", example="ACTUAL")
    notes: Optional[str] = None

class MeterReadingCreate(MeterReadingBase):
    pass

class MeterReadingUpdate(BaseModel):
    utility_type: Optional[str] = None
    reading_date: Optional[date] = None
    meter_index: Optional[float] = None
    meter_unit: Optional[str] = None
    reading_type: Optional[str] = None
    notes: Optional[str] = None

class MeterReadingResponse(MeterReadingBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Analytics Schemas
class KPISummaryResponse(BaseModel):
    total_spend_trailing_12m: float
    current_month_spend: float
    previous_month_spend: float
    month_over_month_change_pct: Optional[float]
    daily_avg_spend: float
    spend_by_utility_trailing_12m: Dict[str, float]
    currency_symbol: str = "£"

class MonthlyBreakdownItem(BaseModel):
    month_label: str  # e.g., "2025-01"
    year: int
    month: int
    electricity_cost: float = 0.0
    gas_cost: float = 0.0
    water_cost: float = 0.0
    council_tax_cost: float = 0.0
    broadband_cost: float = 0.0
    estate_service_charge_cost: float = 0.0
    total_cost: float = 0.0
    electricity_units: float = 0.0  # kWh
    gas_units: float = 0.0          # kWh
    water_units: float = 0.0        # m3
    days_in_month: int = 30
    daily_avg_cost: float = 0.0

class MonthlyBreakdownResponse(BaseModel):
    data: List[MonthlyBreakdownItem]
    currency_symbol: str = "£"

class YoYComparisonItem(BaseModel):
    month: int
    month_name: str  # "Jan", "Feb", etc.
    year_current: int
    current_total_cost: float = 0.0
    current_electricity_kwh: float = 0.0
    current_gas_kwh: float = 0.0
    year_previous: int
    previous_total_cost: float = 0.0
    previous_electricity_kwh: float = 0.0
    previous_gas_kwh: float = 0.0
    cost_diff_pct: Optional[float] = None
    kwh_diff_pct: Optional[float] = None

class YoYComparisonResponse(BaseModel):
    years_available: List[int]
    comparison_year_current: int
    comparison_year_previous: int
    data: List[YoYComparisonItem]

class BaseloadItem(BaseModel):
    utility_type: str
    estimated_baseload_monthly_units: float
    estimated_baseload_monthly_cost: float
    heating_season_peak_units: float
    heating_share_pct: float
    summer_baseline_units: float
    winter_peak_units: float

class BaseloadAnalysisResponse(BaseModel):
    currency_symbol: str
    items: List[BaseloadItem]
    insights: List[str]

class TariffSimulationScenario(BaseModel):
    utility_type: str
    new_unit_rate: float       # £ or p
    new_standing_charge: float # £ or p/day
    vat_rate: float = 0.05

class TariffSimulationRequest(BaseModel):
    property_id: str
    months_lookback: int = 12
    scenarios: List[TariffSimulationScenario]

class TariffSimulationItemResult(BaseModel):
    utility_type: str
    historical_units: float
    historical_actual_cost: float
    simulated_cost: float
    cost_difference: float
    savings_pct: float
    unit_rate_cost: float
    standing_charge_cost: float

class TariffSimulationResponse(BaseModel):
    property_id: str
    months_analyzed: int
    total_historical_cost: float
    total_simulated_cost: float
    total_savings: float
    total_savings_pct: float
    currency_symbol: str
    breakdown: List[TariffSimulationItemResult]

# CSV Import / Preview Schemas
class ColumnMapping(BaseModel):
    date_col: str
    utility_type_col: Optional[str] = None
    default_utility_type: Optional[str] = None  # If CSV is single utility
    usage_col: str
    cost_col: Optional[str] = None
    standing_charge_col: Optional[str] = None
    end_date_col: Optional[str] = None
    notes_col: Optional[str] = None
    gas_unit_type: Optional[str] = "KWH"  # "M3" or "KWH"

class CSVPreviewResponse(BaseModel):
    detected_headers: List[str]
    suggested_mapping: Dict[str, Optional[str]]
    sample_rows: List[Dict[str, Any]]
    total_rows: int

class CSVImportCommitRequest(BaseModel):
    property_id: str
    file_content_base64: Optional[str] = None
    raw_csv_text: str
    mapping: ColumnMapping

class CSVImportResult(BaseModel):
    success: bool
    imported_count: int
    skipped_count: int
    errors: List[str]
    message: str

class BackupImportResult(BaseModel):
    success: bool
    message: str
    properties_count: int
    bills_count: int
    readings_count: int
    tariffs_count: int

