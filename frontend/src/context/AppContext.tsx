import React, { createContext, useContext, useState, useEffect } from 'react';
import { Property } from '../types';
import { api } from '../api/client';

interface AppContextType {
  properties: Property[];
  currentProperty: Property | null;
  setCurrentProperty: (prop: Property) => void;
  selectedPropertyIds: string[];
  setSelectedPropertyIds: (ids: string[]) => void;
  togglePropertySelection: (id: string) => void;
  selectAllProperties: () => void;
  isAllPropertiesSelected: boolean;
  loadProperties: () => Promise<void>;
  refreshKey: number;
  triggerRefresh: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  activeTab: 'dashboard' | 'bills' | 'readings' | 'simulator' | 'baseload';
  setActiveTab: (tab: 'dashboard' | 'bills' | 'readings' | 'simulator' | 'baseload') => void;
  isProduction: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bills' | 'readings' | 'simulator' | 'baseload'>('dashboard');
  const [isProduction, setIsProduction] = useState<boolean>(() => {
    return (
      import.meta.env.VITE_NODE_ENV === 'production' ||
      import.meta.env.MODE === 'production'
    );
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    api.getConfig().then((cfg) => {
      if (cfg && typeof cfg.is_production === 'boolean') {
        setIsProduction(cfg.is_production);
      }
    }).catch((err) => {
      console.warn('Could not fetch app config:', err);
    });
  }, []);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const loadProperties = async () => {
    try {
      const data = await api.getProperties();
      setProperties(data);
      if (data.length > 0) {
        // Keep current or select first
        if (!currentProperty || !data.some(p => p.id === currentProperty.id)) {
          setCurrentProperty(data[0]);
        }
        // Select all properties by default
        setSelectedPropertyIds(prev => {
          if (prev.length === 0) {
            return data.map(p => p.id);
          }
          const valid = prev.filter(id => data.some(p => p.id === id));
          return valid.length > 0 ? valid : data.map(p => p.id);
        });
      }
    } catch (err) {
      console.error('Failed to load properties:', err);
    }
  };

  const togglePropertySelection = (id: string) => {
    setSelectedPropertyIds(prev => {
      if (prev.includes(id)) {
        const filtered = prev.filter(pId => pId !== id);
        return filtered.length > 0 ? filtered : prev;
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAllProperties = () => {
    setSelectedPropertyIds(properties.map(p => p.id));
  };

  const isAllPropertiesSelected = properties.length > 0 && properties.every(p => selectedPropertyIds.includes(p.id));

  useEffect(() => {
    loadProperties();
  }, [refreshKey]);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <AppContext.Provider
      value={{
        properties,
        currentProperty,
        setCurrentProperty,
        selectedPropertyIds,
        setSelectedPropertyIds,
        togglePropertySelection,
        selectAllProperties,
        isAllPropertiesSelected,
        loadProperties,
        refreshKey,
        triggerRefresh,
        isDarkMode,
        toggleDarkMode,
        activeTab,
        setActiveTab,
        isProduction,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
