import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { TariffSimulationResponse, TariffSimulationScenario } from '../../types';
import { Calculator, TrendingDown, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';

export const TariffSimulator: React.FC = () => {
  const { currentProperty } = useApp();
  const [elecUnitRate, setElecUnitRate] = useState<number>(0.245);
  const [elecStandingCharge, setElecStandingCharge] = useState<number>(0.55);
  const [gasUnitRate, setGasUnitRate] = useState<number>(0.065);
  const [gasStandingCharge, setGasStandingCharge] = useState<number>(0.31);
  const [lookbackMonths, setLookbackMonths] = useState<number>(12);
  const [simulation, setSimulation] = useState<TariffSimulationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    if (!currentProperty) return;
    setLoading(true);
    setError(null);
    try {
      const scenarios: TariffSimulationScenario[] = [
        {
          utility_type: 'ELECTRICITY',
          new_unit_rate: elecUnitRate,
          new_standing_charge: elecStandingCharge,
          vat_rate: 0.05,
        },
        {
          utility_type: 'GAS',
          new_unit_rate: gasUnitRate,
          new_standing_charge: gasStandingCharge,
          vat_rate: 0.05,
        },
      ];
      const res = await api.simulateTariffs(currentProperty.id, scenarios, lookbackMonths);
      setSimulation(res);
    } catch (err: any) {
      setError(err.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [currentProperty, lookbackMonths]);

  const curr = simulation?.currency_symbol || currentProperty?.currency_symbol || '£';
  const hasSavings = simulation && simulation.total_savings > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <Calculator className="w-5 h-5 mr-2 text-sky-500" />
              "What-If" Tariff Comparison Simulator
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Simulate potential bills under new or fixed tariffs based on your actual historical consumption
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Analysis Horizon:</span>
            <select
              value={lookbackMonths}
              onChange={(e) => setLookbackMonths(parseInt(e.target.value))}
              className="bg-slate-100 dark:bg-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 focus:outline-none"
            >
              <option value={6}>Past 6 Months</option>
              <option value={12}>Past 12 Months (Full Annual Cycle)</option>
              <option value={18}>Past 18 Months</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tariff Configuration Form */}
        <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            Proposed New Tariffs to Compare
          </h3>

          {/* Electricity Rates */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              ⚡ Electricity Rates
            </h4>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Unit Rate ({curr} / kWh)
              </label>
              <input
                type="number"
                step="0.001"
                value={elecUnitRate}
                onChange={(e) => setElecUnitRate(parseFloat(e.target.value) || 0)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-sky-500"
              />
              <span className="text-[11px] text-slate-400">e.g. 0.245 is 24.5p/kWh</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Standing Charge ({curr} / day)
              </label>
              <input
                type="number"
                step="0.01"
                value={elecStandingCharge}
                onChange={(e) => setElecStandingCharge(parseFloat(e.target.value) || 0)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-sky-500"
              />
              <span className="text-[11px] text-slate-400">e.g. 0.55 is 55p/day</span>
            </div>
          </div>

          {/* Gas Rates */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              🔥 Gas Rates
            </h4>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Unit Rate ({curr} / kWh)
              </label>
              <input
                type="number"
                step="0.001"
                value={gasUnitRate}
                onChange={(e) => setGasUnitRate(parseFloat(e.target.value) || 0)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-sky-500"
              />
              <span className="text-[11px] text-slate-400">e.g. 0.065 is 6.5p/kWh</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Standing Charge ({curr} / day)
              </label>
              <input
                type="number"
                step="0.01"
                value={gasStandingCharge}
                onChange={(e) => setGasStandingCharge(parseFloat(e.target.value) || 0)}
                className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-sky-500"
              />
              <span className="text-[11px] text-slate-400">e.g. 0.31 is 31p/day</span>
            </div>
          </div>

          <button
            onClick={runSimulation}
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center py-2 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition shadow-sm"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
            Calculate Simulated Bills
          </button>
        </div>

        {/* Right Column: Simulation Results & Impact Cards */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center text-sm">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {simulation && (
            <>
              {/* Highlight Banner */}
              <div
                className={`rounded-xl p-6 border transition ${
                  hasSavings
                    ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                    : 'bg-rose-50/80 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {hasSavings ? '🎉 Estimated Annual Savings' : '⚠️ Projected Cost Increase'}
                    </span>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <span className="text-3xl font-extrabold">
                        {curr}{Math.abs(simulation.total_savings).toFixed(2)}
                      </span>
                      <span className="text-sm font-semibold">
                        ({Math.abs(simulation.total_savings_pct)}% {hasSavings ? 'cheaper' : 'more expensive'})
                      </span>
                    </div>
                    <p className="text-xs mt-1 opacity-80">
                      Based on {simulation.months_analyzed} months of historical energy usage
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 text-right">
                    <div className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-sm">
                      {hasSavings ? (
                        <TrendingDown className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <TrendingUp className="w-8 h-8 text-rose-500" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-emerald-200/50 dark:border-emerald-800/50 text-xs">
                  <div>
                    <span className="opacity-75">Historical Spend (Actual):</span>
                    <p className="text-base font-bold">{curr}{simulation.total_historical_cost.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="opacity-75">Simulated Spend (Proposed):</span>
                    <p className="text-base font-bold">{curr}{simulation.total_simulated_cost.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="bg-white dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                  Utility Cost Breakdown
                </h4>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <th className="pb-2 font-medium">Utility</th>
                      <th className="pb-2 font-medium">Usage (kWh)</th>
                      <th className="pb-2 font-medium">Actual Cost</th>
                      <th className="pb-2 font-medium">Simulated Unit Cost</th>
                      <th className="pb-2 font-medium">Simulated Standing</th>
                      <th className="pb-2 font-medium">Simulated Total</th>
                      <th className="pb-2 font-medium text-right">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {simulation.breakdown.map((row) => (
                      <tr key={row.utility_type} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                        <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                          {row.utility_type}
                        </td>
                        <td className="py-2.5">{row.historical_units.toLocaleString()}</td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">
                          {curr}{row.historical_actual_cost.toFixed(2)}
                        </td>
                        <td className="py-2.5">{curr}{row.unit_rate_cost.toFixed(2)}</td>
                        <td className="py-2.5">{curr}{row.standing_charge_cost.toFixed(2)}</td>
                        <td className="py-2.5 font-semibold text-slate-900 dark:text-white">
                          {curr}{row.simulated_cost.toFixed(2)}
                        </td>
                        <td className={`py-2.5 text-right font-bold ${
                          row.cost_difference > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {row.cost_difference > 0 ? `-${curr}${row.cost_difference.toFixed(2)}` : `+${curr}${Math.abs(row.cost_difference).toFixed(2)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
