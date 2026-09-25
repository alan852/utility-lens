import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { MeterReading, UtilityType } from '../../types';
import { Pencil, X, Zap, Flame, Droplets, AlertCircle } from 'lucide-react';

interface EditMeterReadingModalProps {
  reading: MeterReading | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditMeterReadingModal: React.FC<EditMeterReadingModalProps> = ({
  reading,
  isOpen,
  onClose,
}) => {
  const { triggerRefresh } = useApp();

  const [utilityType, setUtilityType] = useState<UtilityType>('ELECTRICITY');
  const [readingDate, setReadingDate] = useState<string>('');
  const [meterIndex, setMeterIndex] = useState<string>('');
  const [meterUnit, setMeterUnit] = useState<string>('KWH');
  const [readingType, setReadingType] = useState<string>('ACTUAL');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reading) {
      setUtilityType(reading.utility_type);
      setReadingDate(reading.reading_date);
      setMeterIndex(reading.meter_index.toString());
      setMeterUnit(reading.meter_unit);
      setReadingType(reading.reading_type);
      setNotes(reading.notes || '');
      setError(null);
    }
  }, [reading]);

  if (!isOpen || !reading) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meterIndex || isNaN(parseFloat(meterIndex))) {
      setError('Please enter a valid meter register index.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.updateMeterReading(reading.id, {
        utility_type: utilityType,
        reading_date: readingDate,
        meter_index: parseFloat(meterIndex),
        meter_unit: meterUnit,
        reading_type: readingType,
        notes: notes.trim() || undefined,
      });

      triggerRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update meter reading');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Meter Reading</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update reading details or notes
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
              Utility Type
            </label>
            <div className="grid grid-cols-3 gap-2">
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
                Electricity
              </button>

              <button
                type="button"
                onClick={() => { setUtilityType('GAS'); }}
                className={`flex items-center justify-center py-2 px-3 rounded-lg text-xs font-medium border transition ${
                  utilityType === 'GAS'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Flame className="w-3.5 h-3.5 mr-1 text-rose-500" />
                Gas
              </button>

              <button
                type="button"
                onClick={() => { setUtilityType('WATER'); setMeterUnit('M3'); }}
                className={`flex items-center justify-center py-2 px-3 rounded-lg text-xs font-medium border transition ${
                  utilityType === 'WATER'
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Droplets className="w-3.5 h-3.5 mr-1 text-cyan-500" />
                Water
              </button>
            </div>
          </div>

          {/* Reading Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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

          {/* Meter Register Index & Unit */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Meter Index
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={meterIndex}
                onChange={(e) => setMeterIndex(e.target.value)}
                className="w-full text-sm font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit
              </label>
              <select
                value={meterUnit}
                onChange={(e) => setMeterUnit(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5"
              >
                <option value="KWH">kWh</option>
                <option value="M3">m³</option>
              </select>
            </div>
          </div>

          {/* Reading Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reading Type
            </label>
            <select
              value={readingType}
              onChange={(e) => setReadingType(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
            >
              <option value="ACTUAL">Actual (Physical Read)</option>
              <option value="ESTIMATED">Estimated</option>
              <option value="SMART_METER">Smart Meter Automated</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Photo taken on phone"
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
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
