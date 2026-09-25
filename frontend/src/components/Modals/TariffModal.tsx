import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { TariffPlan, UtilityType } from '../../types';
import { Calculator, X, Plus, Trash2, Pencil, Zap, Flame, Droplets, AlertCircle, Landmark, Wifi, ShieldCheck } from 'lucide-react';

interface TariffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TariffModal: React.FC<TariffModalProps> = ({ isOpen, onClose }) => {
  const { currentProperty, triggerRefresh } = useApp();
  const [tariffs, setTariffs] = useState<TariffPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingTariff, setEditingTariff] = useState<TariffPlan | null>(null);

  // Form state
  const [utilityType, setUtilityType] = useState<UtilityType>('ELECTRICITY');
  const [name, setName] = useState<string>('');
  const [unitRate, setUnitRate] = useState<string>('0.245');
  const [standingCharge, setStandingCharge] = useState<string>('0.55');
  const [validFrom, setValidFrom] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setUnitRate('');
    setStandingCharge('0.55');
    setValidFrom(new Date().toISOString().split('T')[0]);
    setUtilityType('ELECTRICITY');
    setEditingTariff(null);
    setShowAddForm(false);
    setError(null);
  };

  const handleStartEdit = (t: TariffPlan) => {
    setEditingTariff(t);
    setUtilityType(t.utility_type);
    setName(t.name);
    setUnitRate(t.unit_rate != null ? t.unit_rate.toString() : '');
    setStandingCharge(t.standing_charge.toString());
    setValidFrom(t.valid_from);
    setShowAddForm(true);
    setError(null);
  };

  const loadTariffs = async () => {
    if (!currentProperty) return;
    setLoading(true);
    try {
      const data = await api.getTariffs(currentProperty.id);
      setTariffs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTariffs();
    }
  }, [isOpen, currentProperty]);

  if (!isOpen) return null;

  const curr = currentProperty?.currency_symbol || '£';

  const getVatForUtility = (util: UtilityType) => {
    if (util === 'WATER' || util === 'COUNCIL_TAX' || util === 'ESTATE_SERVICE_CHARGE') return 0.0;
    if (util === 'BROADBAND') return 0.20;
    return 0.05;
  };

  const handleSaveTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProperty || !name.trim()) return;

    const parsedUnitRate = unitRate.trim() !== '' ? parseFloat(unitRate) : null;
    if (parsedUnitRate !== null && (isNaN(parsedUnitRate) || parsedUnitRate < 0)) {
      setError('Unit rate must be a valid positive number or left blank');
      return;
    }

    try {
      if (editingTariff) {
        await api.updateTariff(editingTariff.id, {
          utility_type: utilityType,
          name: name.trim(),
          valid_from: validFrom,
          unit_rate: parsedUnitRate,
          standing_charge: parseFloat(standingCharge) || 0.0,
          vat_rate: getVatForUtility(utilityType),
        });
      } else {
        await api.createTariff({
          property_id: currentProperty.id,
          utility_type: utilityType,
          name: name.trim(),
          valid_from: validFrom,
          unit_rate: parsedUnitRate,
          standing_charge: parseFloat(standingCharge) || 0.0,
          vat_rate: getVatForUtility(utilityType),
          is_active: true,
        });
      }

      resetForm();
      loadTariffs();
      triggerRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save tariff');
    }
  };

  const handleDeleteTariff = async (id: string) => {
    if (confirm('Delete this tariff plan?')) {
      try {
        await api.deleteTariff(id);
        if (editingTariff?.id === id) {
          resetForm();
        }
        loadTariffs();
        triggerRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const renderTariffIcon = (uType: UtilityType) => {
    switch (uType) {
      case 'ELECTRICITY':
        return <div className="p-2 rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-950/60"><Zap className="w-4 h-4" /></div>;
      case 'GAS':
        return <div className="p-2 rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-950/60"><Flame className="w-4 h-4" /></div>;
      case 'WATER':
        return <div className="p-2 rounded-lg bg-cyan-50 text-cyan-500 dark:bg-cyan-950/60"><Droplets className="w-4 h-4" /></div>;
      case 'COUNCIL_TAX':
        return <div className="p-2 rounded-lg bg-purple-50 text-purple-500 dark:bg-purple-950/60"><Landmark className="w-4 h-4" /></div>;
      case 'BROADBAND':
        return <div className="p-2 rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-950/60"><Wifi className="w-4 h-4" /></div>;
      case 'ESTATE_SERVICE_CHARGE':
        return <div className="p-2 rounded-lg bg-pink-50 text-pink-500 dark:bg-pink-950/60"><ShieldCheck className="w-4 h-4" /></div>;
      default:
        return <div className="p-2 rounded-lg bg-slate-100 text-slate-500"><Zap className="w-4 h-4" /></div>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Tariffs & Unit Rates</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Active utility plans and rates for {currentProperty?.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Existing Tariffs List */}
          <div className="space-y-3">
            {tariffs.map((t) => {
              const isElec = t.utility_type === 'ELECTRICITY';
              const isGas = t.utility_type === 'GAS';
              const isWater = t.utility_type === 'WATER';
              return (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-750 transition"
                >
                  <div className="flex items-center space-x-3">
                    {renderTariffIcon(t.utility_type)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {t.utility_type}
                        </span>
                        {t.unit_rate == null && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                            Fixed / Subscription
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Rate: <strong>{t.unit_rate != null ? `${curr}${t.unit_rate}/${isGas || isElec ? 'kWh' : isWater ? 'm³' : 'unit'}` : 'Flat rate'}</strong> • Standing / Daily: <strong>{curr}{t.standing_charge}</strong>/day • Valid from: {t.valid_from}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleStartEdit(t)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/40 transition"
                      title="Edit tariff plan"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTariff(t.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Delete tariff plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {tariffs.length === 0 && !loading && (
              <p className="text-xs text-slate-400 text-center py-4">No active tariffs recorded for this property.</p>
            )}
          </div>

          {/* Add / Edit Tariff Accordion/Form */}
          {showAddForm ? (
            <form onSubmit={handleSaveTariff} className="p-4 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30 space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white">
                {editingTariff ? `Edit Tariff: ${editingTariff.name}` : 'Add New Tariff Plan'}
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">Utility</label>
                  <select
                    value={utilityType}
                    onChange={(e) => setUtilityType(e.target.value as UtilityType)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  >
                    <option value="ELECTRICITY">Electricity</option>
                    <option value="GAS">Gas</option>
                    <option value="WATER">Water</option>
                    <option value="COUNCIL_TAX">Council Tax</option>
                    <option value="BROADBAND">Broadband</option>
                    <option value="ESTATE_SERVICE_CHARGE">Estate Service Charge</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">Tariff Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Octopus Tracker 2025"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">
                    Unit Rate ({curr} / unit) <span className="text-slate-400 dark:text-slate-500 font-normal text-[10px]">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="e.g. 0.245 (leave blank if variable)"
                    value={unitRate}
                    onChange={(e) => setUnitRate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Leave blank if rate varies date-to-date (e.g. tracker tariffs).
                  </p>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">
                    Standing Charge ({curr} / day)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={standingCharge}
                    onChange={(e) => setStandingCharge(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">
                    Effective From Date
                  </label>
                  <input
                    type="date"
                    required
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-sm"
                >
                  {editingTariff ? 'Update Tariff' : 'Save Tariff'}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => { resetForm(); setShowAddForm(true); }}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-500 hover:text-sky-600 text-xs font-semibold flex items-center justify-center transition"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Another Tariff Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
