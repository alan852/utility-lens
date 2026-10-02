import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import { 
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
  Building,
  ChevronDown,
  CheckSquare,
  Square,
  Settings
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
    selectedPropertyIds,
    setSelectedPropertyIds,
    togglePropertySelection,
    selectAllProperties,
    isAllPropertiesSelected,
    triggerRefresh, 
    isDarkMode, 
    toggleDarkMode,
    activeTab,
    setActiveTab
  } = useApp();

  const [loadingSeed, setLoadingSeed] = useState(false);
  const [isPropertyDropdownOpen, setIsPropertyDropdownOpen] = useState(false);
  const propertyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (propertyDropdownRef.current && !propertyDropdownRef.current.contains(e.target as Node)) {
        setIsPropertyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <img 
              src="/icon.svg" 
              alt="UtilityLens Logo" 
              className="w-8 h-8 object-contain" 
            />
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                Utility<span className="text-sky-500">Lens</span>
              </span>
            </div>
          </div>

          {/* Top Bar Property Selection */}
          <div className="flex items-center space-x-2">
            <div className="relative" ref={propertyDropdownRef}>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsPropertyDropdownOpen(!isPropertyDropdownOpen)}
                  className="flex items-center space-x-2 text-xs font-semibold text-slate-800 dark:text-slate-200 py-1 px-2.5 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 rounded-md transition"
                >
                  <Building className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                  <span className="max-w-[140px] sm:max-w-[220px] truncate">
                    {isAllPropertiesSelected
                      ? `All Properties (${properties.length} Combined)`
                      : selectedPropertyIds.length === 1
                      ? (properties.find(p => p.id === selectedPropertyIds[0])?.name || '1 Property')
                      : `${selectedPropertyIds.length} Properties Selected`}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={onOpenPropertyModal}
                  title="Manage Properties"
                  aria-label="Manage Properties"
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition ml-0.5"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              {/* Dropdown Menu */}
              {isPropertyDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 text-xs">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Select Properties to Analyze
                  </div>

                  {properties.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          selectAllProperties();
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition ${
                          isAllPropertiesSelected ? 'text-sky-600 dark:text-sky-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {isAllPropertiesSelected ? (
                            <CheckSquare className="w-4 h-4 text-sky-500" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                          <span>All Properties ({properties.length} Combined)</span>
                        </div>
                      </button>
                      <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                    </>
                  )}

                  <div className="max-h-60 overflow-y-auto py-0.5">
                    {properties.map((p) => {
                      const isChecked = selectedPropertyIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => togglePropertySelection(p.id)}
                          className={`group flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60 transition ${
                            isChecked ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0 pr-2">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-sky-500 flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
                            <div className="truncate">
                              <span className="block truncate">{p.name}</span>
                              {p.address && <span className="block text-[10px] text-slate-400 truncate">{p.address}</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPropertyIds([p.id]);
                              setIsPropertyDropdownOpen(false);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:underline px-1 py-0.5 rounded transition"
                          >
                            Only
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsPropertyDropdownOpen(false);
                      onOpenPropertyModal();
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition text-left"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Manage Properties...</span>
                  </button>
                </div>
              )}
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
