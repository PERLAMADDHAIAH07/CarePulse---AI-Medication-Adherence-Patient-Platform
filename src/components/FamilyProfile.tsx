import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Shield,
  Eye,
  Bell,
  Lock,
  Heart,
  Pill,
  AlertTriangle,
  Activity,
  Phone,
  Mail,
  Calendar,
  LogOut,
  Trash2,
  ChevronRight,
  RefreshCw,
  Unlink,
  CheckCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../services/api';
import { BackButton } from './BackButton';

interface FamilyProfileProps {
  currentUser: UserType;
  onLogout?: () => void;
  onNavigate?: (tab: string) => void;
}

export const FamilyProfile: React.FC<FamilyProfileProps> = ({
  currentUser,
  onLogout,
  onNavigate,
}) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>({
    userId: currentUser.id,
    fullName: currentUser.name || 'Marcus Johnson',
    email: currentUser.email || 'marcus.j@example.com',
    phone: currentUser.phone || '+1 (555) 987-6543',
    relationship: 'Brother / Caregiver',
    connectedPatientId: currentUser.linkedPatientId || 'p-101',
    connectionStatus: 'ACTIVE',
    permissionLevel: 'FULL_ACCESS',
    connectionDate: '2026-02-01T14:30:00Z',
    lastLogin: new Date().toISOString(),
    preferredContactMethod: 'SMS & Push Notifications',
    emergencyContact: true,
    avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    notes: 'Primary caregiver for patient medication adherence.',
  });

  const [permissions, setPermissions] = useState<any>({
    userId: currentUser.id,
    connectionStatus: 'ACTIVE',
    permissionLevel: 'Caregiver - Full Monitoring',
    permissions: {
      medicationStatus: true,
      adherencePercentage: true,
      missedDoseAlerts: true,
      riskLevel: true,
      symptoms: true,
      healthUpdates: true,
      privateNotes: false,
      aiConversations: false,
    },
    readOnlyAccess: true,
    canEditPatientData: false,
  });

  const [patientSummary, setPatientSummary] = useState<any>({
    patientId: 'p-101',
    patientName: 'Sarah Johnson',
    patientStatus: 'Stable & Compliant',
    todayMedicationStatus: '3 of 4 Doses Taken',
    adherencePercentage: 95.5,
    aiRiskLevel: 'LOW RISK',
    missedDoseAlerts: 0,
    lastDoseTakenTime: '08:00 AM Today (Metformin 500mg)',
    nextDoseTime: '08:00 PM Today (Metformin 500mg)',
    attendingPhysician: 'Dr. Evelyn Vance, MD',
  });

  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, [currentUser.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profData, permData, sumData] = await Promise.all([
        api.getFamilyProfile(currentUser.id).catch(() => null),
        api.getFamilyProfilePermissions(currentUser.id).catch(() => null),
        api.getFamilyPatientSummary(currentUser.id).catch(() => null),
      ]);

      if (profData) {
        setProfile((prev: any) => ({ ...prev, ...profData }));
      }
      if (permData) setPermissions(permData);
      if (sumData) setPatientSummary(sumData);
    } catch (err) {
      console.error('Error loading family profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectPatient = () => {
    if (confirm(`Are you sure you want to disconnect from patient ${patientSummary.patientName}? You will lose monitoring access.`)) {
      triggerToast(`Disconnected from ${patientSummary.patientName}. You can reconnect with a new invite code.`);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Back Action */}
      <div className="flex items-center justify-between">
        <BackButton fallbackLabel="Back to Dashboard" />
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-3 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* FAMILY MEMBER HERO HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-800/40">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="relative">
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-emerald-500/40 shadow-2xl"
              />
              <span className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md">
                Caregiver
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{profile.fullName}</h1>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Family ID: {profile.userId}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {profile.relationship}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 flex items-center space-x-3 pt-1">
                <span className="flex items-center space-x-1"><Mail className="w-3.5 h-3.5 text-emerald-400" /> <span>{profile.email}</span></span>
                <span>•</span>
                <span className="flex items-center space-x-1"><Phone className="w-3.5 h-3.5 text-emerald-400" /> <span>{profile.phone}</span></span>
              </p>

              <div className="flex items-center space-x-4 text-xs text-slate-400 pt-2 flex-wrap gap-2">
                <span>Monitoring Patient: <strong className="text-emerald-300">{patientSummary.patientName}</strong></span>
                <span>•</span>
                <span>Access Granted: <strong className="text-white">{new Date(profile.connectionDate).toLocaleDateString()}</strong></span>
                <span>•</span>
                <span>Permission Level: <strong className="text-teal-300">{permissions.permissionLevel}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center space-x-2 backdrop-blur-md">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>View-Only Profile</span>
            </div>
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md"
              title="Refresh Profile Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* CONNECTED PATIENT QUICK OVERVIEW STRIP */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-slate-50 rounded-3xl p-6 border border-teal-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-teal-200/60 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Connected Patient Overview: <span className="text-emerald-800">{patientSummary.patientName}</span>
              </h2>
              <p className="text-xs text-slate-500">Live monitoring feed linked to your family member profile</p>
            </div>
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate('patient-overview')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-1"
            >
              <span>View Full Patient Dashboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Patient Status</span>
            <span className="font-extrabold text-emerald-700 block mt-1">{patientSummary.patientStatus}</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Today's Dose Status</span>
            <span className="font-extrabold text-teal-700 block mt-1">{patientSummary.todayMedicationStatus}</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Adherence Score</span>
            <span className="font-black text-emerald-600 text-base block mt-0.5">{patientSummary.adherencePercentage}%</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">AI Risk Level</span>
            <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded block w-fit mt-1">
              {patientSummary.aiRiskLevel}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Missed Dose Alerts</span>
            <span className="font-extrabold text-emerald-700 block mt-1">{patientSummary.missedDoseAlerts} Active</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Attending Physician</span>
            <span className="font-bold text-slate-800 block mt-1 truncate">{patientSummary.attendingPhysician}</span>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN DETAILS & PERMISSIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: CAREGIVER DETAILS & READ-ONLY PERMISSIONS */}
        <div className="lg:col-span-2 space-y-6">
          {/* PERMISSIONS MATRIX */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  <span>Granted Monitoring Permissions & Controls</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Read-Only monitoring rules managed directly by patient <strong className="text-slate-800">{patientSummary.patientName}</strong>
                </p>
              </div>

              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black rounded-full uppercase">
                Read-Only Access
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Medication Schedule & Doses</span>
                  <span className="text-[10px] text-slate-500">View real-time medication intake status</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                  ALLOWED
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Adherence Rate & Analytics</span>
                  <span className="text-[10px] text-slate-500">View daily/weekly compliance charts</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                  ALLOWED
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Missed Dose FCM Push Alerts</span>
                  <span className="text-[10px] text-slate-500">Instant notifications for missed doses</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                  ALLOWED
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">AI Risk Level Score</span>
                  <span className="text-[10px] text-slate-500">View automated predictive risk assessments</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                  ALLOWED
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Symptom & Health Logs</span>
                  <span className="text-[10px] text-slate-500">View reported patient side-effects</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                  ALLOWED
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Private Physician Notes</span>
                  <span className="text-[10px] text-slate-500">Confidential clinical consultation notes</span>
                </div>
                <span className="px-2.5 py-1 bg-slate-200 text-slate-600 text-[10px] font-extrabold rounded-md">
                  RESTRICTED
                </span>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900 space-y-1">
              <p className="font-bold flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-blue-600" />
                <span>Patient Data Protection Policy</span>
              </p>
              <p className="text-[11px] text-blue-800">
                As a family caregiver, you possess Read-Only monitoring access. You cannot edit, delete, or alter the patient's prescription schedules. If you suspect an error, please reach out directly to {patientSummary.patientName} or their attending physician.
              </p>
            </div>
          </div>

          {/* CAREGIVER SETTINGS & PREFERENCES */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>Caregiver Contact & Alert Settings</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Preferred Contact Channel</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{profile.preferredContactMethod}</span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Emergency Contact Status</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 w-fit block mt-0.5">
                  Designated Emergency Caregiver
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Caregiver Notes</span>
                <p className="text-slate-700 font-medium mt-0.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  {profile.notes}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 1 COL: QUICK ACTIONS & ACCOUNT DISCONNECT */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Caregiver Navigation</span>
            </h3>

            <div className="space-y-2 text-xs">
              {onNavigate && (
                <>
                  <button
                    onClick={() => onNavigate('patient-overview')}
                    className="w-full p-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 rounded-xl font-bold transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center space-x-2">
                      <Heart className="w-4 h-4 text-emerald-600" />
                      <span>Patient Monitoring Dashboard</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => onNavigate('monitoring')}
                    className="w-full p-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 rounded-xl font-bold transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center space-x-2">
                      <Pill className="w-4 h-4 text-emerald-600" />
                      <span>Medication Adherence Feed</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => onNavigate('notifications')}
                    className="w-full p-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 rounded-xl font-bold transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-emerald-600" />
                      <span>Caregiver Push Notifications</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => onNavigate('settings')}
                    className="w-full p-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 rounded-xl font-bold transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-emerald-600" />
                      <span>Account & Security Settings</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </>
              )}

              <button
                onClick={handleDisconnectPatient}
                className="w-full p-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl font-bold transition-colors flex items-center justify-between mt-2"
              >
                <span className="flex items-center space-x-2">
                  <Unlink className="w-4 h-4 text-amber-600" />
                  <span>Disconnect Connected Patient</span>
                </span>
                <ChevronRight className="w-4 h-4 text-amber-500" />
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold transition-colors flex items-center justify-between mt-4"
                >
                  <span className="flex items-center space-x-2">
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Sign Out of Family Account</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-rose-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
