import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Info,
  Calendar,
  Pill,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  FileText,
  Activity,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { HistoryEvent } from '../types';

interface AdherenceOverviewData {
  patientId: string;
  takenCount: number;
  skippedCount: number;
  notTakenCount: number;
  totalDoses: number;
  takenPercentage: number;
  skippedPercentage: number;
  notTakenPercentage: number;
  overallAdherence: number;
  lastUpdated: string;
}

interface MedicationAdherenceOverviewProps {
  patientId?: string;
  onRefreshParent?: () => void;
  onNavigate?: (tab: string) => void;
}

export const MedicationAdherenceOverview: React.FC<MedicationAdherenceOverviewProps> = ({
  patientId = 'p-101',
  onRefreshParent,
  onNavigate,
}) => {
  const [data, setData] = useState<AdherenceOverviewData | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<HistoryEvent | null>(null);

  const fetchAdherenceData = async () => {
    setLoading(true);
    try {
      const [overviewRes, historyRes] = await Promise.all([
        api.getAdherenceOverview(patientId),
        api.getPatientMedicationHistory(patientId),
      ]);
      setData(overviewRes);
      setHistory(historyRes || []);
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      console.error('Failed to load adherence overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdherenceData();
  }, [patientId]);

  if (!data && loading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs text-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Calculating Medication Adherence...</p>
        <p className="text-xs text-slate-400 mt-1">Aggregating live intake logs and audit trail events.</p>
      </div>
    );
  }

  const taken = data?.takenCount || 0;
  const skipped = data?.skippedCount || 0;
  const notTaken = data?.notTakenCount || 0;
  const total = data?.totalDoses || (taken + skipped + notTaken) || 1;

  const takenPct = data?.takenPercentage || Number(((taken / total) * 100).toFixed(1));
  const skippedPct = data?.skippedPercentage || Number(((skipped / total) * 100).toFixed(1));
  const notTakenPct = data?.notTakenPercentage || Number(((notTaken / total) * 100).toFixed(1));
  const overallPct = data?.overallAdherence || takenPct;

  // SVG Donut Calculations
  const radius = 80;
  const circumference = 2 * Math.PI * radius; // ~502.65
  const strokeWidth = 22;

  // Arc lengths
  const takenLen = (takenPct / 100) * circumference;
  const skippedLen = (skippedPct / 100) * circumference;
  const notTakenLen = (notTakenPct / 100) * circumference;

  // Offset rotations
  const takenOffset = 0;
  const skippedOffset = -takenLen;
  const notTakenOffset = -(takenLen + skippedLen);

  const formattedUpdated = data?.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & HERO MODULE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                EHR Synchronized Meter
              </span>
              <span className="text-xs text-slate-500 font-medium">Auto-Calculated from Audit Trail</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center space-x-2">
              <Activity className="w-6 h-6 text-blue-600" />
              <span>Medication Adherence Overview</span>
            </h2>
          </div>

          <button
            onClick={fetchAdherenceData}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center space-x-2 self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Recalculate Adherence</span>
          </button>
        </div>

        {/* DONUT CHART & 3 STATUS CARDS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* LEFT: ANIMATED DONUT CHART (5 COLS) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50/70 rounded-2xl border border-slate-100 relative">
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 200 200">
                {/* Background Ring */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  className="stroke-slate-200"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />

                {/* GREEN: Taken Slice */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  className={`transition-all duration-700 ease-out cursor-pointer ${
                    hoveredSlice === 'Taken' ? 'opacity-100 stroke-[26px]' : 'opacity-90 hover:opacity-100'
                  }`}
                  stroke="#10B981"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${takenLen} ${circumference}`}
                  strokeDashoffset={takenOffset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredSlice('Taken')}
                  onMouseLeave={() => setHoveredSlice(null)}
                />

                {/* YELLOW: Skipped Slice */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  className={`transition-all duration-700 ease-out cursor-pointer ${
                    hoveredSlice === 'Skipped' ? 'opacity-100 stroke-[26px]' : 'opacity-90 hover:opacity-100'
                  }`}
                  stroke="#EAB308"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${skippedLen} ${circumference}`}
                  strokeDashoffset={skippedOffset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredSlice('Skipped')}
                  onMouseLeave={() => setHoveredSlice(null)}
                />

                {/* RED: Not Taken Slice */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  className={`transition-all duration-700 ease-out cursor-pointer ${
                    hoveredSlice === 'Not Taken' ? 'opacity-100 stroke-[26px]' : 'opacity-90 hover:opacity-100'
                  }`}
                  stroke="#EF4444"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${notTakenLen} ${circumference}`}
                  strokeDashoffset={notTakenOffset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredSlice('Not Taken')}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              </svg>

              {/* CENTER DISPLAY */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
                {hoveredSlice ? (
                  <div className="animate-in fade-in duration-200">
                    <span
                      className={`text-2xl font-black ${
                        hoveredSlice === 'Taken'
                          ? 'text-emerald-600'
                          : hoveredSlice === 'Skipped'
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {hoveredSlice === 'Taken'
                        ? `${takenPct}%`
                        : hoveredSlice === 'Skipped'
                        ? `${skippedPct}%`
                        : `${notTakenPct}%`}
                    </span>
                    <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider mt-0.5">
                      {hoveredSlice} Doses
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold mt-1 block">
                      {hoveredSlice === 'Taken' ? taken : hoveredSlice === 'Skipped' ? skipped : notTaken} / {total} Total Doses
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {overallPct}%
                    </span>
                    <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                      Medication Adherence
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-1">
                      Last Updated: {formattedUpdated}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Slice Legend */}
            <div className="flex items-center justify-center space-x-4 mt-4 text-[11px] font-bold text-slate-600">
              <span
                className="flex items-center space-x-1 cursor-pointer hover:text-emerald-700"
                onMouseEnter={() => setHoveredSlice('Taken')}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Taken ({takenPct}%)</span>
              </span>
              <span
                className="flex items-center space-x-1 cursor-pointer hover:text-amber-700"
                onMouseEnter={() => setHoveredSlice('Skipped')}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Skipped ({skippedPct}%)</span>
              </span>
              <span
                className="flex items-center space-x-1 cursor-pointer hover:text-rose-700"
                onMouseEnter={() => setHoveredSlice('Not Taken')}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Not Taken ({notTakenPct}%)</span>
              </span>
            </div>
          </div>

          {/* RIGHT: THREE STATUS SUMMARY CARDS (7 COLS) */}
          <div className="lg:col-span-7 space-y-3">
            {/* 🟢 TAKEN CARD */}
            <div
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                hoveredSlice === 'Taken'
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20 shadow-md'
                  : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                    Taken Doses
                  </span>
                  <span className="text-xl font-black text-slate-900">{takenPct}%</span>
                  <span className="text-xs text-emerald-700 font-semibold block">{taken} Doses Recorded</span>
                </div>
              </div>
              <div className="text-right text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-white text-emerald-800 font-bold border border-emerald-200 shadow-2xs">
                  Optimal Compliance
                </span>
              </div>
            </div>

            {/* 🟡 SKIPPED CARD */}
            <div
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                hoveredSlice === 'Skipped'
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20 shadow-md'
                  : 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
                    Skipped Doses
                  </span>
                  <span className="text-xl font-black text-slate-900">{skippedPct}%</span>
                  <span className="text-xs text-amber-700 font-semibold block">{skipped} Doses Skipped</span>
                </div>
              </div>
              <div className="text-right text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-white text-amber-800 font-bold border border-amber-200 shadow-2xs">
                  Clinically Logged
                </span>
              </div>
            </div>

            {/* 🔴 NOT TAKEN CARD */}
            <div
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                hoveredSlice === 'Not Taken'
                  ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20 shadow-md'
                  : 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 block">
                    Not Taken / Missed
                  </span>
                  <span className="text-xl font-black text-slate-900">{notTakenPct}%</span>
                  <span className="text-xs text-rose-700 font-semibold block">{notTaken} Missed or Overdue Doses</span>
                </div>
              </div>
              <div className="text-right text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-white text-rose-800 font-bold border border-rose-200 shadow-2xs">
                  Caregiver Alerted
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT MEDICATION HISTORY TIMELINE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Recent Synchronized Medication History</span>
            </h3>
            <p className="text-xs text-slate-500">Live intake events driving adherence calculations</p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('history')}
              className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1"
            >
              <span>Full Audit Trail</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* History Rows Stream */}
        <div className="space-y-2.5">
          {history.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No recent medication history events recorded yet.</p>
            </div>
          ) : (
            history.slice(0, 5).map((ev) => {
              const isTaken = ev.status === 'TAKEN' || ev.status === 'COMPLETED';
              const isSkipped = ev.status === 'SKIPPED';
              const isMissed = ev.status === 'MISSED' || ev.status === 'ALERT';

              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50/20 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`p-2.5 rounded-xl border flex-shrink-0 ${
                        isTaken
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isSkipped
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : isMissed
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      <Pill className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{ev.medicineName}</span>
                        {ev.dosage && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {ev.dosage}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isTaken
                              ? 'bg-emerald-100 text-emerald-800'
                              : isSkipped
                              ? 'bg-amber-100 text-amber-800'
                              : isMissed
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {ev.eventTitle} {ev.notes && `• "${ev.notes}"`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-slate-500 self-end sm:self-center">
                    <span className="font-mono text-[11px] bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                      {ev.scheduledTime || 'Scheduled'} → {ev.actualTime || ev.createdDate}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* EVENT DETAIL MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Medication Event Record</h3>
                <p className="text-xs text-slate-500">Record ID: {selectedEvent.id}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Medicine Name:</span>
                <span className="font-bold text-slate-900">{selectedEvent.medicineName} ({selectedEvent.dosage})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Event Type:</span>
                <span className="font-bold text-blue-700">{selectedEvent.eventType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Intake Status:</span>
                <span className="font-bold text-emerald-700">{selectedEvent.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Scheduled Time:</span>
                <span className="font-mono text-slate-800">{selectedEvent.scheduledTime || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Actual Logged Time:</span>
                <span className="font-mono text-slate-800">{selectedEvent.actualTime || selectedEvent.timestamp}</span>
              </div>
              <div className="pt-1">
                <span className="text-slate-500 font-semibold block mb-0.5">Audit Notes:</span>
                <p className="text-slate-700 italic">{selectedEvent.notes || 'No extra notes recorded.'}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
