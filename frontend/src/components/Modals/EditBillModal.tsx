import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { BillRecord, UtilityType, TariffPlan } from '../../types';
import { Pencil, X, Zap, Flame, Droplets, AlertCircle, Calculator, Landmark, Wifi, ShieldCheck } from 'lucide-react';

interface EditBillModalProps {
  bill: BillRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditBillModal: React.FC<EditBillModalProps> = ({ bill, isOpen, onClose }) => {
  const { properties, triggerRefresh } = useApp();

  const [utilityType, setUtilityType] = useState<UtilityType>('ELECTRICITY');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [totalUnits, setTotalUnits] = useState<string>('');
  const [gasUnitType, setGasUnitType] = useState<'KWH' | 'M3'>('KWH');
  const [usageCost, setUsageCost] = useState<string>('');
  const [standingChargeCost, setStandingChargeCost] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');
  const [tariffs, setTariffs] = useState<TariffPlan[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && bill?.property_id) {
      api.getTariffs(bill.property_id).then(setTariffs).catch(console.error);
    }
  }, [isOpen, bill?.property_id]);

  useEffect(() => {
    if (bill) {
      setUtilityType(bill.utility_type);
      setPeriodStart(bill.period_start);
      setPeriodEnd(bill.period_end);
      setTotalUnits(bill.total_units != null ? bill.total_units.toString() : '0');
      setGasUnitType(bill.raw_unit_type === 'M3' ? 'M3' : 'KWH');
      
      const sc = bill.standing_charge_cost != null ? bill.standing_charge_cost.toString() : '';
      const ur = bill.unit_rate_cost != null ? bill.unit_rate_cost.toString() : '';
      setStandingChargeCost(sc);
      setUsageCost(ur);
      setTotalCost(bill.total_cost != null ? bill.total_cost.toString() : '');
      setNotes(bill.notes || '');
      setError(null);
    }
  }, [bill]);

  if (!isOpen || !bill) return null;

  const billProp = properties.find((p) => p.id === bill.property_id);
  const curr = billProp?.currency_symbol || '£';
  const isMetered = utilityType === 'ELECTRICITY' || utilityType === 'GAS' || utilityType === 'WATER';
  const activeTariff = tariffs.find((t) => t.utility_type === utilityType && t.is_active);

  const handleUtilitySelect = (type: UtilityType) => {
    setUtilityType(type);
    const metered = type === 'ELECTRICITY' || type === 'GAS' || type === 'WATER';
    if (!metered) {
      setUsageCost('');
      setStandingChargeCost('');
    } else {
      const u = parseFloat(usageCost) || 0;
      const s = parseFloat(standingChargeCost) || 0;
      setTotalCost(u > 0 || s > 0 ? (u + s).toFixed(2) : '');
    }
  };

  const handleAutoFillFromTariff = () => {
    if (!activeTariff || !isMetered) return;
    const start = new Date(periodStart).getTime();
    const end = new Date(periodEnd).getTime();
    const days = Math.max(1, Math.round((end - start) / (1000 * 3600 * 24)));
    const vatMult = 1.0 + (activeTariff.vat_rate || 0.05);

    const scVal = Math.round(days * activeTariff.standing_charge * vatMult * 100) / 100;
    setStandingChargeCost(scVal.toFixed(2));

    if (activeTariff.unit_rate != null) {
      const units = parseFloat(totalUnits) || 0;
      const urVal = Math.round(units * activeTariff.unit_rate * vatMult * 100) / 100;
      setUsageCost(urVal.toFixed(2));
      setTotalCost((scVal + urVal).toFixed(2));
    }
  };

  const handleUsageCostChange = (val: string) => {
    setUsageCost(val);
    const u = parseFloat(val) || 0;
    const s = parseFloat(standingChargeCost) || 0;
    setTotalCost((u + s).toFixed(2));
  };

  const handleStandingChargeChange = (val: string) => {
    setStandingChargeCost(val);
    const u = parseFloat(usageCost) || 0;
    const s = parseFloat(val) || 0;
    setTotalCost((u + s).toFixed(2));
  };

  const handleTotalCostChange = (val: string) => {
    setTotalCost(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMetered && (!totalUnits || parseFloat(totalUnits) < 0)) {
      setError('Please enter valid consumption units.');
      return;
    }

    const scNum = isMetered && standingChargeCost !== '' ? parseFloat(standingChargeCost) : undefined;
    const urNum = isMetered && usageCost !== '' ? parseFloat(usageCost) : undefined;
    let costNum = 0.0;

    if (isMetered) {
      costNum = Math.round(((urNum || 0) + (scNum || 0)) * 100) / 100;
      if (costNum <= 0) {
        setError('Please enter usage cost and standing charge.');
        return;
      }
    } else {
      costNum = totalCost !== '' ? parseFloat(totalCost) : 0.0;
      if (costNum <= 0) {
        setError('Please enter a valid bill amount.');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const unitsNum = isMetered ? parseFloat(totalUnits) : (parseFloat(totalUnits) || 0.0);

      await api.updateBill(bill.id, {
        utility_type: utilityType,
        period_start: periodStart,
        period_end: periodEnd,
        total_units: unitsNum,
        raw_meter_units: utilityType === 'GAS' && gasUnitType === 'M3' ? unitsNum : undefined,
        raw_unit_type: utilityType === 'GAS' && gasUnitType === 'M3' ? 'M3' : undefined,
        total_cost: costNum,
        standing_charge_cost: scNum,
        unit_rate_cost: urNum,
        notes: notes.trim() || undefined,
      });

      triggerRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update bill');
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Utility Bill Record</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update billing period, consumption or cost breakdown
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
                onClick={() => handleUtilitySelect('ELECTRICITY')}
                className={`flex items-center justify-center py-2 px-2.5 rounded-lg text-xs font-medium border transition ${
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
                onClick={() => handleUtilitySelect('GAS')}
                className={`flex items-center justify-center py-2 px-2.5 rounded-lg text-xs font-medium border transition ${
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
                onClick={() => handleUtilitySelect('WATER')}
                className={`flex items-center justify-center py-2 px-2.5 rounded-lg text-xs font-medium border transition ${
                  utilityType === 'WATER'
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Droplets className="w-3.5 h-3.5 mr-1 text-cyan-500" />
                Water
              </button>

              <button
                type="button"
                onClick={() => handleUtilitySelect('COUNCIL_TAX')}
                className={`flex items-center justify-center py-2 px-2.5 rounded-lg text-xs font-medium border transition ${
                  utilityType === 'COUNCIL_TAX'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Landmark className="w-3.5 h-3.5 mr-1 text-purple-500" />
                Council Tax
              </button>

              <button
                type="button"
                onClick={() => handleUtilitySelect('BROADBAND')}
                className={`flex items-center justify-center py-2 px-2.5 rounded-lg text-xs font-medium border transition ${
                  utilityType === 'BROADBAND'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Wifi className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                Broadband
              </button>

              <button
                type="button"
                onClick={() => handleUtilitySelect('ESTATE_SERVICE_CHARGE')}
                className={`flex items-center justify-center py-2 px-2.5 rounded-lg text-xs font-medium border transition ${
                  utilityType === 'ESTATE_SERVICE_CHARGE'
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-pink-500" />
                Service Charge
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

          {/* Consumption Amount & Units (Only for metered utilities) */}
          {isMetered ? (
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
          ) : (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Fixed periodic charge • metered consumption not required</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Flat rate</span>
            </div>
          )}

          {/* Cost Breakdown (Separating UK Standing Charge) */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Cost Breakdown
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isMetered 
                    ? 'Enter unit rate and standing charge; total is calculated automatically'
                    : 'Fixed services use total billed amount only'}
                </p>
              </div>
              {activeTariff && isMetered && (
                <button
                  type="button"
                  onClick={handleAutoFillFromTariff}
                  className="flex items-center space-x-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 px-2 py-1 rounded-md border border-sky-200 dark:border-sky-800 transition"
                  title="Auto-calculate standing charge and unit rate from active tariff plan"
                >
                  <Calculator className="w-3 h-3" />
                  <span>Auto-fill from Tariff</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Usage / Unit Cost ({curr})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-medium text-slate-400">{curr}</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={!isMetered}
                    readOnly={!isMetered}
                    value={isMetered ? usageCost : ''}
                    onChange={(e) => handleUsageCostChange(e.target.value)}
                    className={`w-full text-xs border rounded-lg p-2 pl-7 ${
                      isMetered
                        ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-sky-500'
                        : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Standing Charge ({curr})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-medium text-slate-400">{curr}</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={!isMetered}
                    readOnly={!isMetered}
                    value={isMetered ? standingChargeCost : ''}
                    onChange={(e) => handleStandingChargeChange(e.target.value)}
                    className={`w-full text-xs border rounded-lg p-2 pl-7 ${
                      isMetered
                        ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-amber-700 dark:text-amber-400 focus:ring-1 focus:ring-amber-500'
                        : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Total Billed Cost */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Total Billed Amount ({curr})
                </label>
                <span className="text-[10px] text-slate-400">
                  {isMetered 
                    ? 'Calculated automatically: Usage Cost + Standing Charge' 
                    : 'Enter statement bill amount'}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">{curr}</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  readOnly={isMetered}
                  value={totalCost}
                  onChange={(e) => handleTotalCostChange(e.target.value)}
                  className={`w-full text-sm font-semibold border rounded-lg p-2.5 pl-8 ${
                    isMetered
                      ? 'bg-slate-100 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-not-allowed'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500'
                  }`}
                />
              </div>
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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
