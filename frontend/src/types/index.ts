export type UtilityType = 'ELECTRICITY' | 'GAS' | 'WATER' | 'COUNCIL_TAX' | 'BROADBAND' | 'ESTATE_SERVICE_CHARGE';

export interface Property {
  id: string;
  name: string;
  address?: string;
  currency_symbol: string;
  created_at: string;
}

export interface TariffPlan {
  id: string;
  property_id: string;
  utility_type: UtilityType;
  name: string;
  valid_from: string;
  valid_to?: string;
  unit_rate: number | null;
  standing_charge: number;
  vat_rate: number;
  is_active: boolean;
  created_at: string;
}

export interface BillRecord {
  id: string;
  property_id: string;
  utility_type: UtilityType;
  period_start: string;
  period_end: string;
  total_units: number;
  raw_meter_units?: number;
  raw_unit_type?: string;
  total_cost: number;
  standing_charge_cost?: number;
  unit_rate_cost?: number;
  notes?: string;
  source: string;
  created_at: string;
}

export interface RecurringContractBillCreate {
  property_id: string;
  utility_type: UtilityType;
  contract_name?: string;
  start_date: string;
  end_date?: string;
  duration_months?: number;
  monthly_amount: number;
  standing_charge_cost?: number;
  unit_rate_cost?: number;
  total_units?: number;
  notes?: string;
  create_tariff_plan?: boolean;
  skip_existing?: boolean;
}

export interface RecurringContractBillResponse {
  success: boolean;
  created_count: number;
  skipped_count: number;
  message: string;
  bills: BillRecord[];
  tariff_plan?: TariffPlan | null;
}

export interface MeterReading {
  id: string;
  property_id: string;
  utility_type: UtilityType;
  reading_date: string;
  meter_index: number;
  meter_unit: string;
  reading_type: string;
  notes?: string;
  created_at: string;
}

export interface KPISummary {
  total_spend_trailing_12m: number;
  current_month_spend: number;
  previous_month_spend: number;
  month_over_month_change_pct: number | null;
  daily_avg_spend: number;
  spend_by_utility_trailing_12m: Record<string, number>;
  currency_symbol: string;
}

export interface MonthlyBreakdownItem {
  month_label: string;
  year: number;
  month: number;
  electricity_cost: number;
  gas_cost: number;
  water_cost: number;
  council_tax_cost?: number;
  broadband_cost?: number;
  estate_service_charge_cost?: number;
  total_cost: number;
  electricity_units: number;
  gas_units: number;
  water_units: number;
  days_in_month: number;
  daily_avg_cost: number;
}

export interface MonthlyBreakdownResponse {
  data: MonthlyBreakdownItem[];
  currency_symbol: string;
}

export interface YoYComparisonItem {
  month: number;
  month_name: string;
  year_current: number;
  current_total_cost: number;
  current_electricity_kwh: number;
  current_gas_kwh: number;
  year_previous: number;
  previous_total_cost: number;
  previous_electricity_kwh: number;
  previous_gas_kwh: number;
  cost_diff_pct: number | null;
  kwh_diff_pct: number | null;
}

export interface YoYComparisonResponse {
  years_available: number[];
  comparison_year_current: number;
  comparison_year_previous: number;
  data: YoYComparisonItem[];
}

export interface BaseloadItem {
  utility_type: string;
  estimated_baseload_monthly_units: number;
  estimated_baseload_monthly_cost: number;
  heating_season_peak_units: number;
  heating_share_pct: number;
  summer_baseline_units: number;
  winter_peak_units: number;
}

export interface BaseloadAnalysisResponse {
  currency_symbol: string;
  items: BaseloadItem[];
  insights: string[];
}

export interface TariffSimulationScenario {
  utility_type: UtilityType;
  new_unit_rate: number;
  new_standing_charge: number;
  vat_rate: number;
}

export interface TariffSimulationItemResult {
  utility_type: UtilityType;
  historical_units: number;
  historical_actual_cost: number;
  simulated_cost: number;
  cost_difference: number;
  savings_pct: number;
  unit_rate_cost: number;
  standing_charge_cost: number;
}

export interface TariffSimulationResponse {
  property_id: string;
  months_analyzed: number;
  total_historical_cost: number;
  total_simulated_cost: number;
  total_savings: number;
  total_savings_pct: number;
  currency_symbol: string;
  breakdown: TariffSimulationItemResult[];
}

export interface ColumnMapping {
  date_col: string;
  utility_type_col?: string;
  default_utility_type?: string;
  usage_col: string;
  cost_col?: string;
  standing_charge_col?: string;
  end_date_col?: string;
  notes_col?: string;
  gas_unit_type?: string;
}

export interface CSVPreviewResponse {
  detected_headers: string[];
  suggested_mapping: Record<string, string | null>;
  sample_rows: Record<string, any>[];
  total_rows: number;
}

export interface CSVImportResult {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  errors: string[];
  message: string;
}

export interface BackupImportResult {
  success: boolean;
  message: string;
  properties_count: number;
  bills_count: number;
  readings_count: number;
  tariffs_count: number;
}

