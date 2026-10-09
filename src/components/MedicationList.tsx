import React, { useState } from 'react';
import {
  Pill,
  Plus,
  Clock,
  Calendar,
  Edit,
  Trash2,
  Check,
  AlertCircle,
  X,
  History,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  CheckCheck,
  FileText,
  ShieldAlert,
  Bell,
  RefreshCw,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Medication, HistoryEvent } from '../types';
import { api } from '../services/api';
import { BackButton } from './BackButton';

interface MedicationListProps {
  medications: Medication[];
  patientId?: string;
  onAddMedication: (med: Partial<Medication>) => Promise<void>;
  onUpdateMedication: (id: string, updates: Partial<Medication>) => Promise<void>;
  onDeleteMedication: (id: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  onRefreshData?: () => void;
}

export const MedicationList: React.FC<MedicationListProps> = ({
  medications,
  patientId = 'p-101',
  onAddMedication,
  onUpdateMedication,
  onDeleteMedication,
  isAddModalOpen,
  setIsAddModalOpen,
  onRefreshData,
}) => {
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [scheduleTimeInput, setScheduleTimeInput] = useState('08:00 AM');
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(['08:00 AM']);
  const [instructions, setInstructions] = useState('');
  const [category, setCategory] = useState('General Health');
  const [pillColor, setPillColor] = useState('bg-blue-600');
  const [loading, setLoading] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);

  // Per-medication dose logging loading/action state
  const [actionLoadingMedId, setActionLoadingMedId] = useState<string | null>(null);
  const [actionStatusFeedback, setActionStatusFeedback] = useState<Record<string, { type: 'TAKEN' | 'MISSED' | 'ERROR'; message: string }>>({});

  // Delete Confirmation Modal
  const [medToDelete, setMedToDelete] = useState<Medication | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modal for individual medication history
  const [selectedHistoryMed, setSelectedHistoryMed] = useState<Medication | null>(null);
  const [medHistoryEvents, setMedHistoryEvents] = useState<HistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleAddScheduleTime = () => {
    if (scheduleTimeInput && !scheduleTimes.includes(scheduleTimeInput)) {
      setScheduleTimes([...scheduleTimes, scheduleTimeInput]);
    }
  };

  const handleRemoveScheduleTime = (timeStr: string) => {
    setScheduleTimes(scheduleTimes.filter((t) => t !== timeStr));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineName || !dosage || scheduleTimes.length === 0) return;

    setLoading(true);
    try {
      if (editingMed) {
        await onUpdateMedication(editingMed.id, {
          medicineName,
          dosage,
          scheduleTimes,
          instructions,
          category,
          pillColor,
        });
      } else {
        await onAddMedication({
          patientId,
          medicineName,
          dosage,
          scheduleTimes,
          instructions,
          category,
          pillColor,
          startDate: new Date().toISOString().split('T')[0],
          isActive: true,
        });
      }
      setIsAddModalOpen(false);
      resetForm();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to save medication:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMedicineName('');
    setDosage('');
    setScheduleTimes(['08:00 AM']);
    setInstructions('');
    setCategory('General Health');
    setPillColor('bg-blue-600');
    setEditingMed(null);
  };

  const openEdit = (med: Medication) => {
    setEditingMed(med);
    setMedicineName(med.medicineName);
    setDosage(med.dosage);
    setScheduleTimes(med.scheduleTimes || ['08:00 AM']);
    setInstructions(med.instructions || '');
    setCategory(med.category || 'General Health');
    setPillColor(med.pillColor || 'bg-blue-600');
    setIsAddModalOpen(true);
  };

  // Open History modal for a single medication
  const openMedicationHistory = async (med: Medication) => {
    setSelectedHistoryMed(med);
    setHistoryLoading(true);
    try {
      const history = await api.getMedicationHistory(med.id);
      setMedHistoryEvents(history || []);
    } catch (err) {
      console.error('Failed to load medication history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Quick Dose Action handler (Log Taken / Log Missed)
  const handleQuickDoseStatus = async (med: Medication, status: 'TAKEN' | 'MISSED') => {
    setActionLoadingMedId(med.id);
    try {
      const primaryTime = med.scheduleTimes[0] || '08:00 AM';
      const res = await api.updateAdherenceStatus({
        patientId: med.patientId || patientId,
        medicationId: med.id,
        status,
        scheduledTime: primaryTime,
      });

      const feedbackMsg = status === 'TAKEN' ? '✓ Dose logged as Taken' : '✕ Dose logged as Missed';

      setActionStatusFeedback((prev) => ({
        ...prev,
        [med.id]: {
          type: status,
          message: feedbackMsg,
        },
      }));

      setTimeout(() => {
        setActionStatusFeedback((prev) => {
          const copy = { ...prev };
          delete copy[med.id];
          return copy;
        });
      }, 4500);

      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to update dose status:', err);
      setActionStatusFeedback((prev) => ({
        ...prev,
        [med.id]: {
          type: 'ERROR',
          message: 'Unable to save medication status. Please try again.',
        },
      }));
    } finally {
      setActionLoadingMedId(null);
    }
  };

  // Toggle active / paused status
  const handleToggleActive = async (med: Medication) => {
    setActionLoadingMedId(med.id);
    try {
      await onUpdateMedication(med.id, {
        isActive: !med.isActive,
      });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to toggle medication active status:', err);
    } finally {
      setActionLoadingMedId(null);
    }
  };

  // Complete medication course
  const handleCompleteMedication = async (med: Medication) => {
    setActionLoadingMedId(med.id);
    try {
      await api.completeMedication(med.id);
      setActionStatusFeedback((prev) => ({
        ...prev,
        [med.id]: {
          type: 'TAKEN',
          message: 'Prescription course marked completed. History retained.',
        },
      }));
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to complete medication:', err);
    } finally {
      setActionLoadingMedId(null);
    }
  };

  // Confirm and delete medication
  const handleConfirmDelete = async () => {
    if (!medToDelete) return;
    setDeleteLoading(true);
    try {
      await onDeleteMedication(medToDelete.id);
      setMedToDelete(null);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to delete medication:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Back Action */}
      <div className="flex items-center justify-between">
        <BackButton fallbackLabel="Back to Dashboard" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              EHR Source of Truth
            </span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Firebase Synchronized
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2 mt-1">
            <Pill className="w-7 h-7 text-blue-600" />
            <span>Medication Management Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure active prescriptions, intake times, and automatically synchronize patient dose tracking audit trails.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Medication</span>
        </button>
      </div>

      {/* Medication Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {medications.map((med) => {
          const feedback = actionStatusFeedback[med.id];
          const isProcessing = actionLoadingMedId === med.id;

          return (
            <div
              key={med.id}
              className={`bg-white rounded-2xl p-6 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                med.isActive ? 'border-slate-200' : 'border-slate-200 bg-slate-50/60 opacity-85'
              }`}
            >
              <div>
                {/* Category & Active Status */}
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                    {med.category || 'General Care'}
                  </span>
                  {med.isActive ? (
                    <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Active Schedule</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-xs font-semibold text-slate-400">
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>Paused / Completed</span>
                    </span>
                  )}
                </div>

                {/* Title & Pill Icon */}
                <div className="flex items-start space-x-3 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                      med.pillColor || 'bg-blue-600'
                    }`}
                  >
                    <Pill className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{med.medicineName}</h3>
                    <p className="text-xs font-semibold text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded mt-0.5">
                      Dosage: {med.dosage}
                    </p>
                  </div>
                </div>

                {/* Schedule Times */}
                <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs font-semibold text-slate-600 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Daily Intake Schedule:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {med.scheduleTimes.map((time, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs"
                      >
                        {time}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Real-time Dose Status Feedback Banner */}
                {feedback && (
                  <div
                    className={`mb-4 p-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 border animate-in fade-in duration-150 ${
                      feedback.type === 'TAKEN'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : feedback.type === 'MISSED'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {feedback.type === 'TAKEN' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : feedback.type === 'MISSED' ? (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>{feedback.message}</span>
                  </div>
                )}

                {/* Quick Adherence Dose Actions */}
                {med.isActive && (
                  <div className="mb-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 block mb-2">
                      Real-Time Dose Action:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleQuickDoseStatus(med, 'TAKEN')}
                        disabled={isProcessing}
                        className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center justify-center space-x-1.5 transition-all shadow-2xs disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>{isProcessing ? 'Saving...' : 'Log Taken'}</span>
                      </button>
                      <button
                        onClick={() => handleQuickDoseStatus(med, 'MISSED')}
                        disabled={isProcessing}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-800 font-bold text-xs border border-rose-200 flex items-center justify-center space-x-1.5 transition-all shadow-2xs disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <RefreshCw className="w-3.5 h-3.5 text-rose-600 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>{isProcessing ? 'Saving...' : 'Log Missed'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                {med.instructions && (
                  <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-4">
                    "{med.instructions}"
                  </p>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => openMedicationHistory(med)}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 flex items-center space-x-1.5 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View History</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleToggleActive(med)}
                      disabled={isProcessing}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title={med.isActive ? 'Pause Medication Schedule' : 'Reactivate Medication Schedule'}
                    >
                      {med.isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4 text-emerald-600" />}
                    </button>
                    <button
                      onClick={() => openEdit(med)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit Medication"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setMedToDelete(med)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Medication"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {med.isActive && (
                  <button
                    onClick={() => handleCompleteMedication(med)}
                    disabled={isProcessing}
                    className="w-full py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Mark Prescription Course Completed</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Delete Confirmation Modal */}
      {medToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Remove Medication</h3>
                <p className="text-xs text-slate-500">Confirm prescription removal</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to remove <strong className="text-slate-900 font-bold">{medToDelete.medicineName} ({medToDelete.dosage})</strong>?
              <br />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Pursuant to healthcare data retention policies, all historical dose logs and adherence records will remain safely preserved in your audit trail.
              </span>
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMedToDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center space-x-1.5"
              >
                {deleteLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{deleteLoading ? 'Removing...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Individual Medication Timeline & History */}
      {selectedHistoryMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setSelectedHistoryMed(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedHistoryMed.medicineName} History & Audit Log
                </h2>
                <p className="text-xs text-slate-500">
                  Dosage: {selectedHistoryMed.dosage} | Category: {selectedHistoryMed.category || 'General'}
                </p>
              </div>
            </div>

            {/* History Events Content */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
              {historyLoading ? (
                <div className="text-center py-10">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Loading synchronized medication events...</p>
                </div>
              ) : medHistoryEvents.length === 0 ? (
                <p className="text-center py-10 text-xs text-slate-500">No history logged for this medication yet.</p>
              ) : (
                medHistoryEvents.map((ev) => (
                  <div key={ev.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{ev.eventTitle}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{ev.createdDate} {ev.actualTime}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">{ev.eventType}</span>
                      <span className="font-semibold text-slate-700">Status: {ev.status}</span>
                      {ev.adherenceImpact && (
                        <span className="text-slate-500">({ev.adherenceImpact})</span>
                      )}
                    </div>
                    {ev.notes && <p className="text-slate-600 italic">"{ev.notes}"</p>}
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedHistoryMed(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Medication Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {editingMed ? 'Edit Medication' : 'Add Medication Schedule'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Create an automated adherence schedule for patient logging & caregiver alerts.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medicine Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  placeholder="e.g. Metformin, Lisinopril, Omeprazole"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dosage <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g. 500 mg, 1 tablet, 10 ml"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category / Condition</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="General Health">General Health</option>
                  <option value="Diabetes Care">Diabetes Care</option>
                  <option value="Cardiovascular / Blood Pressure">Cardiovascular / Blood Pressure</option>
                  <option value="Cholesterol Management">Cholesterol Management</option>
                  <option value="Pain Management">Pain Management</option>
                  <option value="Respiratory">Respiratory</option>
                </select>
              </div>

              {/* Schedule Times Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule Intake Times</label>
                <div className="flex items-center space-x-2 mb-2">
                  <select
                    value={scheduleTimeInput}
                    onChange={(e) => setScheduleTimeInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="07:00 AM">07:00 AM (Breakfast)</option>
                    <option value="08:00 AM">08:00 AM (Morning)</option>
                    <option value="09:00 AM">09:00 AM (Morning)</option>
                    <option value="12:00 PM">12:00 PM (Noon)</option>
                    <option value="02:00 PM">02:00 PM (Afternoon)</option>
                    <option value="06:00 PM">06:00 PM (Dinner)</option>
                    <option value="08:00 PM">08:00 PM (Evening)</option>
                    <option value="09:00 PM">09:00 PM (Night)</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddScheduleTime}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl hover:bg-blue-100"
                  >
                    Add Time
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {scheduleTimes.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveScheduleTime(t)}
                        className="p-0.5 hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Special Instructions / Notes</label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Take with food or full glass of water."
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
                  {loading ? 'Saving...' : editingMed ? 'Update Medication' : 'Save Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
