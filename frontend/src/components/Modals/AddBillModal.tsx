import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { UtilityType, TariffPlan } from '../../types';
import { 
  Plus, 
  X, 
  Zap, 
  Flame, 
  Droplets, 
  AlertCircle, 
  Calculator, 
  Landmark, 
  Wifi, 
  ShieldCheck, 
  Repeat, 
  Calendar, 
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'single' | 'recurring';
  initialUtilityType?: UtilityType;
}

const formatLocalDate = (year: number, month: number, day: number): string => {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};

export const AddBillModal: React.FC<AddBillModalProps> = ({ 
  isOpen, 
  onClose,
  initialMode = 'single',
  initialUtilityType = 'ELECTRICITY'
}) => {
  const { properties, triggerRefresh } = useApp();

  // Mode: Single statement vs Recurring contract
  const [entryMode, setEntryMode] = useState<'single' | 'recurring'>(initialMode);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [utilityType, setUtilityType] = useState<UtilityType>(initialUtilityType);

  // Single bill state
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
  const [usageCost, setUsageCost] = useState<string>('');
  const [standingChargeCost, setStandingChargeCost] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');

  // Recurring contract state
  const [contractName, setContractName] = useState<string>('');
  const [contractStartDate, setContractStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [durationPreset, setDurationPreset] = useState<10 | 12 | 18 | 24 | 'custom'>(12);
  const [customDuration, setCustomDuration] = useState<string>('12');
  const [monthlyAmount, setMonthlyAmount] = useState<string>('');
  const [createTariffPlan, setCreateTariffPlan] = useState<boolean>(true);
  const [skipExisting, setSkipExisting] = useState<boolean>(true);
  const [showSchedulePreview, setShowSchedulePreview] = useState<boolean>(false);

  // Common state
  const [tariffs, setTariffs] = useState<TariffPlan[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize selected property defaulting to last record
  useEffect(() => {
    if (!isOpen || properties.length === 0) return;

    if (initialMode) setEntryMode(initialMode);
    if (initialUtilityType) setUtilityType(initialUtilityType);
    setError(null);
    setSuccessMessage(null);

    const initProperty = async () => {
      let defaultId = localStorage.getItem('last_bill_property_id');
      if (!defaultId || !properties.some(p => p.id === defaultId)) {
        try {
          const recentBills = await api.getBills();
          if (recentBills.length > 0 && recentBills[0].property_id && properties.some(p => p.id === recentBills[0].property_id)) {
            defaultId = recentBills[0].property_id;
          }
        } catch (e) {
          // Fallback to first property
        }
      }
      if (!defaultId || !properties.some(p => p.id === defaultId)) {
        defaultId = properties[0]?.id || '';
      }
      setSelectedPropertyId(defaultId);
    };

    initProperty();
  }, [isOpen, properties, initialMode, initialUtilityType]);

  useEffect(() => {
    if (isOpen && selectedPropertyId) {
      api.getTariffs(selectedPropertyId).then(setTariffs).catch(console.error);
    }
  }, [isOpen, selectedPropertyId]);

  if (!isOpen) return null;

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId) || properties[0];
  const curr = selectedProperty?.currency_symbol || '£';
  const isMetered = utilityType === 'ELECTRICITY' || utilityType === 'GAS' || utilityType === 'WATER';
  const activeTariff = tariffs.find((t) => t.utility_type === utilityType && t.is_active);

  const activeDurationMonths = durationPreset === 'custom' 
    ? (parseInt(customDuration, 10) || 12) 
    : durationPreset;

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

    // Smart duration default based on utility type
    if (type === 'COUNCIL_TAX' && durationPreset !== 'custom') {
      setDurationPreset(10);
    } else if (type === 'BROADBAND' && durationPreset === 10) {
      setDurationPreset(18);
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

  // Generate schedule preview
  const getSchedulePreview = () => {
    if (!contractStartDate || activeDurationMonths <= 0) return [];
    const [y, m, d] = contractStartDate.split('-').map(Number);
    const schedule: { monthIndex: number; label: string; start: string; end: string }[] = [];

    for (let i = 0; i < activeDurationMonths; i++) {
      const targetMonth = (m - 1) + i;
      const curYear = y + Math.floor(targetMonth / 12);
      const curMonth = ((targetMonth % 12) + 12) % 12;

      let pStartStr = '';
      let pEndStr = '';

      if (d === 1) {
        const lastDay = new Date(curYear, curMonth + 1, 0).getDate();
        pStartStr = formatLocalDate(curYear, curMonth, 1);
        pEndStr = formatLocalDate(curYear, curMonth, lastDay);
      } else {
        const startDateObj = new Date(curYear, curMonth, d);
        const nextMonthDate = new Date(curYear, curMonth + 1, d);
        nextMonthDate.setDate(nextMonthDate.getDate() - 1);
        pStartStr = formatLocalDate(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
        pEndStr = formatLocalDate(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), nextMonthDate.getDate());
      }

      const dateObj = new Date(curYear, curMonth, 1);
      const monthLabel = dateObj.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
      schedule.push({
        monthIndex: i + 1,
        label: monthLabel,
        start: pStartStr,
        end: pEndStr,
      });
    }
    return schedule;
  };

  const schedulePreview = getSchedulePreview();
  const contractEndDate = schedulePreview.length > 0 ? schedulePreview[schedulePreview.length - 1].end : '';
  const parsedMonthlyAmt = parseFloat(monthlyAmount) || 0;
  const totalContractCost = (parsedMonthlyAmt * activeDurationMonths).toFixed(2);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) {
      setError('Please select a property.');
      return;
    }
    if (isMetered && (!totalUnits || parseFloat(totalUnits) <= 0)) {
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

      await api.createBill({
        property_id: selectedPropertyId,
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
        source: 'MANUAL',
      });

      localStorage.setItem('last_bill_property_id', selectedPropertyId);
      triggerRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save bill');
    } finally {
      setLoading(false);
    }
  };

  const handleRecurringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) {
      setError('Please select a property.');
      return;
    }
    if (parsedMonthlyAmt <= 0) {
      setError('Please enter a valid monthly bill amount greater than 0.');
      return;
    }
    if (activeDurationMonths <= 0) {
      setError('Please enter a valid contract duration in months.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createRecurringContractBills({
        property_id: selectedPropertyId,
        utility_type: utilityType,
        contract_name: contractName.trim() || undefined,
        start_date: contractStartDate,
        duration_months: activeDurationMonths,
        monthly_amount: parsedMonthlyAmt,
        notes: notes.trim() || undefined,
        create_tariff_plan: createTariffPlan,
        skip_existing: skipExisting,
      });

      localStorage.setItem('last_bill_property_id', selectedPropertyId);
      triggerRefresh();
      setSuccessMessage(res.message);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to generate recurring contract bills');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              {entryMode === 'recurring' ? <Repeat className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {entryMode === 'recurring' ? 'Recurring Contract Bills' : 'Record Utility Bill'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {entryMode === 'recurring' 
                  ? 'Input fixed repeating contract amount once to generate all months' 
                  : `Log monthly bill or statement ${selectedProperty ? `for ${selectedProperty.name}` : ''}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-6 pt-2">
          <button
            type="button"
            onClick={() => { setEntryMode('single'); setError(null); }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              entryMode === 'single'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Single Statement
          </button>
          <button
            type="button"
            onClick={() => { setEntryMode('recurring'); setError(null); }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition ${
              entryMode === 'recurring'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Recurring Contract (Input Once)</span>
          </button>
        </div>

        {/* Form Body Container */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {successMessage}
            </div>
          )}

          {/* Prompt in Single mode for fixed utilities */}
          {entryMode === 'single' && !isMetered && (
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 text-xs text-sky-800 dark:text-sky-300 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Repeat className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                <span>Repeating contract amount? You can input it once across all months.</span>
              </div>
              <button
                type="button"
                onClick={() => setEntryMode('recurring')}
                className="px-2.5 py-1 text-[11px] font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-sm transition whitespace-nowrap ml-2"
              >
                Use Recurring
              </button>
            </div>
          )}

          {/* Property Selection */}
          {properties.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Property *
              </label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.address ? `(${p.address})` : ''}
                  </option>
                ))}
              </select>
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

          {/* ======================================================== */}
          {/* RECURRING CONTRACT MODE FIELDS */}
          {/* ======================================================== */}
          {entryMode === 'recurring' ? (
            <form id="recurring-bill-form" onSubmit={handleRecurringSubmit} className="space-y-4">
              {/* Contract Plan Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contract / Provider Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder={
                    utilityType === 'BROADBAND'
                      ? 'e.g. BT Full Fibre 300'
                      : utilityType === 'COUNCIL_TAX'
                      ? 'e.g. Bristol Band D Council Tax'
                      : utilityType === 'ESTATE_SERVICE_CHARGE'
                      ? 'e.g. Estate Management Annual Fee'
                      : 'e.g. Fixed Energy Contract'
                  }
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white"
                />
              </div>

              {/* Contract Start Date */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Contract Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={contractStartDate}
                    onChange={(e) => setContractStartDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Calculated End Date
                  </label>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-700 dark:text-slate-300 font-medium">
                    {contractEndDate || '-'}
                  </div>
                </div>
              </div>

              {/* Duration Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Contract Duration
                </label>
                <div className="grid grid-cols-5 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setDurationPreset(12)}
                    className={`py-1.5 px-2 rounded-lg font-medium border text-center transition ${
                      durationPreset === 12
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    12 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationPreset(18)}
                    className={`py-1.5 px-2 rounded-lg font-medium border text-center transition ${
                      durationPreset === 18
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    18 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationPreset(24)}
                    className={`py-1.5 px-2 rounded-lg font-medium border text-center transition ${
                      durationPreset === 24
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    24 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationPreset(10)}
                    title="Standard UK Council Tax 10-month installment scheme"
                    className={`py-1.5 px-2 rounded-lg font-medium border text-center transition ${
                      durationPreset === 10
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    10m (Tax)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationPreset('custom')}
                    className={`py-1.5 px-2 rounded-lg font-medium border text-center transition ${
                      durationPreset === 'custom'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {durationPreset === 'custom' && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs text-slate-500">Number of monthly statements:</span>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      className="w-20 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-center font-bold"
                    />
                    <span className="text-xs text-slate-500">months</span>
                  </div>
                )}
              </div>

              {/* Monthly Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Repeating Monthly Bill Amount ({curr}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">{curr}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 35.99"
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(e.target.value)}
                    className="w-full text-sm font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 pl-8 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-medium text-slate-400">/ month</span>
                </div>
              </div>

              {/* Summary & Live Schedule Preview Card */}
              <div className="p-3.5 rounded-xl border border-sky-100 dark:border-sky-900/60 bg-sky-50/60 dark:bg-sky-950/30 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-sky-800 dark:text-sky-300 font-semibold">
                    <Calendar className="w-4 h-4 text-sky-500" />
                    <span>
                      {activeDurationMonths} monthly statements • Total: {curr}{totalContractCost}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSchedulePreview(!showSchedulePreview)}
                    className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center"
                  >
                    <span>{showSchedulePreview ? 'Hide schedule' : 'View schedule'}</span>
                    {showSchedulePreview ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {schedulePreview.length > 0
                    ? `From ${schedulePreview[0].label} (${schedulePreview[0].start}) through ${schedulePreview[schedulePreview.length - 1].label} (${schedulePreview[schedulePreview.length - 1].end})`
                    : ''}
                </p>

                {/* Collapsible Month Schedule */}
                {showSchedulePreview && (
                  <div className="mt-2 pt-2 border-t border-sky-200/60 dark:border-sky-800/60 max-h-36 overflow-y-auto space-y-1 pr-1">
                    {schedulePreview.map((item) => (
                      <div
                        key={item.monthIndex}
                        className="flex items-center justify-between py-1 px-2 rounded bg-white/70 dark:bg-slate-900/60 text-[11px]"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {item.monthIndex}. {item.label} ({item.start} → {item.end})
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {curr}{parsedMonthlyAmt > 0 ? parsedMonthlyAmt.toFixed(2) : '0.00'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createTariffPlan}
                    onChange={(e) => setCreateTariffPlan(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                  />
                  <span>Create / update active tariff plan for this contract</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipExisting}
                    onChange={(e) => setSkipExisting(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                  />
                  <span>Skip months that already have a bill recorded (prevent duplicates)</span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Contract Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 18-month fixed direct debit agreement"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>
            </form>
          ) : (
            /* ======================================================== */
            /* SINGLE STATEMENT MODE FIELDS */
            /* ======================================================== */
            <form id="single-bill-form" onSubmit={handleSingleSubmit} className="space-y-4">
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
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
                      className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 pr-14 text-slate-900 dark:text-white"
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

              {/* Cost Breakdown */}
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
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-lg transition"
          >
            Cancel
          </button>
          {entryMode === 'recurring' ? (
            <button
              type="submit"
              form="recurring-bill-form"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>{loading ? 'Generating...' : `Generate ${activeDurationMonths} Contract Bills`}</span>
            </button>
          ) : (
            <button
              type="submit"
              form="single-bill-form"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Bill'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
