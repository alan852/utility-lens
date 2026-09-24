import React, { createContext, useContext, useState, useEffect } from 'react';
import { Property } from '../types';
import { api } from '../api/client';

interface AppContextType {
  properties: Property[];
  currentProperty: Property | null;
  setCurrentProperty: (prop: Property) => void;
  loadProperties: () => Promise<void>;
  refreshKey: number;
  triggerRefresh: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  activeTab: 'dashboard' | 'bills' | 'readings' | 'simulator' | 'baseload';
  setActiveTab: (tab: 'dashboard' | 'bills' | 'readings' | 'simulator' | 'baseload') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bills' | 'readings' | 'simulator' | 'baseload'>('dashboard');
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
      }
    } catch (err) {
      console.error('Failed to load properties:', err);
    }
  };

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
        loadProperties,
        refreshKey,
        triggerRefresh,
        isDarkMode,
        toggleDarkMode,
        activeTab,
        setActiveTab,
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
