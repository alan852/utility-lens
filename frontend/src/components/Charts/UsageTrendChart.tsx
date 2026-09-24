import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { MonthlyBreakdownItem } from '../../types';

interface UsageTrendChartProps {
  data: MonthlyBreakdownItem[];
}

export const UsageTrendChart: React.FC<UsageTrendChartProps> = ({ data }) => {
  const formattedData = data.map((d) => ({
    ...d,
    label: d.month_label,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as MonthlyBreakdownItem;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-100 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between space-x-4 text-amber-500">
              <span>Electricity:</span>
              <span className="font-semibold">{item.electricity_units.toLocaleString()} kWh</span>
            </div>
            <div className="flex justify-between space-x-4 text-rose-500">
              <span>Gas:</span>
              <span className="font-semibold">{item.gas_units.toLocaleString()} kWh</span>
            </div>
            <div className="flex justify-between space-x-4 text-cyan-500">
              <span>Water:</span>
              <span className="font-semibold">{item.water_units.toLocaleString()} m³</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Consumption Volume Trends</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Energy in kWh (left) vs Water in m³ (right)
          </p>
        </div>
      </div>

      <div className="h-72 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            No consumption records found.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis yAxisId="kwh" stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}k`} unit="" />
              <YAxis yAxisId="m3" orientation="right" stroke="#06b6d4" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}m³`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line yAxisId="kwh" type="monotone" dataKey="gas_units" name="Gas (kWh)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="kwh" type="monotone" dataKey="electricity_units" name="Electricity (kWh)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="m3" type="monotone" dataKey="water_units" name="Water (m³)" stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
