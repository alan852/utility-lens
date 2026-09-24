import React from 'react';
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
import { BaseloadAnalysisResponse } from '../../types';
import { Flame, Zap, Lightbulb, Info } from 'lucide-react';

interface BaseloadChartProps {
  data: BaseloadAnalysisResponse | null;
  loading: boolean;
}

export const BaseloadChart: React.FC<BaseloadChartProps> = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="h-64 bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 animate-pulse" />
    );
  }

  const curr = data.currency_symbol || '£';

  // Prepare chart items
  const chartData = data.items.map((item) => {
    const isGas = item.utility_type === 'GAS';
    const heatingUnits = Math.max(0, item.winter_peak_units - item.summer_baseline_units);
    return {
      utility: isGas ? 'Gas' : 'Electricity',
      'Summer Baseline (Baseload)': item.summer_baseline_units,
      'Seasonal / Heating Peak Extra': heatingUnits,
      totalPeak: item.winter_peak_units,
      share: item.heating_share_pct,
      baseCost: item.estimated_baseload_monthly_cost,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Explainer */}
      <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl p-5">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <h4 className="font-bold text-sky-900 dark:text-sky-200">
              Understanding Baseload vs Weather-Driven Demand
            </h4>
            <p className="mt-1 text-sky-700 dark:text-sky-300 text-xs leading-relaxed">
              Your home's utility usage divides into <strong>baseload</strong> (unavoidable baseline consumption for hot water, cooking, refrigeration, and always-on electronics) and <strong>weather-driven load</strong> (space heating that spikes during chilly winter months). By decoupling these, you can precisely quantify where energy efficiency investments (like insulation, smart thermostats, or heat pumps) will deliver the highest return.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Baseload Decomposition Chart */}
        <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Baseload vs Weather Space Heating
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Comparison of summer non-heating baseline vs winter heating surge (kWh/month)
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis dataKey="utility" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  formatter={(val: any, name: string) => [`${val} kWh`, name]}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Summer Baseline (Baseload)" stackId="a" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Seasonal / Heating Peak Extra" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Insights & Breakdown Cards */}
        <div className="space-y-4">
          {data.items.map((item) => {
            const isGas = item.utility_type === 'GAS';
            return (
              <div
                key={item.utility_type}
                className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${isGas ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400'}`}>
                      {isGas ? <Flame className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {isGas ? 'Gas Space Heating Analysis' : 'Electricity Standby & Base Load'}
                      </h4>
                      <span className="text-xs text-slate-500">
                        {isGas ? 'Hot water vs Central heating' : 'Continuous background draw'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {item.heating_share_pct}%
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {isGas ? 'Winter heating share' : 'Seasonal swing'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Summer Baseload:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      ~{item.summer_baseline_units} kWh/mo ({curr}{item.estimated_baseload_monthly_cost}/mo)
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Winter Peak Demand:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      ~{item.winter_peak_units} kWh/mo
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Actionable Tips */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
            <div className="flex items-start space-x-2">
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs space-y-1 text-amber-900 dark:text-amber-200">
                <span className="font-bold">Key Insight:</span>
                <p>
                  Because heating makes up the vast majority of winter energy spend, reducing your thermostat set-point by just 1°C typically yields an immediate ~8–10% reduction in winter gas consumption without affecting summer baseload.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
