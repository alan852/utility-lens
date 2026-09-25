import {
  Property,
  TariffPlan,
  BillRecord,
  MeterReading,
  KPISummary,
  MonthlyBreakdownResponse,
  YoYComparisonResponse,
  BaseloadAnalysisResponse,
  TariffSimulationResponse,
  TariffSimulationScenario,
  CSVPreviewResponse,
  CSVImportResult,
  ColumnMapping,
  BackupImportResult
} from '../types';

const API_BASE = '/api';

export const api = {
  // Properties
  async getProperties(): Promise<Property[]> {
    const res = await fetch(`${API_BASE}/properties`);
    if (!res.ok) throw new Error('Failed to load properties');
    return res.json();
  },

  async createProperty(data: { name: string; address?: string; currency_symbol: string }): Promise<Property> {
    const res = await fetch(`${API_BASE}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create property');
    return res.json();
  },

  // Tariffs
  async getTariffs(propertyId: string): Promise<TariffPlan[]> {
    const res = await fetch(`${API_BASE}/tariffs?property_id=${propertyId}`);
    if (!res.ok) throw new Error('Failed to load tariffs');
    return res.json();
  },

  async createTariff(data: Omit<TariffPlan, 'id' | 'created_at'>): Promise<TariffPlan> {
    const res = await fetch(`${API_BASE}/tariffs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create tariff');
    return res.json();
  },

  async deleteTariff(tariffId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/tariffs/${tariffId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete tariff');
  },

  // Bills
  async getBills(propertyId: string, utilityType?: string): Promise<BillRecord[]> {
    const url = utilityType 
      ? `${API_BASE}/bills?property_id=${propertyId}&utility_type=${utilityType}` 
      : `${API_BASE}/bills?property_id=${propertyId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load bills');
    return res.json();
  },

  async createBill(data: Omit<BillRecord, 'id' | 'created_at'>): Promise<BillRecord> {
    const res = await fetch(`${API_BASE}/bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save bill');
    return res.json();
  },

  async deleteBill(billId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/bills/${billId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete bill');
  },

  // Meter Readings
  async getMeterReadings(propertyId: string, utilityType?: string): Promise<MeterReading[]> {
    const url = utilityType
      ? `${API_BASE}/meter-readings?property_id=${propertyId}&utility_type=${utilityType}`
      : `${API_BASE}/meter-readings?property_id=${propertyId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load meter readings');
    return res.json();
  },

  async createMeterReading(data: Omit<MeterReading, 'id' | 'created_at'>): Promise<MeterReading> {
    const res = await fetch(`${API_BASE}/meter-readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save meter reading');
    return res.json();
  },

  async deleteMeterReading(readingId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/meter-readings/${readingId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete meter reading');
  },

  // Analytics
  async getKPIs(propertyId: string): Promise<KPISummary> {
    const res = await fetch(`${API_BASE}/analytics/kpis?property_id=${propertyId}`);
    if (!res.ok) throw new Error('Failed to load KPI metrics');
    return res.json();
  },

  async getMonthlyBreakdown(propertyId: string, monthsLookback = 24): Promise<MonthlyBreakdownResponse> {
    const res = await fetch(`${API_BASE}/analytics/monthly-breakdown?property_id=${propertyId}&months_lookback=${monthsLookback}`);
    if (!res.ok) throw new Error('Failed to load monthly breakdown');
    return res.json();
  },

  async getYoYComparison(propertyId: string, yearCurrent?: number, yearPrevious?: number): Promise<YoYComparisonResponse> {
    let url = `${API_BASE}/analytics/yoy-comparison?property_id=${propertyId}`;
    if (yearCurrent) url += `&year_current=${yearCurrent}`;
    if (yearPrevious) url += `&year_previous=${yearPrevious}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load YoY comparison');
    return res.json();
  },

  async getBaseload(propertyId: string): Promise<BaseloadAnalysisResponse> {
    const res = await fetch(`${API_BASE}/analytics/baseload?property_id=${propertyId}`);
    if (!res.ok) throw new Error('Failed to load baseload analysis');
    return res.json();
  },

  async simulateTariffs(propertyId: string, scenarios: TariffSimulationScenario[], monthsLookback = 12): Promise<TariffSimulationResponse> {
    const res = await fetch(`${API_BASE}/analytics/simulate-tariffs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: propertyId, scenarios, months_lookback: monthsLookback }),
    });
    if (!res.ok) throw new Error('Failed to run tariff simulation');
    return res.json();
  },

  // Data I/O & CSV
  async previewCSV(file: File): Promise<CSVPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/data-io/preview-csv`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to parse CSV preview');
    return res.json();
  },

  async commitCSV(propertyId: string, rawCsvText: string, mapping: ColumnMapping): Promise<CSVImportResult> {
    const res = await fetch(`${API_BASE}/data-io/commit-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: propertyId, raw_csv_text: rawCsvText, mapping }),
    });
    if (!res.ok) throw new Error('Failed to commit CSV data');
    return res.json();
  },

  async seedDemoData(): Promise<{ message: string; property_id: string }> {
    const res = await fetch(`${API_BASE}/data-io/seed-demo`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to seed demo data');
    return res.json();
  },

  getSampleCSVUrl(): string {
    return `${API_BASE}/data-io/sample-csv`;
  },

  getExportBackupUrl(): string {
    return `${API_BASE}/data-io/export-backup`;
  },

  async importBackup(file: File, mode: 'merge' | 'replace' = 'merge'): Promise<BackupImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/data-io/import-backup?mode=${mode}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to import backup' }));
      throw new Error(err.detail || 'Failed to import backup');
    }
    return res.json();
  }
};
