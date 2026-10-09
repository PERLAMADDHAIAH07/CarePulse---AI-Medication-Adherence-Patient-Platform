import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Heart,
  Pill,
  Activity,
  AlertTriangle,
  Shield,
  Users,
  Sparkles,
  Edit3,
  Copy,
  Check,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  FileText,
  MessageSquare,
  Bell,
  Lock,
  LogOut,
  Trash2,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Award,
  Stethoscope,
  X,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../services/api';
import { MedicationAdherenceOverview } from './MedicationAdherenceOverview';
import { BackButton } from './BackButton';

interface PatientProfileProps {
  currentUser: UserType;
  onLogout?: () => void;
  onNavigate?: (tab: string) => void;
}

export const PatientProfile: React.FC<PatientProfileProps> = ({
  currentUser,
  onLogout,
  onNavigate,
}) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>({
    userId: currentUser.id,
    fullName: currentUser.name || 'Sarah Johnson',
    email: currentUser.email || 'sarah.johnson@example.com',
    phone: currentUser.phone || '+1 (555) 234-5678',
    gender: 'Female',
    dateOfBirth: '1982-04-12',
    age: 44,
    bloodGroup: 'O+',
    height: '168 cm (5\'6")',
    weight: '64 kg (141 lbs)',
    emergencyContactName: 'Marcus Johnson (Brother)',
    emergencyContactPhone: '+1 (555) 987-6543',
    address: '742 Evergreen Terrace, San Francisco, CA 94107',
    memberSince: currentUser.createdAt || '2026-01-15T10:00:00Z',
    lastLogin: new Date().toISOString(),
    lastProfileUpdate: new Date().toISOString(),
    medicalConditions: ['Type 2 Diabetes', 'Hypertension', 'Mild Hyperlipidemia'],
    allergies: ['Penicillin', 'Sulfa Drugs'],
    attendingPhysician: 'Dr. Evelyn Vance, MD (UCSF Health)',
    preferredPharmacy: 'CVS Pharmacy #4821 (Market St)',
    avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
    familyInviteCode: currentUser.familyInviteCode || 'A7K9P2',
  });

  const [stats, setStats] = useState<any>({
    totalMedicines: 3,
    activeMedicines: 3,
    todayMedicines: 4,
    adherencePercentage: 95.5,
    completedDoses: 384,
    missedDoses: 18,
    symptomsLoggedCount: 5,
    connectedFamilyMembersCount: 1,
    daysUsingApp: 142,
  });

  const [healthSummary, setHealthSummary] = useState<any>({
    totalMedicines: 3,
    activeMedicines: 3,
    todayMedicines: 4,
    adherencePercentage: 95.5,
    aiRiskLevel: 'LOW RISK',
    missedDoses: 2,
    symptomsLogged: 5,
    familySummary: {
      familyInviteCode: currentUser.familyInviteCode || 'A7K9P2',
      connectedFamilyCount: 1,
      pendingRequestsCount: 0,
      permissionSummary: 'Full Monitoring Access Granted to Caregiver',
    },
    aiSummary: {
      assistantStatus: 'Online & Active',
      conversationCount: 38,
      lastChat: new Date().toISOString(),
      timelineStatus: 'Synchronized with Live Adherence Context',
    },
  });

  const [copiedInvite, setCopiedInvite] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<any>({ ...profile });

  useEffect(() => {
    fetchData();
  }, [currentUser.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profData, statData, summaryData, adhStats] = await Promise.all([
        api.getPatientProfile(currentUser.id).catch(() => null),
        api.getPatientProfileStatistics(currentUser.id).catch(() => null),
        api.getPatientHealthSummary(currentUser.id).catch(() => null),
        api.getAdherenceStatistics(currentUser.id).catch(() => null),
      ]);

      if (profData) {
        setProfile((prev: any) => ({ ...prev, ...profData }));
        setEditForm((prev: any) => ({ ...prev, ...profData }));
      }
      if (adhStats) {
        setStats({
          totalMedicines: adhStats.totalMedicines,
          activeMedicines: adhStats.activeMedicines,
          todayMedicines: adhStats.todayMedicines,
          upcomingMedicines: adhStats.upcomingMedicines,
          adherencePercentage: adhStats.adherencePercentage,
          completedDoses: adhStats.completedDoses,
          skippedDoses: adhStats.skippedDoses,
          missedDoses: adhStats.missedDoses,
          symptomsLoggedCount: adhStats.symptomsLogged,
          daysUsingApp: adhStats.daysActive,
          currentAIRisk: adhStats.currentAIRisk,
        });
        setHealthSummary((prev: any) => ({
          ...prev,
          aiRiskLevel: adhStats.currentAIRisk || 'LOW RISK',
          adherencePercentage: adhStats.adherencePercentage,
        }));
      } else if (statData) {
        setStats(statData);
      }
      if (summaryData) {
        setHealthSummary((prev: any) => ({ ...prev, ...summaryData }));
      }
    } catch (err) {
      console.error('Error fetching patient profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteCode = () => {
    const code = profile.familyInviteCode || currentUser.familyInviteCode;
    navigator.clipboard.writeText(code);
    setCopiedInvite(true);
    triggerToast('Family invitation code copied to clipboard!');
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleRegenerateCode = async () => {
    try {
      const res = await api.regenerateFamilyInviteCode(currentUser.id);
      setProfile((prev: any) => ({ ...prev, familyInviteCode: res.code }));
      triggerToast(`New Family Invite Code generated: ${res.code}`);
    } catch (err) {
      triggerToast('Failed to regenerate invitation code.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.updatePatientProfile({
        userId: currentUser.id,
        ...editForm,
      });
      setProfile(res.profile || editForm);
      setIsEditModalOpen(false);
      triggerToast('Patient profile updated successfully!');
    } catch (err) {
      triggerToast('Failed to update patient profile.');
    } finally {
      setLoading(false);
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

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-3 text-xs font-bold animate-bounce">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* PATIENT PROFILE HERO HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-800/40">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="relative">
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-blue-500/40 shadow-2xl"
              />
              <span className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md">
                Patient Portal
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{profile.fullName}</h1>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Patient ID: {profile.userId}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Blood Group: {profile.bloodGroup}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 flex items-center space-x-3 pt-1">
                <span className="flex items-center space-x-1"><Mail className="w-3.5 h-3.5 text-blue-400" /> <span>{profile.email}</span></span>
                <span>•</span>
                <span className="flex items-center space-x-1"><Phone className="w-3.5 h-3.5 text-blue-400" /> <span>{profile.phone}</span></span>
              </p>

              <div className="flex items-center space-x-4 text-xs text-slate-400 pt-2 flex-wrap gap-2">
                <span>Member Since: <strong className="text-white">{new Date(profile.memberSince).toLocaleDateString()}</strong></span>
                <span>•</span>
                <span>Adherence Rate: <strong className="text-emerald-400">{stats.adherencePercentage}%</strong></span>
                <span>•</span>
                <span>Risk Status: <strong className="text-blue-300">{healthSummary.aiRiskLevel}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center space-x-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Patient Details</span>
            </button>
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

      {/* PATIENT PROFILE STATISTICS GRID - 11 DYNAMIC METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-3">
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Medicines</span>
          <span className="text-lg font-black text-slate-900">{stats.totalMedicines || 4}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Prescriptions</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Today's Medicines</span>
          <span className="text-lg font-black text-blue-600">{stats.todayMedicines || 4}</span>
          <span className="text-[10px] text-blue-600 font-medium block mt-0.5">Scheduled</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Active Medicines</span>
          <span className="text-lg font-black text-emerald-600">{stats.activeMedicines || 4}</span>
          <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">In Treatment</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Completed Doses</span>
          <span className="text-lg font-black text-emerald-700">{stats.completedDoses || 56}</span>
          <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">Taken</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Skipped Doses</span>
          <span className="text-lg font-black text-amber-600">{stats.skippedDoses || 12}</span>
          <span className="text-[10px] text-amber-600 font-medium block mt-0.5">Clinically Skipped</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Missed Doses</span>
          <span className="text-lg font-black text-rose-600">{stats.missedDoses || 8}</span>
          <span className="text-[10px] text-rose-600 font-medium block mt-0.5">Overdue/Missed</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Upcoming Medicines</span>
          <span className="text-lg font-black text-indigo-600">{stats.upcomingMedicines || 2}</span>
          <span className="text-[10px] text-indigo-600 font-medium block mt-0.5">Next 12 Hours</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Adherence Rate</span>
          <span className="text-lg font-black text-emerald-600">{stats.adherencePercentage}%</span>
          <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">Real-Time</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Current AI Risk</span>
          <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded block w-fit mt-1">
            {stats.currentAIRisk || healthSummary.aiRiskLevel || 'LOW RISK'}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Days Active</span>
          <span className="text-lg font-black text-purple-600">{stats.daysUsingApp || 142}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Days Logging</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Symptoms Logged</span>
          <span className="text-lg font-black text-slate-900">{stats.symptomsLoggedCount || 5}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Recorded Entries</span>
        </div>
      </div>

      {/* MEDICATION ADHERENCE OVERVIEW MODULE - ANIMATED DONUT CHART & HISTORY */}
      <MedicationAdherenceOverview
        patientId={currentUser.id}
        onRefreshParent={fetchData}
        onNavigate={onNavigate}
      />

      {/* MAIN TWO-COLUMN DETAILS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: PERSONAL DEMOGRAPHICS & MEDICAL PROFILE */}
        <div className="lg:col-span-2 space-y-6">
          {/* PATIENT PERSONAL DEMOGRAPHICS */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <UserIcon className="w-5 h-5 text-blue-600" />
                <span>Patient Demographics & Medical Profile</span>
              </h2>
              <span className="text-xs text-slate-400">HIPAA Protected Profile Record</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Full Legal Name</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.fullName}</span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Gender & Age</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.gender} ({profile.age} years)</span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Date of Birth</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.dateOfBirth}</span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Blood Group</span>
                <span className="font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-lg border border-red-200 w-fit block mt-0.5">
                  {profile.bloodGroup}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Height & Weight</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{profile.height} / {profile.weight}</span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Emergency Contact</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{profile.emergencyContactName}</span>
                <span className="text-slate-500 font-mono text-[11px]">{profile.emergencyContactPhone}</span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Residential Address</span>
                <span className="font-medium text-slate-800 mt-0.5 block">{profile.address}</span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Preferred Pharmacy</span>
                <span className="font-medium text-slate-800 mt-0.5 block">{profile.preferredPharmacy}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="font-bold text-slate-900 block mb-2 flex items-center space-x-2">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span>Attending Physician</span>
                </span>
                <p className="font-semibold text-slate-800">{profile.attendingPhysician}</p>
                <p className="text-[11px] text-slate-500 mt-1">UCSF Health Care Center • Speciality: Internal Medicine</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="font-bold text-slate-900 block mb-2 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Known Allergies & Conditions</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.allergies.map((all: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">
                      Allergy: {all}
                    </span>
                  ))}
                  {profile.medicalConditions.map((cond: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md">
                      {cond}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* FAMILY INVITATION & CONNECTED CARE TEAM */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Family Connection & Caregiver Sharing</span>
                </h2>
                <p className="text-xs text-slate-500">Share your invitation code to grant caregivers monitoring access</p>
              </div>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('family')}
                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1"
                >
                  <span>Manage Family</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="p-5 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-slate-50 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-extrabold text-blue-800 uppercase tracking-wider block">
                  Your Unique Family Invitation Code
                </span>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-2xl font-black font-mono tracking-widest text-slate-900 bg-white px-4 py-1.5 rounded-xl border border-slate-300 shadow-inner">
                    {profile.familyInviteCode || currentUser.familyInviteCode}
                  </span>
                  <button
                    onClick={handleCopyInviteCode}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all"
                    title="Copy Invitation Code"
                  >
                    {copiedInvite ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleRegenerateCode}
                    className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all text-xs font-bold flex items-center space-x-1"
                    title="Regenerate Code"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                    <span className="hidden sm:inline">Regenerate</span>
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1 text-center sm:text-right">
                <p>Status: <strong className="text-emerald-700">Active Code</strong></p>
                <p>Connected Members: <strong className="text-slate-900">{stats.connectedFamilyMembersCount} Caregiver</strong></p>
                <p>Permission: <strong className="text-blue-800">Full Access</strong></p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 1 COL: AI ASSISTANT SUMMARY & QUICK ACTIONS */}
        <div className="space-y-6">
          {/* AI SUMMARY CARD */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/50 space-y-5">
            <div className="flex items-center justify-between border-b border-indigo-800/60 pb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">AI Assistant Integration</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Online
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-indigo-900/60">
                <span className="text-slate-400">Assistant Status</span>
                <span className="font-bold text-emerald-400">{healthSummary.aiSummary.assistantStatus}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-indigo-900/60">
                <span className="text-slate-400">Total AI Health Chats</span>
                <span className="font-bold text-white">{healthSummary.aiSummary.conversationCount} Sessions</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-indigo-900/60">
                <span className="text-slate-400">Adherence Timeline Sync</span>
                <span className="font-bold text-blue-300">Synchronized</span>
              </div>
            </div>

            {onNavigate && (
              <button
                onClick={() => onNavigate('ai')}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open AI Healthcare Assistant</span>
              </button>
            )}
          </div>

          {/* QUICK ACTIONS & SETTINGS NAVIGATOR */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Patient Quick Actions</span>
            </h3>

            <div className="space-y-2 text-xs">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full p-3 bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-700 rounded-xl font-bold transition-colors flex items-center justify-between"
              >
                <span className="flex items-center space-x-2">
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  <span>Update Medical & Contact Info</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {onNavigate && (
                <>
                  <button
                    onClick={() => onNavigate('documents')}
                    className="w-full p-3 bg-blue-50/70 hover:bg-blue-100 text-blue-900 rounded-xl font-bold transition-colors flex items-center justify-between border border-blue-200/60"
                  >
                    <span className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>📁 Medical Documents & Storage Vault</span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white">Vault</span>
                      <ChevronRight className="w-4 h-4 text-blue-400" />
                    </span>
                  </button>

                  <button
                    onClick={() => onNavigate('history')}
                    className="w-full p-3 bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-700 rounded-xl font-bold transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>View Medical Adherence History</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => onNavigate('settings')}
                    className="w-full p-3 bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-700 rounded-xl font-bold transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-blue-600" />
                      <span>Security & Active Devices</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </>
              )}

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold transition-colors flex items-center justify-between mt-4"
                >
                  <span className="flex items-center space-x-2">
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Sign Out of Patient Account</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-rose-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PATIENT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <span>Edit Patient Medical Profile</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editForm.fullName || ''}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Blood Group</label>
                  <select
                    value={editForm.bloodGroup || 'O+'}
                    onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Height</label>
                  <input
                    type="text"
                    value={editForm.height || ''}
                    onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Weight</label>
                  <input
                    type="text"
                    value={editForm.weight || ''}
                    onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={editForm.emergencyContactName || ''}
                    onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Emergency Contact Phone</label>
                  <input
                    type="text"
                    value={editForm.emergencyContactPhone || ''}
                    onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Attending Physician</label>
                  <input
                    type="text"
                    value={editForm.attendingPhysician || ''}
                    onChange={(e) => setEditForm({ ...editForm, attendingPhysician: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Address</label>
                  <input
                    type="text"
                    value={editForm.address || ''}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
                >
                  {loading ? 'Saving...' : 'Save Patient Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
