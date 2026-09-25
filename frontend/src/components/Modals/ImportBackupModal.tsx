import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { BackupImportResult } from '../../types';
import { FileUp, X, AlertCircle, CheckCircle2, RefreshCw, Database } from 'lucide-react';

interface ImportBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportBackupModal: React.FC<ImportBackupModalProps> = ({ isOpen, onClose }) => {
  const { triggerRefresh } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BackupImportResult | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.endsWith('.json')) {
        setError('Please select a valid JSON backup file.');
        return;
      }
      setFile(selected);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a JSON backup file to import.');
      return;
    }

    if (mode === 'replace') {
      const confirmed = confirm(
        'WARNING: "Replace All Data" will overwrite existing properties, bills, tariffs, and readings in your database with the backup data. Do you want to proceed?'
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.importBackup(file, mode);
      setResult(res);
      triggerRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to import backup.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setFile(null);
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Import JSON Backup</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Restore or merge utilities data from a previously exported backup
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  {result.message}
                </h4>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-700 dark:text-slate-300">
                  <div className="p-2 rounded bg-white/70 dark:bg-slate-800/70 border border-emerald-100 dark:border-emerald-900">
                    <span className="block font-bold text-slate-900 dark:text-white text-base">
                      {result.properties_count}
                    </span>
                    Properties Restored
                  </div>
                  <div className="p-2 rounded bg-white/70 dark:bg-slate-800/70 border border-emerald-100 dark:border-emerald-900">
                    <span className="block font-bold text-slate-900 dark:text-white text-base">
                      {result.bills_count}
                    </span>
                    Bill Records
                  </div>
                  <div className="p-2 rounded bg-white/70 dark:bg-slate-800/70 border border-emerald-100 dark:border-emerald-900">
                    <span className="block font-bold text-slate-900 dark:text-white text-base">
                      {result.tariffs_count}
                    </span>
                    Tariff Plans
                  </div>
                  <div className="p-2 rounded bg-white/70 dark:bg-slate-800/70 border border-emerald-100 dark:border-emerald-900">
                    <span className="block font-bold text-slate-900 dark:text-white text-base">
                      {result.readings_count}
                    </span>
                    Meter Readings
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* File Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Backup File (.json)
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-sky-500 dark:hover:border-sky-500 transition cursor-pointer relative bg-slate-50/50 dark:bg-slate-900/50">
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Database className="w-8 h-8 text-sky-500 mx-auto mb-2" />
                  {file ? (
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB • Click or drag to change
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Drop your <span className="font-semibold text-sky-600 dark:text-sky-400">utility_backup.json</span> here
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">or click to browse from device</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Import Mode
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex items-start p-3 rounded-xl border cursor-pointer transition ${
                      mode === 'merge'
                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 dark:border-sky-800'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={mode === 'merge'}
                      onChange={() => setMode('merge')}
                      className="mt-0.5 text-sky-600"
                    />
                    <div className="ml-3">
                      <span className="block text-xs font-semibold text-slate-900 dark:text-white">
                        Merge with existing data (Recommended)
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Adds new properties and records from the backup without deleting what you already have. Duplicates will be safely skipped.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start p-3 rounded-xl border cursor-pointer transition ${
                      mode === 'replace'
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/40 dark:border-rose-800'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={mode === 'replace'}
                      onChange={() => setMode('replace')}
                      className="mt-0.5 text-rose-600"
                    />
                    <div className="ml-3">
                      <span className="block text-xs font-semibold text-rose-700 dark:text-rose-400">
                        Replace all existing data
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Clears your current database and restores exactly what is inside this backup file.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!file || loading}
                  onClick={handleImport}
                  className="inline-flex items-center px-5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition disabled:opacity-50"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  {loading ? 'Restoring Backup...' : 'Import Backup'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
