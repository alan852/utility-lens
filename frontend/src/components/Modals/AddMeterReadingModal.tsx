import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { UtilityType } from '../../types';
import { Gauge, X, Zap, Flame, AlertCircle } from 'lucide-react';

interface AddMeterReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddMeterReadingModal: React.FC<AddMeterReadingModalProps> = ({ isOpen, onClose }) => {
  const { currentProperty, triggerRefresh } = useApp();

  const [utilityType, setUtilityType] = useState<UtilityType>('ELECTRICITY');
  const [readingDate, setReadingDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [meterIndex, setMeterIndex] = useState<string>('');
  const [meterUnit, setMeterUnit] = useState<string>('KWH');
  const [readingType, setReadingType] = useState<string>('ACTUAL');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProperty) return;
    if (!meterIndex || parseFloat(meterIndex) < 0) {
      setError('Please enter a valid cumulative meter reading index.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.createMeterReading({
        property_id: currentProperty.id,
        utility_type: utilityType,
        reading_date: readingDate,
        meter_index: parseFloat(meterIndex),
        meter_unit: utilityType === 'GAS' ? meterUnit : 'KWH',
        reading_type: readingType,
        notes: notes.trim() || undefined,
      });

      triggerRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save meter reading');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Meter Reading</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log cumulative register value for {currentProperty?.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Utility Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Meter Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setUtilityType('ELECTRICITY'); setMeterUnit('KWH'); }}
                className={`flex items-center justify-center py-2 px-3 rounded-lg text-xs font-medium border transition ${
                  utilityType === 'ELECTRICITY'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
                Electricity Meter
              </button>

              <button
                type="button"
                onClick={() => { setUtilityType('GAS'); setMeterUnit('M3'); }}
                className={`flex items-center justify-center py-2 px-3 rounded-lg text-xs font-medium border transition ${
                  utilityType === 'GAS'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Flame className="w-3.5 h-3.5 mr-1 text-rose-500" />
                Gas Meter
              </button>
            </div>
          </div>

          {/* Reading Date */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Reading Date
            </label>
            <input
              type="date"
              required
              value={readingDate}
              onChange={(e) => setReadingDate(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
            />
          </div>

          {/* Meter Index & Unit */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Cumulative Reading Counter
              </label>
              {utilityType === 'GAS' && (
                <div className="flex items-center space-x-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setMeterUnit('M3')}
                    className={`px-1.5 py-0.5 rounded ${meterUnit === 'M3' ? 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-bold' : 'text-slate-500'}`}
                  >
                    m³
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeterUnit('KWH')}
                    className={`px-1.5 py-0.5 rounded ${meterUnit === 'KWH' ? 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-bold' : 'text-slate-500'}`}
                  >
                    kWh
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g. 14502.5"
                value={meterIndex}
                onChange={(e) => setMeterIndex(e.target.value)}
                className="w-full text-sm font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 pr-14"
              />
              <span className="absolute right-3 top-2.5 text-xs font-medium text-slate-400">
                {utilityType === 'GAS' ? meterUnit : 'kWh'}
              </span>
            </div>
          </div>

          {/* Reading Type */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Reading Source / Method
            </label>
            <select
              value={readingType}
              onChange={(e) => setReadingType(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
            >
              <option value="ACTUAL">Manual Physical Reading</option>
              <option value="SMART">Smart Meter Export / Screen</option>
              <option value="ESTIMATED">Supplier Estimate</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. End of quarter reading"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Reading'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
