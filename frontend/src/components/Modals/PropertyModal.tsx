import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { Building, X, Plus, Check } from 'lucide-react';

interface PropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PropertyModal: React.FC<PropertyModalProps> = ({ isOpen, onClose }) => {
  const { properties, currentProperty, setCurrentProperty, loadProperties } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('£');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const newProp = await api.createProperty({
        name: name.trim(),
        address: address.trim() || undefined,
        currency_symbol: currencySymbol,
      });
      await loadProperties();
      setCurrentProperty(newProp);
      setName('');
      setAddress('');
      setShowAdd(false);
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Properties</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Switch or manage your tracked homes
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            {properties.map((p) => {
              const isSelected = currentProperty?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setCurrentProperty(p);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold">{p.name}</h4>
                    {p.address && <p className="text-xs text-slate-500 dark:text-slate-400">{p.address}</p>}
                    <span className="text-[10px] text-slate-400">Currency: {p.currency_symbol}</span>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-sky-600 dark:text-sky-400" />}
                </div>
              );
            })}
          </div>

          {/* Add Property Form */}
          {showAdd ? (
            <form onSubmit={handleCreate} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white">Add New Property</h4>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">Property Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Holiday Cottage"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">Address (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 10 Seaside Lane, St Ives"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">Currency Symbol</label>
                <select
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                >
                  <option value="£">£ (GBP)</option>
                  <option value="$">$ (USD)</option>
                  <option value="€">€ (EUR)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-sm"
                >
                  {loading ? 'Creating...' : 'Create Property'}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-500 hover:text-sky-600 text-xs font-semibold flex items-center justify-center transition"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Another Property
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
