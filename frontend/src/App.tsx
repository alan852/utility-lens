import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { api } from './api/client';
import { KPISummary, MonthlyBreakdownResponse, YoYComparisonResponse, BaseloadAnalysisResponse } from './types';
import { Navbar } from './components/Navbar';
import { KPICards } from './components/KPICards';
import { SpendTrendChart } from './components/Charts/SpendTrendChart';
import { UsageTrendChart } from './components/Charts/UsageTrendChart';
import { YoYComparisonChart } from './components/Charts/YoYComparisonChart';
import { BaseloadChart } from './components/Charts/BaseloadChart';
import { TariffSimulator } from './components/TariffSimulator/TariffSimulator';
import { BillTable } from './components/DataTable/BillTable';
import { MeterReadingTable } from './components/DataTable/MeterReadingTable';
import { AddBillModal } from './components/Modals/AddBillModal';
import { AddMeterReadingModal } from './components/Modals/AddMeterReadingModal';
import { CSVImporterModal } from './components/CSVImporter/CSVImporterModal';
import { PropertyModal } from './components/Modals/PropertyModal';
import { TariffModal } from './components/Modals/TariffModal';
import { ImportBackupModal } from './components/Modals/ImportBackupModal';

export const App: React.FC = () => {
  const { currentProperty, selectedPropertyIds, refreshKey, activeTab } = useApp();

  // Modals state
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isAddReadingOpen, setIsAddReadingOpen] = useState(false);
  const [isImportCSVOpen, setIsImportCSVOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
  const [isImportBackupOpen, setIsImportBackupOpen] = useState(false);

  // Analytics data state
  const [kpis, setKpis] = useState<KPISummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyBreakdownResponse | null>(null);
  const [yoyData, setYoyData] = useState<YoYComparisonResponse | null>(null);
  const [baseloadData, setBaseloadData] = useState<BaseloadAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    const propParam = selectedPropertyIds.length > 0 ? selectedPropertyIds : (currentProperty ? [currentProperty.id] : []);
    if (propParam.length === 0) return;
    setLoading(true);
    try {
      const [kpiRes, monthlyRes, yoyRes, baseloadRes] = await Promise.all([
        api.getKPIs(propParam),
        api.getMonthlyBreakdown(propParam),
        api.getYoYComparison(propParam),
        api.getBaseload(propParam),
      ]);
      setKpis(kpiRes);
      setMonthlyData(monthlyRes);
      setYoyData(yoyRes);
      setBaseloadData(baseloadRes);
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedPropertyIds, currentProperty, refreshKey]);

  const handleYoYYearChange = async (curYear: number, prevYear: number) => {
    const propParam = selectedPropertyIds.length > 0 ? selectedPropertyIds : (currentProperty ? [currentProperty.id] : []);
    if (propParam.length === 0) return;
    try {
      const updated = await api.getYoYComparison(propParam, curYear, prevYear);
      setYoyData(updated);
    } catch (err) {
      console.error('Failed to update YoY year:', err);
    }
  };

  const curr = kpis?.currency_symbol || currentProperty?.currency_symbol || '£';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar
        onOpenAddBill={() => setIsAddBillOpen(true)}
        onOpenAddReading={() => setIsAddReadingOpen(true)}
        onOpenImportCSV={() => setIsImportCSVOpen(true)}
        onOpenPropertyModal={() => setIsPropertyModalOpen(true)}
        onOpenTariffModal={() => setIsTariffModalOpen(true)}
        onOpenImportBackup={() => setIsImportBackupOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Render Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <KPICards kpis={kpis} loading={loading} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SpendTrendChart
                data={monthlyData?.data || []}
                currencySymbol={curr}
              />
              <UsageTrendChart
                data={monthlyData?.data || []}
              />
            </div>

            <YoYComparisonChart
              data={yoyData}
              onYearChange={handleYoYYearChange}
              currencySymbol={curr}
            />
          </div>
        )}

        {activeTab === 'bills' && <BillTable />}

        {activeTab === 'readings' && <MeterReadingTable />}

        {activeTab === 'simulator' && <TariffSimulator />}

        {activeTab === 'baseload' && (
          <div className="space-y-6">
            <BaseloadChart data={baseloadData} loading={loading} />
          </div>
        )}
      </main>

      {/* Modals */}
      <AddBillModal
        isOpen={isAddBillOpen}
        onClose={() => setIsAddBillOpen(false)}
      />

      <AddMeterReadingModal
        isOpen={isAddReadingOpen}
        onClose={() => setIsAddReadingOpen(false)}
      />

      <CSVImporterModal
        isOpen={isImportCSVOpen}
        onClose={() => setIsImportCSVOpen(false)}
      />

      <PropertyModal
        isOpen={isPropertyModalOpen}
        onClose={() => setIsPropertyModalOpen(false)}
      />

      <TariffModal
        isOpen={isTariffModalOpen}
        onClose={() => setIsTariffModalOpen(false)}
      />

      <ImportBackupModal
        isOpen={isImportBackupOpen}
        onClose={() => setIsImportBackupOpen(false)}
      />
    </div>
  );
};
export default App;
