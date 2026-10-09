import React from 'react';
import {
  ShieldCheck,
  Bell,
  Clock,
  Pill,
  TrendingUp,
  Activity,
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react';
import {
  User,
  Medication,
  AdherenceLog,
  AdherenceSummary,
  RiskAssessment,
  Symptom,
  AlertNotification,
  FamilyConnection,
} from '../types';

interface FamilyDashboardProps {
  caregiver: User;
  linkedPatient: User;
  connection?: FamilyConnection;
  medications: Medication[];
  logs: AdherenceLog[];
  summary: AdherenceSummary;
  riskLevel: RiskAssessment;
  symptoms: Symptom[];
  notifications: AlertNotification[];
}

export const FamilyDashboard: React.FC<FamilyDashboardProps> = ({
  caregiver,
  linkedPatient,
  connection,
  medications,
  logs,
  summary,
  riskLevel,
  symptoms,
  notifications,
}) => {
  const permissions = connection?.permissions || {
    medicationStatus: true,
    adherencePercentage: true,
    missedDoseAlerts: true,
    riskLevel: true,
    symptoms: true,
    healthUpdates: true,
    privateNotes: false,
    aiConversations: false,
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter((l) => l.scheduledDate === todayStr);
  const missedAlerts = notifications.filter((n) => n.type === 'MISSED_DOSE');

  return (
    <div className="space-y-6 pb-12">
      {/* Caregiver Portal Hero Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4 sm:space-x-5">
            <img
              src={linkedPatient.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80'}
              alt={linkedPatient.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-blue-500/30 shadow-lg"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Caregiver Monitoring Mode
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Linked as: {connection?.relationship || 'Son / Caregiver'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                Monitoring Patient: {linkedPatient.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg">
                Real-time adherence overview and missed-dose alerts authorized by {linkedPatient.name.split(' ')[0]}.
              </p>
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-between min-w-[180px]">
            <span className="text-xs font-semibold text-slate-400">Caregiver Access</span>
            <div className="flex items-center space-x-2 mt-2 text-emerald-400 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Patient Verified</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Read-Only Monitoring</p>
          </div>
        </div>
      </div>

      {/* Read-only Security Notice Banner */}
      <div className="bg-slate-100 text-slate-800 p-4 rounded-xl border border-slate-200 text-xs flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-2.5">
          <Lock className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong className="text-slate-900">Caregiver Boundary Notice:</strong> You are viewing permitted health data for {linkedPatient.name}. You cannot alter medications or modify logs.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2.5 py-1 bg-white rounded-lg text-[10px] font-mono text-blue-700 border border-slate-200">
          SECURE PERMISSIONS ACTIVE
        </span>
      </div>

      {/* Grid: Medication Status & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Medication Status */}
          {permissions.medicationStatus ? (
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <Pill className="w-5 h-5 text-blue-600" />
                    <span>Today's Medication Status for {linkedPatient.name.split(' ')[0]}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Live schedule logs updated by patient</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                  {todayLogs.filter((l) => l.status === 'TAKEN').length}/{todayLogs.length} Doses Taken
                </span>
              </div>

              <div className="space-y-3">
                {todayLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between ${
                      log.status === 'TAKEN'
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : log.status === 'MISSED'
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                          log.status === 'TAKEN'
                            ? 'bg-emerald-600'
                            : log.status === 'MISSED'
                            ? 'bg-rose-600'
                            : 'bg-blue-600'
                        }`}
                      >
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm sm:text-base">
                            {log.medicineName}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                            {log.dosage}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 mt-0.5 block">
                          Scheduled time: {log.scheduledTime}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase inline-flex items-center ${
                          log.status === 'TAKEN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'MISSED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {log.status === 'TAKEN' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        ) : log.status === 'MISSED' ? (
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 mr-1" />
                        )}
                        <span>{log.status}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center">
              <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Medication Status Hidden</p>
              <p className="text-xs text-slate-500 mt-1">Patient has disabled Medication Status for caregivers.</p>
            </div>
          )}

          {/* Missed Dose Alerts Feed */}
          {permissions.missedDoseAlerts && (
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center space-x-2">
                <Bell className="w-5 h-5 text-rose-600" />
                <span>Missed Dose Caregiver Alerts</span>
              </h2>

              {missedAlerts.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No missed dose alerts recorded.</p>
              ) : (
                <div className="space-y-3">
                  {missedAlerts.map((n) => (
                    <div
                      key={n.id}
                      className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900 flex items-start space-x-3"
                    >
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-xs sm:text-sm block">{n.title}</span>
                        <p className="text-xs text-rose-800 mt-0.5">{n.message}</p>
                        <span className="text-[10px] text-rose-600 mt-1 block font-mono">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Adherence %, Risk Level & Symptoms */}
        <div className="space-y-6">
          {/* Adherence Rate */}
          {permissions.adherencePercentage && (
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Adherence Rate</span>
              </h3>
              <div className="text-center py-3 bg-blue-50/60 rounded-2xl border border-blue-100">
                <span className="text-3xl font-black text-blue-900 block">{summary.weeklyPercentage}%</span>
                <span className="text-xs text-blue-700 font-semibold mt-0.5 block">Weekly Compliance</span>
              </div>
            </div>
          )}

          {/* AI Risk Level */}
          {permissions.riskLevel && (
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 text-sm">AI Risk Assessment</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                    riskLevel.riskLevel === 'HIGH RISK'
                      ? 'bg-rose-600 text-white'
                      : riskLevel.riskLevel === 'MEDIUM RISK'
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {riskLevel.riskLevel}
                </span>
              </div>
              <ul className="space-y-1 text-xs text-slate-600">
                {riskLevel.reasons.map((r, idx) => (
                  <li key={idx} className="flex items-start space-x-1.5">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Symptoms */}
          {permissions.symptoms && (
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Permitted Health Updates</span>
              </h3>
              {symptoms.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No symptoms recorded by patient.</p>
              ) : (
                <div className="space-y-2">
                  {symptoms.slice(0, 3).map((s) => (
                    <div key={s.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{s.symptomText}</span>
                        <span className="text-[10px] text-slate-400">{s.date}</span>
                      </div>
                      {s.notes && <p className="text-[11px] text-slate-500 mt-0.5">{s.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
