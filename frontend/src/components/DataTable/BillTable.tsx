import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { BillRecord } from '../../types';
import { Trash2, Pencil, Zap, Flame, Droplets, Filter, Landmark, Wifi, ShieldCheck } from 'lucide-react';
import { EditBillModal } from '../Modals/EditBillModal';

export const BillTable: React.FC = () => {
  const { currentProperty, refreshKey, triggerRefresh } = useApp();
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterUtil, setFilterUtil] = useState<string>('');
  const [editingBill, setEditingBill] = useState<BillRecord | null>(null);

  const loadBills = async () => {
    if (!currentProperty) return;
    setLoading(true);
    try {
      const data = await api.getBills(currentProperty.id, filterUtil || undefined);
      setBills(data);
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, [currentProperty, filterUtil, refreshKey]);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this bill record?')) {
      try {
        await api.deleteBill(id);
        triggerRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const curr = currentProperty?.currency_symbol || '£';

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Historical Bill Records</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {bills.length} statements recorded for {currentProperty?.name} • Standing charge separated for UK billing
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterUtil}
            onChange={(e) => setFilterUtil(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 focus:outline-none"
          >
            <option value="">All Utilities</option>
            <option value="ELECTRICITY">Electricity Only</option>
            <option value="GAS">Gas Only</option>
            <option value="WATER">Water Only</option>
            <option value="COUNCIL_TAX">Council Tax Only</option>
            <option value="BROADBAND">Broadband Only</option>
            <option value="ESTATE_SERVICE_CHARGE">Estate Service Charge Only</option>
          </select>
        </div>
      </div>

      {/* Table with Sticky Header and Scrollable Container */}
      <div className="overflow-x-auto max-h-[calc(100vh-14rem)] min-h-[360px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700/80 shadow-sm backdrop-blur">
            <tr>
              <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold">Utility</th>
              <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold">Billing Period</th>
              <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold">Consumption</th>
              <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold">Usage Cost</th>
              <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold text-amber-600 dark:text-amber-400">Standing Charge</th>
              <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold">Total Cost</th>
              <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold">Daily Average</th>
              <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold">Source</th>
              <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold">Notes</th>
              <th className="sticky top-0 right-0 z-20 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold text-right border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400">Loading records...</td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400">No bill records found. Use "Add Bill" or "Import CSV" to add data.</td>
              </tr>
            ) : (
              bills.map((b) => {
                const isElec = b.utility_type === 'ELECTRICITY';
                const isGas = b.utility_type === 'GAS';
                const isWater = b.utility_type === 'WATER';
                const isCouncilTax = b.utility_type === 'COUNCIL_TAX';
                const isBroadband = b.utility_type === 'BROADBAND';
                const isServiceCharge = b.utility_type === 'ESTATE_SERVICE_CHARGE';
                const days = Math.max(1, Math.round((new Date(b.period_end).getTime() - new Date(b.period_start).getTime()) / (1000 * 3600 * 24)));
                const dailyCost = (b.total_cost / days).toFixed(2);

                const hasStanding = b.standing_charge_cost != null;
                const standingCharge = b.standing_charge_cost ?? 0;
                const usageCost = b.unit_rate_cost != null ? b.unit_rate_cost : (hasStanding ? Math.max(0, b.total_cost - standingCharge) : b.total_cost);
                const standingPct = b.total_cost > 0 && hasStanding ? Math.round((standingCharge / b.total_cost) * 100) : 0;

                return (
                  <tr key={b.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 font-bold">
                        {isElec ? (
                          <Zap className="w-4 h-4 text-amber-500" />
                        ) : isGas ? (
                          <Flame className="w-4 h-4 text-rose-500" />
                        ) : isWater ? (
                          <Droplets className="w-4 h-4 text-cyan-500" />
                        ) : isCouncilTax ? (
                          <Landmark className="w-4 h-4 text-purple-500" />
                        ) : isBroadband ? (
                          <Wifi className="w-4 h-4 text-emerald-500" />
                        ) : isServiceCharge ? (
                          <ShieldCheck className="w-4 h-4 text-pink-500" />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                        )}
                        <span className="text-slate-800 dark:text-slate-200">
                          {isCouncilTax ? 'COUNCIL TAX' : isServiceCharge ? 'SERVICE CHARGE' : b.utility_type}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {b.period_start} → {b.period_end} <span className="text-slate-400 dark:text-slate-400">({days}d)</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900 dark:text-white">
                      {isElec || isGas ? (
                        `${b.total_units.toLocaleString()} kWh`
                      ) : isWater ? (
                        `${b.total_units.toLocaleString()} m³`
                      ) : b.total_units > 0 ? (
                        `${b.total_units.toLocaleString()} units`
                      ) : (
                        <span className="text-slate-400 font-normal">Fixed charge</span>
                      )}
                      {b.raw_meter_units && (
                        <span className="text-[11px] text-slate-400 block font-normal">
                          (from {b.raw_meter_units} {b.raw_unit_type})
                        </span>
                      )}
                    </td>

                    {/* Usage Cost */}
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                      {curr}{usageCost.toFixed(2)}
                    </td>

                    {/* Standing Charge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {hasStanding ? (
                        <div>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {curr}{standingCharge.toFixed(2)}
                          </span>
                          {standingPct > 0 && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-normal">
                              {standingPct}% of total
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-400">-</span>
                      )}
                    </td>

                    {/* Total Cost */}
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                      {curr}{b.total_cost.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {curr}{dailyCost} / day
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        b.source === 'CSV_IMPORT'
                          ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300'
                          : b.source === 'SEED_DATA'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {b.source}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="truncate max-w-[180px] text-slate-500 dark:text-slate-400" title={b.notes || ''}>
                        {b.notes || '-'}
                      </div>
                    </td>

                    <td className="sticky right-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50 py-3 px-4 whitespace-nowrap text-right border-l border-slate-200/80 dark:border-slate-700/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] transition-colors">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => setEditingBill(b)}
                          className="p-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition"
                          title="Edit bill record"
                          aria-label="Edit bill record"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                          title="Delete bill record"
                          aria-label="Delete bill record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <EditBillModal
        bill={editingBill}
        isOpen={!!editingBill}
        onClose={() => setEditingBill(null)}
      />
    </div>
  );
};
