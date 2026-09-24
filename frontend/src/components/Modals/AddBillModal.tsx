import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { UtilityType } from '../../types';
import { Plus, X, Zap, Flame, Droplets, AlertCircle } from 'lucide-react';

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBillModal: React.FC<AddBillModalProps> = ({ isOpen, onClose }) => {
  const { currentProperty, triggerRefresh } = useApp();

  const [utilityType, setUtilityType] = useState<UtilityType>('ELECTRICITY');
  const [periodStart, setPeriodStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [totalUnits, setTotalUnits] = useState<string>('');
  const [gasUnitType, setGasUnitType] = useState<'KWH' | 'M3'>('KWH');
  const [totalCost, setTotalCost] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const curr = currentProperty?.currency_symbol || '£';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProperty) return;
    if (!totalUnits || parseFloat(totalUnits) <= 0) {
      setError('Please enter valid consumption units.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const unitsNum = parseFloat(totalUnits);
      const costNum = totalCost ? parseFloat(totalCost) : 0.0;

      await api.createBill({
        property_id: currentProperty.id,
        utility_type: utilityType,
        period_start: periodStart,
        period_end: periodEnd,
        total_units: unitsNum,
        raw_meter_units: utilityType === 'GAS' && gasUnitType === 'M3' ? unitsNum : undefined,
        raw_unit_type: utilityType === 'GAS' && gasUnitType === 'M3' ? 'M3' : undefined,
        total_cost: costNum,
        notes: notes.trim() || undefined,
        source: 'MANUAL',
      });

      triggerRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save bill');
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
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Utility Bill</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log monthly bill or statement for {currentProperty?.name}
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
                onClick={() => setUtilityType('ELECTRICITY')}
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
                onClick={() => setUtilityType('GAS')}
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
                onClick={() => setUtilityType('WATER')}
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

          {/* Billing Period Dates */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-300 mb-1">
                Period Start
              </label>
              <input
                type="date"
                required
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-300 mb-1">
                Period End
              </label>
              <input
                type="date"
                required
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
              />
            </div>
          </div>

          {/* Consumption Amount & Units */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Consumption Amount
              </label>
              {utilityType === 'GAS' && (
                <div className="flex items-center space-x-1 text-[11px]">
                  <span className="text-slate-400">Meter unit:</span>
                  <button
                    type="button"
                    onClick={() => setGasUnitType('KWH')}
                    className={`px-1.5 py-0.5 rounded ${gasUnitType === 'KWH' ? 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-bold' : 'text-slate-500'}`}
                  >
                    kWh
                  </button>
                  <button
                    type="button"
                    onClick={() => setGasUnitType('M3')}
                    className={`px-1.5 py-0.5 rounded ${gasUnitType === 'M3' ? 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-bold' : 'text-slate-500'}`}
                  >
                    m³
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                placeholder={utilityType === 'WATER' ? 'e.g. 9.5' : 'e.g. 320'}
                value={totalUnits}
                onChange={(e) => setTotalUnits(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 pr-14"
              />
              <span className="absolute right-3 top-2.5 text-xs font-medium text-slate-400">
                {utilityType === 'WATER' ? 'm³' : (utilityType === 'GAS' && gasUnitType === 'M3' ? 'm³' : 'kWh')}
              </span>
            </div>
            {utilityType === 'GAS' && gasUnitType === 'M3' && totalUnits && (
              <p className="text-[11px] text-sky-600 dark:text-sky-400">
                ≈ {Math.round(parseFloat(totalUnits) * 11.36)} kWh standard calorific energy
              </p>
            )}
          </div>

          {/* Billed Cost (£) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                Total Billed Amount ({curr})
              </label>
              <span className="text-[11px] text-slate-400">
                Optional: leave blank to auto-calculate from active tariff
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-medium text-slate-400">{curr}</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 pl-8"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. British Gas monthly direct debit statement"
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
              {loading ? 'Saving...' : 'Save Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
