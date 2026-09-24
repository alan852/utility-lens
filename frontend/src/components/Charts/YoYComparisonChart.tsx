import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { YoYComparisonResponse } from '../../types';

interface YoYComparisonChartProps {
  data: YoYComparisonResponse | null;
  onYearChange: (current: number, previous: number) => void;
  currencySymbol: string;
}

export const YoYComparisonChart: React.FC<YoYComparisonChartProps> = ({
  data,
  onYearChange,
  currencySymbol
}) => {
  const [metric, setMetric] = useState<'cost' | 'gas' | 'elec'>('cost');

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Year-over-Year (YoY) Comparison</h3>
        <p className="text-slate-400 text-sm mt-8 text-center">At least two years of data are recommended for full YoY analysis.</p>
      </div>
    );
  }

  const { comparison_year_current, comparison_year_previous, years_available } = data;

  const chartData = data.data.map((item) => {
    let currVal = item.current_total_cost;
    let prevVal = item.previous_total_cost;
    let unit = currencySymbol;

    if (metric === 'gas') {
      currVal = item.current_gas_kwh;
      prevVal = item.previous_gas_kwh;
      unit = 'kWh';
    } else if (metric === 'elec') {
      currVal = item.current_electricity_kwh;
      prevVal = item.previous_electricity_kwh;
      unit = 'kWh';
    }

    return {
      month: item.month_name,
      [`${comparison_year_current}`]: currVal,
      [`${comparison_year_previous}`]: prevVal,
      diffPct: metric === 'cost' ? item.cost_diff_pct : item.kwh_diff_pct,
      unit,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      const currKey = `${comparison_year_current}`;
      const prevKey = `${comparison_year_previous}`;
      const cVal = p[currKey];
      const pVal = p[prevKey];
      const diff = p.diffPct;

      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between space-x-3 text-sky-600 dark:text-sky-400">
              <span>{comparison_year_current}:</span>
              <span className="font-semibold">{metric === 'cost' ? currencySymbol : ''}{cVal} {metric !== 'cost' ? 'kWh' : ''}</span>
            </div>
            <div className="flex justify-between space-x-3 text-slate-500 dark:text-slate-400">
              <span>{comparison_year_previous}:</span>
              <span className="font-semibold">{metric === 'cost' ? currencySymbol : ''}{pVal} {metric !== 'cost' ? 'kWh' : ''}</span>
            </div>
            {diff !== null && (
              <div className={`pt-1 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold ${
                diff > 0 ? 'text-rose-500' : 'text-emerald-500'
              }`}>
                <span>Difference:</span>
                <span>{diff > 0 ? `+${diff}%` : `${diff}%`}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Year-over-Year Seasonal Comparison</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compare monthly winter heating & summer profiles across years
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Metric Selector */}
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setMetric('cost')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                metric === 'cost' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
            >
              Cost (£)
            </button>
            <button
              onClick={() => setMetric('gas')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                metric === 'gas' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600 dark:text-rose-400' : 'text-slate-500'
              }`}
            >
              Gas (kWh)
            </button>
            <button
              onClick={() => setMetric('elec')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                metric === 'elec' ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600 dark:text-amber-400' : 'text-slate-500'
              }`}
            >
              Elec (kWh)
            </button>
          </div>

          {/* Year selector */}
          <div className="flex items-center space-x-1 font-medium text-slate-700 dark:text-slate-300">
            <select
              value={comparison_year_current}
              onChange={(e) => onYearChange(parseInt(e.target.value), comparison_year_previous)}
              className="bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 border border-slate-200 dark:border-slate-700 text-xs"
            >
              {years_available.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="text-slate-400">vs</span>
            <select
              value={comparison_year_previous}
              onChange={(e) => onYearChange(comparison_year_current, parseInt(e.target.value))}
              className="bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 border border-slate-200 dark:border-slate-700 text-xs"
            >
              {years_available.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
            <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => metric === 'cost' ? `${currencySymbol}${v}` : `${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey={`${comparison_year_current}`} fill="#0ea5e9" radius={[3, 3, 0, 0]} />
            <Bar dataKey={`${comparison_year_previous}`} fill="#94a3b8" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
