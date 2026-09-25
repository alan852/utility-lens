import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { Property } from '../../types';
import { Building, X, Plus, Pencil, Trash2 } from 'lucide-react';

interface PropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PropertyModal: React.FC<PropertyModalProps> = ({ isOpen, onClose }) => {
  const { properties, currentProperty, setCurrentProperty, loadProperties, triggerRefresh } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('£');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingProperty(null);
    setName('');
    setAddress('');
    setCurrencySymbol(currentProperty?.currency_symbol || '£');
    setError(null);
    setShowForm(true);
  };

  const handleStartEdit = (prop: Property) => {
    setEditingProperty(prop);
    setName(prop.name);
    setAddress(prop.address || '');
    setCurrencySymbol(prop.currency_symbol || '£');
    setError(null);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingProperty(null);
    setName('');
    setAddress('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a property name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingProperty) {
        // Edit existing property
        const updated = await api.updateProperty(editingProperty.id, {
          name: name.trim(),
          address: address.trim() || undefined,
          currency_symbol: currencySymbol,
        });
        await loadProperties();
        if (currentProperty?.id === editingProperty.id) {
          setCurrentProperty(updated);
        }
        triggerRefresh();
        handleCancelForm();
      } else {
        // Create new property
        const newProp = await api.createProperty({
          name: name.trim(),
          address: address.trim() || undefined,
          currency_symbol: currencySymbol,
        });
        await loadProperties();
        setCurrentProperty(newProp);
        triggerRefresh();
        handleCancelForm();
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (prop: Property) => {
    if (properties.length <= 1) {
      alert('You must have at least one property in the system.');
      return;
    }

    if (confirm(`Are you sure you want to delete "${prop.name}"? This will permanently delete all associated bills, readings, and tariffs.`)) {
      try {
        setLoading(true);
        await api.deleteProperty(prop.id);
        await loadProperties();
        triggerRefresh();
      } catch (err: any) {
        alert(err.message || 'Failed to delete property');
      } finally {
        setLoading(false);
      }
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
                Add, edit, or remove your household properties
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List & Forms */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Properties List */}
          <div className="space-y-2">
            {properties.map((p) => {
              const isBeingEdited = editingProperty?.id === p.id && showForm;

              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                    isBeingEdited
                      ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-1 ring-sky-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</h4>
                    {p.address && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{p.address}</p>}
                    <span className="text-[10px] text-slate-400 block mt-0.5">Currency: {p.currency_symbol}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleStartEdit(p)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 rounded-lg transition"
                      title="Edit property details"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {properties.length > 1 && (
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition"
                        title="Delete property"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add / Edit Form */}
          {showForm ? (
            <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                {editingProperty ? `Edit "${editingProperty.name}"` : 'Add New Property'}
              </h4>

              {error && (
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">Property Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Home, Holiday Cottage"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">Address (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 42 Green Lane, Bristol, BS1 5AH"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 mb-1 font-medium">Currency Symbol</label>
                <select
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="£">£ (GBP - British Pound)</option>
                  <option value="$">$ (USD - US Dollar)</option>
                  <option value="€">€ (EUR - Euro)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-sm transition"
                >
                  {loading ? 'Saving...' : editingProperty ? 'Save Changes' : 'Create Property'}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={handleStartAdd}
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
