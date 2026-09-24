import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { MonthlyBreakdownItem } from '../../types';

interface SpendTrendChartProps {
  data: MonthlyBreakdownItem[];
  currencySymbol: string;
}

export const SpendTrendChart: React.FC<SpendTrendChartProps> = ({ data, currencySymbol }) => {
  const [showDailyAvg, setShowDailyAvg] = useState(false);

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
            <div className="flex justify-between space-x-4 text-amber-600 dark:text-amber-400">
              <span>Electricity:</span>
              <span className="font-semibold">{currencySymbol}{item.electricity_cost.toFixed(2)} ({item.electricity_units} kWh)</span>
            </div>
            <div className="flex justify-between space-x-4 text-rose-600 dark:text-rose-400">
              <span>Gas:</span>
              <span className="font-semibold">{currencySymbol}{item.gas_cost.toFixed(2)} ({item.gas_units} kWh)</span>
            </div>
            <div className="flex justify-between space-x-4 text-cyan-600 dark:text-cyan-400">
              <span>Water:</span>
              <span className="font-semibold">{currencySymbol}{item.water_cost.toFixed(2)} ({item.water_units} m³)</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white">
              <span>Total:</span>
              <span>{currencySymbol}{item.total_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-indigo-500 pt-0.5">
              <span>Daily Avg:</span>
              <span>{currencySymbol}{item.daily_avg_cost.toFixed(2)} / day</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Monthly Utility Spend</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Stacked breakdown of electricity, gas, and water costs
          </p>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center space-x-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showDailyAvg}
              onChange={(e) => setShowDailyAvg(e.target.checked)}
              className="mr-1.5 rounded text-indigo-600 focus:ring-0"
            />
            Show Daily Avg Overlay
          </label>
        </div>
      </div>

      <div className="h-72 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            No billing records to display. Add bills or load demo data.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${currencySymbol}${v}`} />
              {showDailyAvg && (
                <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={11} tickLine={false} tickFormatter={(v) => `${currencySymbol}${v}/d`} />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar yAxisId="left" dataKey="electricity_cost" name="Electricity" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar yAxisId="left" dataKey="gas_cost" name="Gas" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
              <Bar yAxisId="left" dataKey="water_cost" name="Water" stackId="a" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              {showDailyAvg && (
                <Line yAxisId="right" type="monotone" dataKey="daily_avg_cost" name="Daily Avg (£/d)" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
