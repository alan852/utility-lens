import React from 'react';
import { useApp } from '../context/AppContext';
import { Building2, Check, SlidersHorizontal } from 'lucide-react';

interface PropertyScopeSelectorProps {
  onOpenPropertyModal?: () => void;
}

export const PropertyScopeSelector: React.FC<PropertyScopeSelectorProps> = ({ onOpenPropertyModal }) => {
  const {
    properties,
    selectedPropertyIds,
    togglePropertySelection,
    selectAllProperties,
    isAllPropertiesSelected,
  } = useApp();

  if (properties.length <= 1) return null;

  const selectedCount = selectedPropertyIds.length;
  const isMultiple = selectedCount > 1;

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      {/* Label and Summary */}
      <div className="flex items-center space-x-2.5">
        <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
          <Building2 className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Analysis Scope
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isAllPropertiesSelected
                ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
            }`}>
              {isAllPropertiesSelected
                ? `All ${properties.length} Properties Combined`
                : `${selectedCount} of ${properties.length} Selected`}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {isAllPropertiesSelected
              ? 'Aggregating utility bills and energy consumption across all household properties'
              : isMultiple
              ? `Aggregating metrics across ${selectedCount} selected properties`
              : selectedCount === 1
              ? `Filtered to: ${properties.find(p => p.id === selectedPropertyIds[0])?.name || '1 property'}`
              : 'Please select at least one property to analyze'}
          </p>
        </div>
      </div>

      {/* Property Selectors / Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Select All Button */}
        <button
          onClick={selectAllProperties}
          className={`flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
            isAllPropertiesSelected
              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-750 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-600'
          }`}
          title="Analyze all properties together"
        >
          {isAllPropertiesSelected && <Check className="w-3.5 h-3.5 mr-1" />}
          All Properties ({properties.length})
        </button>

        {/* Individual Property Pills */}
        {properties.map((prop) => {
          const isSelected = selectedPropertyIds.includes(prop.id);
          return (
            <button
              key={prop.id}
              onClick={() => togglePropertySelection(prop.id)}
              className={`flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium transition border ${
                isSelected
                  ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-700/80 font-semibold'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700/60 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title={`Toggle ${prop.name} in analysis`}
            >
              <span className={`w-2 h-2 rounded-full mr-1.5 ${
                isSelected ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'
              }`} />
              {prop.name}
            </button>
          );
        })}

        {onOpenPropertyModal && (
          <button
            onClick={onOpenPropertyModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition ml-1"
            title="Manage Properties"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
