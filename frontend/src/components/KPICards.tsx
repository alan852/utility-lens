import React from 'react';
import { KPISummary } from '../types';
import { TrendingUp, TrendingDown, Calendar, CreditCard, Clock, Zap, Flame, Droplets } from 'lucide-react';

interface KPICardsProps {
  kpis: KPISummary | null;
  loading: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis, loading }) => {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white dark:bg-slate-800/60 rounded-xl p-4 animate-pulse border border-slate-200 dark:border-slate-800" />
        ))}
      </div>
    );
  }

  const curr = kpis.currency_symbol || '£';
  const momPct = kpis.month_over_month_change_pct;
  const isIncrease = momPct !== null && momPct > 0;

  // Calculate percentage shares of trailing 12m spend
  const totalT12 = kpis.total_spend_trailing_12m || 1;
  const elecSpend = kpis.spend_by_utility_trailing_12m['ELECTRICITY'] || 0;
  const gasSpend = kpis.spend_by_utility_trailing_12m['GAS'] || 0;
  const waterSpend = kpis.spend_by_utility_trailing_12m['WATER'] || 0;

  const elecShare = Math.round((elecSpend / totalT12) * 100);
  const gasShare = Math.round((gasSpend / totalT12) * 100);
  const waterShare = Math.round((waterSpend / totalT12) * 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Trailing 12M Total Spend */}
      <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition hover:shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Annual Spend (T12M)
          </span>
          <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-1">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {curr}{kpis.total_spend_trailing_12m.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Trailing 12 calendar months
        </p>
      </div>

      {/* 2. Current Month Spend */}
      <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition hover:shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Current Month Spend
          </span>
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {curr}{kpis.current_month_spend.toFixed(2)}
          </span>
          {momPct !== null && (
            <span
              className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                isIncrease
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}
            >
              {isIncrease ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {Math.abs(momPct)}%
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          vs {curr}{kpis.previous_month_spend.toFixed(2)} previous month
        </p>
      </div>

      {/* 3. Daily Average Normalized Cost */}
      <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition hover:shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Daily Average Cost
          </span>
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-1">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {curr}{kpis.daily_avg_spend.toFixed(2)}
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/ day</span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Normalized across billing period
        </p>
      </div>

      {/* 4. Utility Share Breakdown */}
      <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition hover:shadow">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Spend Share (T12M)
        </span>
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center text-slate-600 dark:text-slate-300">
              <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" /> Electricity
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {elecShare}% ({curr}{elecSpend.toFixed(0)})
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${elecShare}%` }} />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center text-slate-600 dark:text-slate-300">
              <Flame className="w-3.5 h-3.5 mr-1 text-rose-500" /> Gas
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {gasShare}% ({curr}{gasSpend.toFixed(0)})
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${gasShare}%` }} />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center text-slate-600 dark:text-slate-300">
              <Droplets className="w-3.5 h-3.5 mr-1 text-cyan-500" /> Water
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {waterShare}% ({curr}{waterSpend.toFixed(0)})
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${waterShare}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};
