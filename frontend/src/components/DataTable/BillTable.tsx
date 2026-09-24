import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { BillRecord } from '../../types';
import { Trash2, Zap, Flame, Droplets, Filter } from 'lucide-react';

export const BillTable: React.FC = () => {
  const { currentProperty, refreshKey, triggerRefresh } = useApp();
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterUtil, setFilterUtil] = useState<string>('');

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
    <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Historical Bill Records</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {bills.length} statements recorded for {currentProperty?.name}
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterUtil}
            onChange={(e) => setFilterUtil(e.target.value)}
            className="bg-slate-100 dark:bg-slate-700 text-xs rounded-lg px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 focus:outline-none"
          >
            <option value="">All Utilities</option>
            <option value="ELECTRICITY">Electricity Only</option>
            <option value="GAS">Gas Only</option>
            <option value="WATER">Water Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4 font-semibold">Utility</th>
              <th className="py-3 px-4 font-semibold">Billing Period</th>
              <th className="py-3 px-4 font-semibold">Consumption</th>
              <th className="py-3 px-4 font-semibold">Billed Cost</th>
              <th className="py-3 px-4 font-semibold">Daily Average</th>
              <th className="py-3 px-4 font-semibold">Source</th>
              <th className="py-3 px-4 font-semibold">Notes</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">Loading records...</td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">No bill records found. Use "Add Bill" or "Import CSV" to add data.</td>
              </tr>
            ) : (
              bills.map((b) => {
                const isElec = b.utility_type === 'ELECTRICITY';
                const isGas = b.utility_type === 'GAS';
                const days = Math.max(1, Math.round((new Date(b.period_end).getTime() - new Date(b.period_start).getTime()) / (1000 * 3600 * 24)));
                const dailyCost = (b.total_cost / days).toFixed(2);

                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 font-bold">
                        {isElec ? (
                          <Zap className="w-4 h-4 text-amber-500" />
                        ) : isGas ? (
                          <Flame className="w-4 h-4 text-rose-500" />
                        ) : (
                          <Droplets className="w-4 h-4 text-cyan-500" />
                        )}
                        <span className="text-slate-800 dark:text-slate-200">{b.utility_type}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {b.period_start} → {b.period_end} <span className="text-slate-400">({days}d)</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900 dark:text-white">
                      {b.total_units.toLocaleString()} {isElec || isGas ? 'kWh' : 'm³'}
                      {b.raw_meter_units && (
                        <span className="text-[11px] text-slate-400 block font-normal">
                          (from {b.raw_meter_units} {b.raw_unit_type})
                        </span>
                      )}
                    </td>

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

                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {b.notes || '-'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                        title="Delete bill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
