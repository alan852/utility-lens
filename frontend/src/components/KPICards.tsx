import React from 'react';
import { KPISummary } from '../types';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Clock,
  Zap,
  Flame,
  Droplets,
  Landmark,
  Wifi,
  ShieldCheck
} from 'lucide-react';

interface KPICardsProps {
  kpis: KPISummary | null;
  loading: boolean;
}

const UTILITY_CONFIG = [
  { key: 'ELECTRICITY', label: 'Electricity', icon: Zap, colorText: 'text-amber-500', barColor: 'bg-amber-500' },
  { key: 'GAS', label: 'Gas', icon: Flame, colorText: 'text-rose-500', barColor: 'bg-rose-500' },
  { key: 'WATER', label: 'Water', icon: Droplets, colorText: 'text-cyan-500', barColor: 'bg-cyan-500' },
  { key: 'COUNCIL_TAX', label: 'Council Tax', icon: Landmark, colorText: 'text-purple-500', barColor: 'bg-purple-500' },
  { key: 'BROADBAND', label: 'Broadband', icon: Wifi, colorText: 'text-emerald-500', barColor: 'bg-emerald-500' },
  { key: 'ESTATE_SERVICE_CHARGE', label: 'Service Charge', icon: ShieldCheck, colorText: 'text-pink-500', barColor: 'bg-pink-500' },
];

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

  // Calculate percentage shares of trailing 12m spend sorted descending by spend
  const totalT12 = kpis.total_spend_trailing_12m || 1;
  const activeUtilities = UTILITY_CONFIG.filter((u) => (kpis.spend_by_utility_trailing_12m[u.key] || 0) > 0);
  const baseUtilities = activeUtilities.length > 0 ? activeUtilities : UTILITY_CONFIG.slice(0, 3);
  const displayUtilities = [...baseUtilities].sort(
    (a, b) => (kpis.spend_by_utility_trailing_12m[b.key] || 0) - (kpis.spend_by_utility_trailing_12m[a.key] || 0)
  );

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
      <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition hover:shadow flex flex-col justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Spend Share (T12M)
        </span>
        <div className="mt-2 space-y-1.5 text-xs max-h-36 overflow-y-auto pr-1">
          {displayUtilities.map((u) => {
            const spend = kpis.spend_by_utility_trailing_12m[u.key] || 0;
            const share = Math.round((spend / totalT12) * 100);
            const Icon = u.icon;
            return (
              <div key={u.key} className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center text-slate-600 dark:text-slate-300">
                    <Icon className={`w-3 h-3 mr-1 ${u.colorText}`} /> {u.label}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {share}% ({curr}{spend.toFixed(0)})
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`${u.barColor} h-full rounded-full transition-all`}
                    style={{ width: `${Math.min(100, Math.max(share, spend > 0 ? 2 : 0))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
