import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { CSVPreviewResponse, ColumnMapping, CSVImportResult } from '../../types';
import { Upload, FileSpreadsheet, X, AlertCircle, Download, CheckCircle2, ArrowRight } from 'lucide-react';

interface CSVImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CSVImporterModal: React.FC<CSVImporterModalProps> = ({ isOpen, onClose }) => {
  const { currentProperty, triggerRefresh } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [preview, setPreview] = useState<CSVPreviewResponse | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [result, setResult] = useState<CSVImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mapping state
  const [mapping, setMapping] = useState<ColumnMapping>({
    date_col: '',
    end_date_col: '',
    utility_type_col: '',
    default_utility_type: 'ELECTRICITY',
    usage_col: '',
    cost_col: '',
    standing_charge_col: '',
    notes_col: '',
    gas_unit_type: 'KWH',
  });

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    setResult(null);

    try {
      const text = await selected.text();
      setRawText(text);

      const previewData = await api.previewCSV(selected);
      setPreview(previewData);

      // Pre-fill suggested mapping
      const s = previewData.suggested_mapping;
      setMapping({
        date_col: s.date_col || previewData.detected_headers[0] || '',
        end_date_col: s.end_date_col || '',
        utility_type_col: s.utility_type_col || '',
        default_utility_type: 'ELECTRICITY',
        usage_col: s.usage_col || '',
        cost_col: s.cost_col || '',
        standing_charge_col: s.standing_charge_col || '',
        notes_col: s.notes_col || '',
        gas_unit_type: 'KWH',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to read CSV file');
    }
  };

  const handleCommit = async () => {
    if (!currentProperty || !rawText) return;
    if (!mapping.date_col || !mapping.usage_col) {
      setError('Date and Usage columns are required to map.');
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const res = await api.commitCSV(currentProperty.id, rawText, mapping);
      setResult(res);
      if (res.success) {
        triggerRefresh();
      }
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setRawText('');
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Smart CSV Importer</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Import bills with auto-detection into {currentProperty?.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => { resetState(); onClose(); }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className={`p-4 rounded-xl text-xs border ${
              result.success
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 border-amber-200 dark:border-amber-800'
            }`}>
              <div className="flex items-center space-x-2 font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{result.message}</span>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <span className="font-semibold">Sample Issues:</span>
                  <ul className="list-disc pl-4 opacity-90">
                    {result.errors.map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Upload Area */}
          {!preview && !result && (
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:border-sky-500 transition">
              <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Choose a utility CSV file or drag and drop here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports exports from energy suppliers, spreadsheets, or smart meter logs
              </p>
              <label className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer shadow-sm">
                Select CSV File
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400">Need a format to start?</span>{' '}
                <a
                  href={api.getSampleCSVUrl()}
                  download="sample_utility_data.csv"
                  className="inline-flex items-center text-sky-600 dark:text-sky-400 hover:underline font-medium ml-1"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download Sample CSV Template
                </a>
              </div>
            </div>
          )}

          {/* Column Mapping Section */}
          {preview && !result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-700">
                <span>File: <strong>{file?.name}</strong> ({preview.total_rows} rows found)</span>
                <button
                  onClick={resetState}
                  className="text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Choose Different File
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Date Col */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start / Billing Date Column <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={mapping.date_col}
                    onChange={(e) => setMapping({ ...mapping, date_col: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  >
                    <option value="">Select column...</option>
                    {preview.detected_headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* End Date Col */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date Column (Optional)
                  </label>
                  <select
                    value={mapping.end_date_col}
                    onChange={(e) => setMapping({ ...mapping, end_date_col: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  >
                    <option value="">(Auto: end of month or +30d)</option>
                    {preview.detected_headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Utility Col */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Utility Type Column
                  </label>
                  <select
                    value={mapping.utility_type_col || ''}
                    onChange={(e) => setMapping({ ...mapping, utility_type_col: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  >
                    <option value="">(No column, use fallback)</option>
                    {preview.detected_headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Fallback Utility */}
                {!mapping.utility_type_col && (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fallback Utility Type
                    </label>
                    <select
                      value={mapping.default_utility_type}
                      onChange={(e) => setMapping({ ...mapping, default_utility_type: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    >
                      <option value="ELECTRICITY">Electricity</option>
                      <option value="GAS">Gas</option>
                      <option value="WATER">Water</option>
                      <option value="COUNCIL_TAX">Council Tax</option>
                      <option value="BROADBAND">Broadband</option>
                      <option value="ESTATE_SERVICE_CHARGE">Estate Service Charge</option>
                    </select>
                  </div>
                )}

                {/* Usage Col */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Usage / Consumption Column <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={mapping.usage_col}
                    onChange={(e) => setMapping({ ...mapping, usage_col: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  >
                    <option value="">Select column...</option>
                    {preview.detected_headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Cost Col */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Cost Column (Optional)
                  </label>
                  <select
                    value={mapping.cost_col || ''}
                    onChange={(e) => setMapping({ ...mapping, cost_col: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  >
                    <option value="">(Auto-calculate from active tariff)</option>
                    {preview.detected_headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Standing Charge Col */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Standing Charge Column (Optional)
                  </label>
                  <select
                    value={mapping.standing_charge_col || ''}
                    onChange={(e) => setMapping({ ...mapping, standing_charge_col: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  >
                    <option value="">(Optional: auto-derive from tariff or total)</option>
                    {preview.detected_headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Gas units conversion */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gas Unit Format in CSV
                  </label>
                  <select
                    value={mapping.gas_unit_type}
                    onChange={(e) => setMapping({ ...mapping, gas_unit_type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  >
                    <option value="KWH">Direct kWh</option>
                    <option value="M3">m³ (Auto-convert to kWh using UK calorific factor)</option>
                  </select>
                </div>
              </div>

              {/* Sample Rows Preview Table */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                  Sample Preview (First 5 Rows)
                </h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                      <tr>
                        {preview.detected_headers.map((h) => (
                          <th key={h} className="p-2 border-b border-slate-200 dark:border-slate-700 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {preview.sample_rows.map((row, i) => (
                        <tr key={i}>
                          {preview.detected_headers.map((h) => (
                            <td key={h} className="p-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {row[h] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
          <button
            onClick={() => { resetState(); onClose(); }}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
          >
            {result ? 'Close' : 'Cancel'}
          </button>

          {preview && !result && (
            <button
              onClick={handleCommit}
              disabled={importing || !mapping.date_col || !mapping.usage_col}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm flex items-center transition disabled:opacity-50"
            >
              {importing ? 'Importing Rows...' : 'Confirm & Import Data'}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
