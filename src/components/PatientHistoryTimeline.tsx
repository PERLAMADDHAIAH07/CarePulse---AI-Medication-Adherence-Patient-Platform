import React, { useState, useEffect } from 'react';
import {
  Clock,
  Pill,
  Activity,
  Bell,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Sparkles,
  Calendar,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  FileCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Send,
  UserCheck
} from 'lucide-react';
import { HistoryEvent, Medication } from '../types';
import { api } from '../services/api';
import { BackButton } from './BackButton';

interface PatientHistoryTimelineProps {
  patientId?: string;
  medications?: Medication[];
}

export const PatientHistoryTimeline: React.FC<PatientHistoryTimelineProps> = ({
  patientId = 'p-101',
  medications = [],
}) => {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMedicationId, setSelectedMedicationId] = useState<string>('ALL');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistoryEvents(patientId, {
        medicationId: selectedMedicationId !== 'ALL' ? selectedMedicationId : undefined,
        eventType: selectedEventType !== 'ALL' ? selectedEventType : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        search: search.trim() ? search : undefined,
      });
      setEvents(data);
    } catch (err) {
      console.error('Failed to load history events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [patientId, selectedEventType, selectedStatus, selectedMedicationId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHistory();
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  // Group events by date header
  const groupedEvents: { [dateStr: string]: HistoryEvent[] } = {};
  events.forEach((ev) => {
    const key = ev.createdDate === todayStr ? 'Today' : ev.createdDate === yesterdayStr ? 'Yesterday' : ev.createdDate;
    if (!groupedEvents[key]) {
      groupedEvents[key] = [];
    }
    groupedEvents[key].push(ev);
  });

  const getEventBadgeStyle = (eventType: string, status: string) => {
    switch (status) {
      case 'TAKEN':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          statusLabel: 'DOSE TAKEN',
        };
      case 'MISSED':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
          icon: <XCircle className="w-4 h-4 text-rose-600" />,
          statusLabel: 'DOSE MISSED',
        };
      case 'SKIPPED':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          icon: <Info className="w-4 h-4 text-amber-600" />,
          statusLabel: 'CLINICALLY SKIPPED',
        };
      case 'DELAYED':
        return {
          bg: 'bg-orange-50 text-orange-800 border-orange-200',
          dot: 'bg-orange-500',
          icon: <Clock className="w-4 h-4 text-orange-600" />,
          statusLabel: 'INTAKE DELAYED',
        };
      case 'ALERT':
        return {
          bg: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
          dot: 'bg-rose-600 animate-pulse',
          icon: <ShieldAlert className="w-4 h-4 text-rose-600" />,
          statusLabel: 'FAMILY ALERT DISPATCHED',
        };
      case 'CREATED':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500',
          icon: <PlusCircle className="w-4 h-4 text-blue-600" />,
          statusLabel: 'MEDICINE ADDED',
        };
      case 'UPDATED':
      case 'ACTIVATED':
        return {
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dot: 'bg-indigo-500',
          icon: <RefreshCw className="w-4 h-4 text-indigo-600" />,
          statusLabel: 'SCHEDULE UPDATED',
        };
      case 'COMPLETED':
        return {
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          dot: 'bg-purple-500',
          icon: <FileCheck className="w-4 h-4 text-purple-600" />,
          statusLabel: 'COURSE COMPLETED',
        };
      case 'REMINDER':
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-200',
          dot: 'bg-sky-500',
          icon: <Bell className="w-4 h-4 text-sky-600" />,
          statusLabel: 'REMINDER SENT',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
          dot: 'bg-slate-400',
          icon: <Activity className="w-4 h-4 text-slate-600" />,
          statusLabel: status || 'EVENT LOGGED',
        };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Back Action */}
      <div className="flex items-center justify-between">
        <BackButton fallbackLabel="Back to Dashboard" />
      </div>

      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                EHR Audit Trail
              </span>
              <span className="text-xs text-slate-500 font-medium">Real-Time Synchronized Logs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center space-x-3">
              <Clock className="w-7 h-7 text-blue-600" />
              <span>Synchronized Patient History & Audit Trail</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Automatic, tamper-proof medical event stream tracking medication creations, scheduled reminders, dose adherence intake, caregiver alerts, and AI risk calculations.
            </p>
          </div>

          <button
            onClick={loadHistory}
            className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors flex items-center space-x-2 self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Timeline</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by medication, event title, or clinical notes..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
          >
            Filter Search
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter by Medication</label>
            <select
              value={selectedMedicationId}
              onChange={(e) => setSelectedMedicationId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Medications</option>
              {medications.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.medicineName} ({m.dosage})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter by Event Type</label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Event Types</option>
              <option value="DOSE_TAKEN">Dose Taken</option>
              <option value="DOSE_MISSED">Dose Missed</option>
              <option value="DOSE_SKIPPED">Dose Skipped</option>
              <option value="DOSE_DELAYED">Dose Delayed</option>
              <option value="FAMILY_ALERT_SENT">Caregiver Alerts</option>
              <option value="MEDICINE_CREATED">Medicine Added</option>
              <option value="SCHEDULE_CREATED">Schedule Configured</option>
              <option value="REMINDER_SENT">Reminders Sent</option>
              <option value="AI_RISK_UPDATED">AI Risk Updates</option>
              <option value="MEDICATION_COMPLETED">Course Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter by Intake Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="TAKEN">Taken (Success)</option>
              <option value="MISSED">Missed (Alert)</option>
              <option value="SKIPPED">Skipped (Clinical)</option>
              <option value="DELAYED">Delayed</option>
              <option value="CREATED">Created</option>
              <option value="ALERT">Family Alert</option>
              <option value="REMINDER">Reminder</option>
            </select>
          </div>
        </div>
      </div>

      {/* Synchronized History Stream */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Synchronizing Medication History...</p>
            <p className="text-xs text-slate-500 mt-1">Fetching automated audit records from source of truth.</p>
          </div>
        ) : Object.keys(groupedEvents).length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No History Records Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or performing actions in Medication Management.</p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([dateLabel, groupEvents]) => (
            <div key={dateLabel} className="space-y-3">
              {/* Date Section Header */}
              <div className="flex items-center space-x-3 sticky top-0 bg-slate-50/90 backdrop-blur-xs py-2 z-10">
                <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-800 text-white text-xs font-bold shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-blue-300" />
                  <span>{dateLabel}</span>
                </div>
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[11px] font-semibold text-slate-400">{groupEvents.length} Recorded Events</span>
              </div>

              {/* Event Cards Stream */}
              <div className="space-y-3">
                {groupEvents.map((ev) => {
                  const badge = getEventBadgeStyle(ev.eventType, ev.status);
                  const isExpanded = expandedEventId === ev.id;

                  return (
                    <div
                      key={ev.id}
                      className={`bg-white rounded-2xl border transition-all shadow-2xs hover:shadow-xs overflow-hidden ${
                        ev.status === 'ALERT'
                          ? 'border-rose-300 bg-rose-50/20'
                          : ev.status === 'MISSED'
                          ? 'border-rose-200'
                          : ev.status === 'TAKEN'
                          ? 'border-emerald-200'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start space-x-3.5">
                            <div className={`p-2.5 rounded-xl border ${badge.bg} flex-shrink-0 mt-0.5`}>
                              {badge.icon}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm sm:text-base">{ev.eventTitle}</span>
                                <span
                                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${badge.bg}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full mr-1 ${badge.dot}`} />
                                  <span>{badge.statusLabel}</span>
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                                <span className="font-bold text-slate-800 flex items-center space-x-1">
                                  <Pill className="w-3.5 h-3.5 text-blue-600" />
                                  <span>
                                    {ev.medicineName} {ev.dosage && `(${ev.dosage})`}
                                  </span>
                                </span>
                                {ev.scheduledTime && (
                                  <span className="flex items-center space-x-1 text-slate-500">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Scheduled: {ev.scheduledTime}</span>
                                  </span>
                                )}
                                {ev.actualTime && (
                                  <span className="font-medium text-slate-700">
                                    Actual: {ev.actualTime.includes('T') ? new Date(ev.actualTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ev.actualTime}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Impact Badges */}
                          <div className="flex items-center space-x-2 self-end sm:self-center">
                            {ev.adherenceImpact && (
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
                                {ev.adherenceImpact}
                              </span>
                            )}
                            <button
                              onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                              className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                              title="Toggle Details"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Notes Preview */}
                        {ev.notes && (
                          <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                            <span className="font-bold text-slate-700">Audit Notes: </span>
                            <span>{ev.notes}</span>
                          </div>
                        )}

                        {/* Expandable Technical Details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/50 p-3 rounded-xl">
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">AI Risk Impact</span>
                              <span className="font-semibold text-slate-800">{ev.aiRiskImpact || 'Recalculated'}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Reminder Status</span>
                              <span className="font-semibold text-slate-800">{ev.reminderStatus || 'Delivered'}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Notification Status</span>
                              <span className="font-semibold text-slate-800">{ev.notificationStatus || 'Logged'}</span>
                            </div>
                            <div className="sm:col-span-3 text-[10px] font-mono text-slate-400 pt-1">
                              Record ID: {ev.id} | Timestamp: {ev.timestamp}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
