import React, { useState } from 'react';
import { Activity, Plus, Trash2, Calendar, AlertTriangle, X } from 'lucide-react';
import { Symptom } from '../types';
import { BackButton } from './BackButton';

interface SymptomTrackerProps {
  symptoms: Symptom[];
  patientId: string;
  onAddSymptom: (data: {
    patientId: string;
    symptomText: string;
    severity: 'mild' | 'moderate' | 'severe';
    notes?: string;
    date?: string;
  }) => Promise<void>;
  onDeleteSymptom: (id: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const SymptomTracker: React.FC<SymptomTrackerProps> = ({
  symptoms,
  patientId,
  onAddSymptom,
  onDeleteSymptom,
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const [symptomText, setSymptomText] = useState('');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomText) return;

    setLoading(true);
    try {
      await onAddSymptom({
        patientId,
        symptomText,
        severity,
        notes,
        date: new Date().toISOString().split('T')[0],
      });
      setSymptomText('');
      setSeverity('mild');
      setNotes('');
      setIsAddModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Back Action */}
      <div className="flex items-center justify-between">
        <BackButton fallbackLabel="Back to Dashboard" />
      </div>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Activity className="w-7 h-7 text-blue-600" />
            <span>Symptom & Health Journal</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Log physical symptoms, medication side-effects, and daily wellness notes for AI analysis & caregiver visibility.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Symptom</span>
        </button>
      </div>

      {/* Symptoms List */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Logged Symptoms History</h2>

        {symptoms.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No symptoms logged yet</p>
            <p className="text-xs text-slate-500 mt-1">Record any mild or moderate symptoms to keep a clear timeline.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {symptoms.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{s.symptomText}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        s.severity === 'severe'
                          ? 'bg-rose-100 text-rose-800'
                          : s.severity === 'moderate'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {s.severity} Severity
                    </span>
                  </div>
                  {s.notes && <p className="text-xs text-slate-600 mt-1">{s.notes}</p>}
                  <span className="text-[10px] text-slate-400 mt-1.5 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" /> Logged on {s.date}
                  </span>
                </div>

                <button
                  onClick={() => onDeleteSymptom(s.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete Entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Symptom Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-slate-900 mb-1">Record Health Symptom</h2>
            <p className="text-xs text-slate-500 mb-4">
              Log symptoms to provide context for AI risk analysis & authorized family caregivers.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Symptom Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={symptomText}
                  onChange={(e) => setSymptomText(e.target.value)}
                  placeholder="e.g. Mild dizziness, dry cough, stomach upset"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Severity Level</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSeverity('mild')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      severity === 'mild'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Mild
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeverity('moderate')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      severity === 'moderate'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Moderate
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeverity('severe')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      severity === 'severe'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Severe
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Occurred after morning walk, lasted 15 minutes."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  {loading ? 'Logging...' : 'Save Symptom Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
