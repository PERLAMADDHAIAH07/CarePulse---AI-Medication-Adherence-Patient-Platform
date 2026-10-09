import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Pill,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  Plus,
  Users,
  Activity,
  AlertTriangle,
  ChevronRight,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react';
import {
  User,
  Medication,
  AdherenceLog,
  AdherenceSummary,
  RiskAssessment,
  Symptom,
  FamilyConnection,
} from '../types';
import { InviteFamilyCard } from './InviteFamilyCard';

interface PatientDashboardProps {
  patient: User;
  medications: Medication[];
  logs: AdherenceLog[];
  summary: AdherenceSummary;
  riskLevel: RiskAssessment;
  symptoms: Symptom[];
  inviteCode: string;
  familyMembers?: FamilyConnection[];
  onCodeChange?: (newCode: string) => void;
  onUpdateDoseStatus: (logId: string, status: 'TAKEN' | 'MISSED') => void;
  onNavigate: (tab: string) => void;
  onOpenAddMedication: () => void;
  onOpenAddSymptom: () => void;
  onOpenRoleModal?: (mode?: 'FAMILY_LOGIN' | 'SELECT') => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  patient,
  medications,
  logs,
  summary,
  riskLevel,
  symptoms,
  inviteCode,
  familyMembers = [],
  onCodeChange,
  onUpdateDoseStatus,
  onNavigate,
  onOpenAddMedication,
  onOpenAddSymptom,
  onOpenRoleModal,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter((l) => l.scheduledDate === todayStr);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH RISK':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-900',
          badge: 'bg-rose-600 text-white',
          accent: 'text-rose-600',
          bar: 'bg-rose-500',
        };
      case 'MEDIUM RISK':
        return {
          bg: 'bg-amber-50/80 border-amber-200 text-amber-900',
          badge: 'bg-amber-500 text-white',
          accent: 'text-amber-600',
          bar: 'bg-amber-500',
        };
      default:
        return {
          bg: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
          badge: 'bg-emerald-600 text-white',
          accent: 'text-emerald-600',
          bar: 'bg-emerald-500',
        };
    }
  };

  const riskStyle = getRiskColor(riskLevel.riskLevel);

  return (
    <div className="space-y-6 pb-12">
      {/* Patient Welcome Hero Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4 sm:space-x-5">
            <img
              src={patient.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80'}
              alt={patient.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-blue-600/20"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  Patient Health Hub
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                Good day, {patient.name.split(' ')[0]} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg">
                You have <strong className="text-slate-800 font-semibold">{medications.length} active medications</strong> scheduled for today. Keep up your adherence routine!
              </p>
            </div>
          </div>

          {/* Quick Invite Code Badge */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between min-w-[220px]">
            <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
              <span>Family Invitation Code</span>
              <Users className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="font-mono font-extrabold text-2xl text-blue-700 tracking-widest uppercase">{inviteCode}</span>
              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                title="Copy Invite Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {onOpenRoleModal && (
              <button
                onClick={() => onOpenRoleModal('FAMILY_LOGIN')}
                className="mt-2 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1"
              >
                <KeyRound className="w-3 h-3" />
                <span>Open Family Login Page &rarr;</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Layout: Today's Meds & Risk Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Medication Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <Pill className="w-5 h-5 text-blue-600" />
                  <span>Today's Medication Schedule</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click TAKEN or MISSED to log dose adherence and notify family caregivers.
                </p>
              </div>
              <button
                onClick={onOpenAddMedication}
                className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition-colors flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medicine</span>
              </button>
            </div>

            {/* Dose list */}
            {todayLogs.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Pill className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No scheduled doses for today</p>
                <p className="text-xs text-slate-500 mt-1">Add a medication to automatically create schedule logs.</p>
                <button
                  onClick={onOpenAddMedication}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Create Medication Schedule
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {todayLogs.map((log) => {
                  const med = medications.find((m) => m.id === log.medicationId);
                  return (
                    <div
                      key={log.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        log.status === 'TAKEN'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : log.status === 'MISSED'
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-white border-slate-200 hover:border-blue-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start space-x-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                            med?.pillColor || 'bg-blue-600'
                          }`}
                        >
                          <Pill className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-sm sm:text-base">
                              {log.medicineName}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {log.dosage}
                            </span>
                            <span className="text-xs font-medium text-slate-500 flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{log.scheduledTime}</span>
                            </span>
                          </div>
                          {med?.instructions && (
                            <p className="text-xs text-slate-500 mt-1 italic">"{med.instructions}"</p>
                          )}
                          {log.status === 'TAKEN' && log.takenAt && (
                            <span className="text-[11px] font-semibold text-emerald-700 mt-1 inline-flex items-center">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Taken at{' '}
                              {new Date(log.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {log.status === 'MISSED' && (
                            <span className="text-[11px] font-semibold text-rose-700 mt-1 inline-flex items-center">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Missed Dose (Family Alert Sent)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <button
                          onClick={() => onUpdateDoseStatus(log.id, 'TAKEN')}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                            log.status === 'TAKEN'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>TAKEN</span>
                        </button>
                        <button
                          onClick={() => onUpdateDoseStatus(log.id, 'MISSED')}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                            log.status === 'MISSED'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          <span>MISSED</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Adherence Summary Bar */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span>Adherence Overview</span>
                </h3>
                <p className="text-xs text-slate-500">Live compliance trends calculated from log history</p>
              </div>
              <button
                onClick={() => onNavigate('analytics')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center"
              >
                <span>Full Stats</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">Today</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{summary.todayPercentage}%</span>
                <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
                  {summary.takenToday}/{summary.totalScheduledToday} Doses
                </span>
              </div>
              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                <span className="text-xs text-blue-700 font-medium block">Weekly Rate</span>
                <span className="text-2xl font-black text-blue-900 mt-1 block">{summary.weeklyPercentage}%</span>
                <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">Past 7 Days</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium block">Monthly Rate</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{summary.monthlyPercentage}%</span>
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Consistent</span>
              </div>
            </div>
          </div>

          {/* Dedicated Invite Family Member Section */}
          <InviteFamilyCard
            patientId={patient.id}
            inviteCode={inviteCode}
            familyMembers={familyMembers}
            onCodeChange={onCodeChange}
          />
        </div>

        {/* Right 1 Col: AI Risk Level & Assistant Launcher */}
        <div className="space-y-6">
          {/* AI Adherence Risk Card */}
          <div className={`rounded-2xl p-6 border shadow-xs ${riskStyle.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className={`w-5 h-5 ${riskStyle.accent}`} />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">AI Adherence Risk</h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${riskStyle.badge}`}>
                {riskLevel.riskLevel}
              </span>
            </div>

            {/* Risk Score Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Risk Indicator Score</span>
                <span>{riskLevel.score}/100</span>
              </div>
              <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${riskStyle.bar}`}
                  style={{ width: `${Math.min(100, Math.max(10, riskLevel.score))}%` }}
                />
              </div>
            </div>

            {/* Key Reasons */}
            <div className="space-y-2 mb-4">
              <span className="text-xs font-semibold text-slate-700 block">Identified Factors:</span>
              <ul className="space-y-1">
                {riskLevel.reasons.map((r, idx) => (
                  <li key={idx} className="text-xs text-slate-700 flex items-start space-x-1.5">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-200/60">
              <span className="text-xs font-semibold text-slate-800 block mb-1">AI Recommendation:</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                {riskLevel.recommendations[0] || 'Keep following your daily medication schedule.'}
              </p>
            </div>
          </div>

          {/* AI Healthcare Assistant Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden border border-slate-800">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Personal AI Assistant</h3>
                <p className="text-xs text-blue-400 font-medium">Context-aware healthcare helper</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Have questions about your Lisinopril dose, adherence trends, or recent dizziness symptoms? Ask your personalized AI assistant anytime.
            </p>
            <button
              onClick={() => onNavigate('ai-assistant')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors shadow-xs flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch AI Healthcare Assistant</span>
            </button>
          </div>

          {/* Recent Symptoms Quick Widget */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Recent Symptoms</span>
              </h3>
              <button
                onClick={onOpenAddSymptom}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center"
              >
                <Plus className="w-3.5 h-3.5 mr-0.5" />
                <span>Log Symptom</span>
              </button>
            </div>

            {symptoms.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No symptoms recorded recently.</p>
            ) : (
              <div className="space-y-2">
                {symptoms.slice(0, 2).map((s) => (
                  <div key={s.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{s.symptomText}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.severity === 'severe'
                            ? 'bg-rose-100 text-rose-700'
                            : s.severity === 'moderate'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {s.severity}
                      </span>
                    </div>
                    {s.notes && <p className="text-[11px] text-slate-500 mt-1">{s.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
