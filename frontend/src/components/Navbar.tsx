import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { 
  Zap, 
  BarChart3, 
  Receipt, 
  Gauge, 
  Calculator, 
  Thermometer, 
  Upload, 
  Plus, 
  Sun, 
  Moon, 
  Database, 
  Download, 
  FileUp,
  Building
} from 'lucide-react';

interface NavbarProps {
  onOpenAddBill: () => void;
  onOpenAddReading: () => void;
  onOpenImportCSV: () => void;
  onOpenPropertyModal: () => void;
  onOpenTariffModal: () => void;
  onOpenImportBackup: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddBill,
  onOpenAddReading,
  onOpenImportCSV,
  onOpenPropertyModal,
  onOpenTariffModal,
  onOpenImportBackup
}) => {
  const { 
    properties, 
    currentProperty, 
    setCurrentProperty, 
    selectedPropertyIds,
    setSelectedPropertyIds,
    selectAllProperties,
    isAllPropertiesSelected,
    triggerRefresh, 
    isDarkMode, 
    toggleDarkMode,
    activeTab,
    setActiveTab
  } = useApp();

  const [loadingSeed, setLoadingSeed] = useState(false);

  const handleSeedDemo = async () => {
    if (confirm("Load realistic UK 18-month demo dataset for testing? This will populate sample electricity, gas, and water data.")) {
      try {
        setLoadingSeed(true);
        await api.seedDemoData();
        triggerRefresh();
      } catch (e) {
        alert("Error seeding demo data: " + e);
      } finally {
        setLoadingSeed(false);
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                Utility<span className="text-sky-500">Lens</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                UK Home Energy
              </span>
            </div>
          </div>

          {/* Property Switcher */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
              <Building className="w-4 h-4 ml-2 text-slate-500 dark:text-slate-400" />
              <select
                className="bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 py-1 px-2 focus:outline-none cursor-pointer"
                value={isAllPropertiesSelected ? 'ALL' : (selectedPropertyIds.length === 1 ? selectedPropertyIds[0] : (currentProperty?.id || ''))}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'ALL') {
                    selectAllProperties();
                  } else {
                    const selected = properties.find(p => p.id === val);
                    if (selected) {
                      setCurrentProperty(selected);
                      setSelectedPropertyIds([selected.id]);
                    }
                  }
                }}
              >
                {properties.length > 1 && (
                  <option value="ALL" className="dark:bg-slate-800 font-semibold text-sky-600 dark:text-sky-400">
                    All Properties ({properties.length} Combined)
                  </option>
                )}
                {properties.map(p => (
                  <option key={p.id} value={p.id} className="dark:bg-slate-800">
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={onOpenPropertyModal}
                title="Manage & Edit Properties"
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Primary Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenImportCSV}
              className="hidden md:inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:hover:bg-sky-900 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Import CSV
            </button>

            <button
              onClick={onOpenAddBill}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Bill
            </button>

            <button
              onClick={onOpenAddReading}
              className="hidden lg:inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              <Gauge className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Meter Read
            </button>

            {/* Tariffs config button */}
            <button
              onClick={onOpenTariffModal}
              title="Manage Tariffs & Rates"
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Calculator className="w-4 h-4" />
            </button>

            {/* Seed Demo Data button */}
            <button
              onClick={handleSeedDemo}
              disabled={loadingSeed}
              title="Load Realistic 18-Month Demo Data"
              className="p-2 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Database className="w-4 h-4" />
            </button>

            {/* Backup export */}
            <a
              href={api.getExportBackupUrl()}
              download="utility_backup.json"
              title="Export JSON Backup"
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Backup import */}
            <button
              onClick={onOpenImportBackup}
              title="Import JSON Backup"
              className="p-2 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <FileUp className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 sm:space-x-4 border-t border-slate-100 dark:border-slate-800/60 overflow-x-auto py-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition ${
              activeTab === 'dashboard'
                ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-1.5" />
            Dashboard & Trends
          </button>

          <button
            onClick={() => setActiveTab('bills')}
            className={`flex items-center px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition ${
              activeTab === 'bills'
                ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4 mr-1.5" />
            Bill Records
          </button>

          <button
            onClick={() => setActiveTab('readings')}
            className={`flex items-center px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition ${
              activeTab === 'readings'
                ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Gauge className="w-4 h-4 mr-1.5" />
            Meter Readings
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition ${
              activeTab === 'simulator'
                ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4 mr-1.5" />
            What-If Simulator
          </button>

          <button
            onClick={() => setActiveTab('baseload')}
            className={`flex items-center px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition ${
              activeTab === 'baseload'
                ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Thermometer className="w-4 h-4 mr-1.5" />
            Heating & Baseload
          </button>
        </div>
      </div>
    </header>
  );
};
