import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { MeterReading } from '../../types';
import { Trash2, Pencil, Zap, Flame } from 'lucide-react';
import { EditMeterReadingModal } from '../Modals/EditMeterReadingModal';

export const MeterReadingTable: React.FC = () => {
  const { properties, selectedPropertyIds, isAllPropertiesSelected, refreshKey, triggerRefresh } = useApp();
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingReading, setEditingReading] = useState<MeterReading | null>(null);

  const loadReadings = async () => {
    setLoading(true);
    try {
      const propParam = isAllPropertiesSelected 
        ? undefined 
        : (selectedPropertyIds.length > 0 ? selectedPropertyIds : undefined);
      const data = await api.getMeterReadings(propParam);
      const todayStr = new Date().toISOString().split('T')[0];
      setReadings(data.filter((r) => r.reading_date <= todayStr));
    } catch (err) {
      console.error('Failed to load readings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReadings();
  }, [selectedPropertyIds, isAllPropertiesSelected, refreshKey]);

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
          {readings.length} cumulative index reads recorded
        </p>
      </div>

      <div className="overflow-x-auto max-h-[calc(100vh-14rem)] min-h-[360px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700/80 shadow-sm backdrop-blur">
            <tr>
              {properties.length > 1 && (
                <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold">Property</th>
              )}
              <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold">Utility</th>
              <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold">Reading Date</th>
              <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold">Meter Register Index</th>
              <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold">Source Type</th>
              <th className="sticky top-0 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold">Notes</th>
              <th className="sticky top-0 right-0 z-20 bg-slate-100 dark:bg-slate-900 py-3 px-4 font-semibold text-right border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading ? (
              <tr>
                <td colSpan={properties.length > 1 ? 7 : 6} className="py-8 text-center text-slate-400">Loading readings...</td>
              </tr>
            ) : readings.length === 0 ? (
              <tr>
                <td colSpan={properties.length > 1 ? 7 : 6} className="py-8 text-center text-slate-400">No physical meter readings logged yet.</td>
              </tr>
            ) : (
              readings.map((r) => {
                const readingProp = properties.find(p => p.id === r.property_id);
                const isElec = r.utility_type === 'ELECTRICITY';
                return (
                  <tr key={r.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    {properties.length > 1 && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          {readingProp?.name || 'Property'}
                        </span>
                      </td>
                    )}
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

                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="truncate max-w-[180px] text-slate-500 dark:text-slate-400" title={r.notes || ''}>
                        {r.notes || '-'}
                      </div>
                    </td>

                    <td className="sticky right-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50 py-3 px-4 whitespace-nowrap text-right border-l border-slate-200/80 dark:border-slate-700/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] transition-colors">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => setEditingReading(r)}
                          className="p-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition"
                          title="Edit meter reading"
                          aria-label="Edit meter reading"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                          title="Delete meter reading"
                          aria-label="Delete meter reading"
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

      <EditMeterReadingModal
        reading={editingReading}
        isOpen={!!editingReading}
        onClose={() => setEditingReading(null)}
      />
    </div>
  );
};
