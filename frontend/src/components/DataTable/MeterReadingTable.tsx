import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { MeterReading } from '../../types';
import { Trash2, Zap, Flame } from 'lucide-react';

export const MeterReadingTable: React.FC = () => {
  const { currentProperty, refreshKey, triggerRefresh } = useApp();
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadReadings = async () => {
    if (!currentProperty) return;
    setLoading(true);
    try {
      const data = await api.getMeterReadings(currentProperty.id);
      setReadings(data);
    } catch (err) {
      console.error('Failed to load readings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReadings();
  }, [currentProperty, refreshKey]);

  const handleDelete = async (id: string) => {
    if (confirm('Delete this meter reading?')) {
      try {
        await api.deleteMeterReading(id);
        triggerRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Physical Meter Readings</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cumulative index reads for {currentProperty?.name}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4 font-semibold">Utility</th>
              <th className="py-3 px-4 font-semibold">Reading Date</th>
              <th className="py-3 px-4 font-semibold">Meter Register Index</th>
              <th className="py-3 px-4 font-semibold">Source Type</th>
              <th className="py-3 px-4 font-semibold">Notes</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">Loading readings...</td>
              </tr>
            ) : readings.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">No physical meter readings logged yet.</td>
              </tr>
            ) : (
              readings.map((r) => {
                const isElec = r.utility_type === 'ELECTRICITY';
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 font-bold">
                        {isElec ? (
                          <Zap className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Flame className="w-4 h-4 text-rose-500" />
                        )}
                        <span className="text-slate-800 dark:text-slate-200">{r.utility_type}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {r.reading_date}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {r.meter_index.toLocaleString()} {r.meter_unit}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {r.reading_type}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {r.notes || '-'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                        title="Delete reading"
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
