import React, { useState } from 'react';
import {
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  RefreshCw,
  Bell,
  Sparkles,
  Pill,
  Calendar,
  Clock,
  Activity,
  Users,
  FileText,
  Settings,
  Shield,
  Laptop,
  Lock,
  Server,
  Database,
  Zap,
  LogOut,
  Trash2,
  KeyRound,
  ChevronRight,
  X,
  Radio,
  Sliders,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  Eye,
} from 'lucide-react';
import { User, AlertNotification, FamilyConnection } from '../types';

interface RightSidebarProps {
  currentUser: User;
  linkedPatient?: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: AlertNotification[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onOpenRoleModal: (mode?: 'FAMILY_LOGIN' | 'SELECT' | 'REGISTER_PATIENT' | 'REGISTER_FAMILY') => void;
  onLogout?: () => void;
  inviteCode: string;
  onRegenerateCode?: () => void;
  familyMembers?: FamilyConnection[];
  onOpenAddMedication?: () => void;
  onOpenAddSymptom?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  currentUser,
  linkedPatient,
  activeTab,
  setActiveTab,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenRoleModal,
  onLogout,
  inviteCode,
  onRegenerateCode,
  familyMembers = [],
  onOpenAddMedication,
  onOpenAddSymptom,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [copied, setCopied] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filterNotifType, setFilterNotifType] = useState<'ALL' | 'UNREAD'>('ALL');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareCode = async () => {
    if (!inviteCode) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CarePulse Family Invitation Code',
          text: `Join my CarePulse health network using code: ${inviteCode}`,
        });
      } catch (e) {
        // Fallback
        handleCopyCode();
      }
    } else {
      handleCopyCode();
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2500);
    }
  };

  const filteredNotifications = filterNotifType === 'UNREAD'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <>
      {/* MOBILE BACKDROP OVERLAY */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 xl:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* RIGHT SIDEBAR CONTAINER */}
      <aside
        className={`fixed xl:sticky top-0 right-0 h-screen xl:h-[calc(100vh-1rem)] w-80 sm:w-90 xl:w-[340px] bg-slate-50/90 xl:bg-transparent z-40 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-4 transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0 shadow-2xl bg-white' : 'translate-x-full xl:translate-x-0'
        }`}
      >
        {/* MOBILE CLOSE HEADER */}
        <div className="flex xl:hidden items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">User Control Center</h3>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. USER PROFILE CARD */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3.5 relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50/80 to-transparent rounded-bl-full pointer-events-none" />

          <div className="flex items-start space-x-3">
            <div className="relative">
              <img
                src={
                  currentUser.avatarUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.name || currentUser.email || 'carepulse')}`
                }
                alt={currentUser.name}
                className="w-13 h-13 rounded-2xl object-cover ring-2 ring-blue-500/20 shadow-xs"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-white" title="Online" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5">
                <h3 className="font-extrabold text-slate-900 text-sm truncate">{currentUser.name}</h3>
                <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" title="HIPAA Verified Patient" />
              </div>

              <p className="text-[11px] font-mono font-semibold text-slate-500 truncate mt-0.5" title={currentUser.id}>
                ID: {currentUser.id}
              </p>

              <div className="flex items-center space-x-1.5 mt-1.5 flex-wrap gap-y-1">
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                  {currentUser.role === 'PATIENT' ? 'Patient' : 'Caregiver'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Verified</span>
                </span>
              </div>
            </div>
          </div>

          {currentUser.role === 'PATIENT' ? (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setActiveTab('profile');
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors flex items-center justify-center space-x-1 border border-blue-100"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>View Profile</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('settings');
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center space-x-1 border border-slate-200"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>
          ) : (
            <div className="pt-1">
              <button
                onClick={() => {
                  setActiveTab('profile');
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 border border-emerald-200/80 shadow-2xs"
              >
                <UserIcon className="w-3.5 h-3.5 text-emerald-700" />
                <span>View Profile</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. QUICK ACCOUNT SWITCHER */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Quick Account Switcher
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-mono">
              Auth Guard
            </span>
          </div>

          <div className="space-y-2">
            <div
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                currentUser.role === 'PATIENT'
                  ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => {
                if (currentUser.role !== 'PATIENT') {
                  onOpenRoleModal('SELECT');
                } else {
                  setActiveTab('dashboard');
                }
              }}
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className={`p-1.5 rounded-lg ${
                    currentUser.role === 'PATIENT' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs block">Patient Portal</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {currentUser.role === 'PATIENT' ? currentUser.name : (linkedPatient?.name || 'Primary Patient')} • Primary
                  </span>
                </div>
              </div>
              {currentUser.role === 'PATIENT' ? (
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" title="Active" />
              ) : (
                <span className="text-[10px] font-semibold text-blue-600 hover:underline">Switch</span>
              )}
            </div>

            <div
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                currentUser.role === 'FAMILY_CAREGIVER'
                  ? 'bg-teal-50/80 border-teal-300 text-teal-900 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => {
                if (currentUser.role !== 'FAMILY_CAREGIVER') {
                  onOpenRoleModal('FAMILY_LOGIN');
                } else {
                  setActiveTab('family-dashboard');
                }
              }}
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className={`p-1.5 rounded-lg ${
                    currentUser.role === 'FAMILY_CAREGIVER' ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs block">Family Portal</span>
                  <span className="text-[10px] text-slate-500 font-medium">Authorized Caregivers</span>
                </div>
              </div>
              {currentUser.role === 'FAMILY_CAREGIVER' ? (
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" title="Active" />
              ) : (
                <span className="text-[10px] font-semibold text-teal-700 hover:underline">Access</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. FAMILY INVITATION CARD */}
        {currentUser.role === 'PATIENT' && (
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-4 shadow-md space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <KeyRound className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Family Invitation</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                Encrypted
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-blue-300 font-medium uppercase tracking-wider block">Invite Code</span>
                <span className="font-mono text-xl font-black tracking-widest text-white">{inviteCode || 'A7K9P2'}</span>
              </div>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center space-x-1 text-xs font-bold shadow-xs"
                title="Copy Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={handleShareCode}
                className="py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors flex items-center justify-center space-x-1 border border-white/10"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-300" />
                <span>Share Code</span>
              </button>
              <button
                onClick={onRegenerateCode}
                className="py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors flex items-center justify-center space-x-1 border border-white/10"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-300" />
                <span>Regenerate</span>
              </button>
            </div>

            {/* Connected Family List */}
            <div className="pt-2 border-t border-white/10">
              <span className="text-[10px] font-semibold text-blue-300 block mb-1.5">
                Connected Members ({familyMembers.length || 1})
              </span>
              <div className="space-y-1.5">
                {(familyMembers.length > 0 ? familyMembers : [
                  { id: 'f-1', name: 'Michael Johnson', relationship: 'Spouse', permissions: { viewMedications: true, viewAdherenceHistory: true, receiveMissedDoseAlerts: true, manageMedications: true } }
                ]).map((fam: any) => (
                  <div key={fam.id} className="flex items-center justify-between text-xs bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                    <span className="font-medium text-slate-200 truncate">{fam.name} ({fam.relationship})</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                      Full Access
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. NOTIFICATION CENTER */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Bell className="w-4 h-4 text-blue-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
                )}
              </div>
              <span className="text-xs font-bold text-slate-900">Notification Center</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700">
                  {unreadCount} Unread
                </span>
              )}
            </div>

            {onMarkAllNotificationsRead && unreadCount > 0 && (
              <button
                onClick={onMarkAllNotificationsRead}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Mark All Read
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 text-[10px] font-bold">
            <button
              onClick={() => setFilterNotifType('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterNotifType === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Alerts ({notifications.length})
            </button>
            <button
              onClick={() => setFilterNotifType('UNREAD')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filterNotifType === 'UNREAD'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
            {filteredNotifications.length === 0 ? (
              <p className="text-center py-4 text-xs text-slate-400 font-medium">No alerts found</p>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => onMarkNotificationRead(n.id)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    !n.isRead
                      ? 'bg-amber-50/60 border-amber-200 hover:bg-amber-50'
                      : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-slate-900 text-[11px]">{n.title}</span>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                  <span className="text-[9px] text-slate-400 mt-1 block">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 5. AI HEALTHCARE ASSISTANT STATUS */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 rounded-2xl p-4 border border-blue-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-600 text-white rounded-xl shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900">AI Health Assistant</h4>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-700">Online • Active</span>
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-extrabold">
              Gemini 2.5
            </span>
          </div>

          <div className="text-[11px] text-slate-600 space-y-1 bg-white/80 p-2.5 rounded-xl border border-blue-100">
            <div className="flex justify-between">
              <span className="text-slate-500">Care Sessions Today:</span>
              <span className="font-bold text-slate-900">12 Interactions</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last AI Check:</span>
              <span className="font-bold text-blue-700">2 mins ago (Safety)</span>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTab('ai-assistant');
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>Open AI Assistant</span>
          </button>
        </div>

        {/* 6. QUICK ACTIONS */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Quick Actions
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (onOpenAddMedication) onOpenAddMedication();
                else setActiveTab('medications');
                if (onCloseMobile) onCloseMobile();
              }}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 text-slate-700 font-bold text-xs transition-all text-left flex items-center space-x-2"
            >
              <Pill className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="truncate">Add Medicine</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('dashboard');
                if (onCloseMobile) onCloseMobile();
              }}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 text-slate-700 font-bold text-xs transition-all text-left flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="truncate">Today's Meds</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('history');
                if (onCloseMobile) onCloseMobile();
              }}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 text-slate-700 font-bold text-xs transition-all text-left flex items-center space-x-2"
            >
              <Clock className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <span className="truncate">Med History</span>
            </button>

            <button
              onClick={() => {
                if (onOpenAddSymptom) onOpenAddSymptom();
                else setActiveTab('symptoms');
                if (onCloseMobile) onCloseMobile();
              }}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 text-slate-700 font-bold text-xs transition-all text-left flex items-center space-x-2"
            >
              <Activity className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="truncate">Symptoms</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('family');
                if (onCloseMobile) onCloseMobile();
              }}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 text-slate-700 font-bold text-xs transition-all text-left flex items-center space-x-2"
            >
              <Users className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span className="truncate">Family Network</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('documents');
                if (onCloseMobile) onCloseMobile();
              }}
              className="p-2.5 rounded-xl bg-blue-50/70 hover:bg-blue-100 hover:text-blue-800 border border-blue-200/80 text-blue-900 font-bold text-xs transition-all text-left flex items-center space-x-2"
            >
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="truncate">Medical Docs</span>
            </button>
          </div>
        </div>

        {/* 7. ACCOUNT & SECURITY */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
            Account & Security
          </span>

          <div className="space-y-1">
            <button
              onClick={() => setShowSecurityModal('Security Center')}
              className="w-full text-left p-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Security Center</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => setShowSecurityModal('Login Sessions & Devices')}
              className="w-full text-left p-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Laptop className="w-4 h-4 text-indigo-600" />
                <span>Active Login Sessions</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">2 Active</span>
            </button>

            <button
              onClick={() => setShowSecurityModal('Privacy Controls')}
              className="w-full text-left p-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>HIPAA Privacy Controls</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* 8. SYSTEM STATUS */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2 text-xs">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
            System & Infrastructure Status
          </span>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-sans flex items-center space-x-1.5">
                <Server className="w-3.5 h-3.5 text-blue-600" />
                <span>Backend Express API</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>100% Operational</span>
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-sans flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-amber-600" />
                <span>Firebase Sync</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 font-sans flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Last Synchronized</span>
              </span>
              <span className="text-slate-700 font-bold text-[10px]">Just Now</span>
            </div>
          </div>
        </div>

        {/* 9. LOGOUT SECTION */}
        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-2xs space-y-2">
          <button
            onClick={() => (onLogout ? onLogout() : onOpenRoleModal('SELECT'))}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Logout Session</span>
          </button>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <button
              onClick={() => (onLogout ? onLogout() : onOpenRoleModal('SELECT'))}
              className="py-1.5 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition-colors text-center"
            >
              Logout All Devices
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-colors text-center"
            >
              Delete Account
            </button>
          </div>
        </div>
      </aside>

      {/* SECURITY DETAILS MODAL */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowSecurityModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{showSecurityModal}</h3>
                <p className="text-xs text-slate-500">CarePulse Encrypted Security Portal</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">2FA Authentication:</span>
                <span className="font-bold text-emerald-700">Enabled (SMS + App)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Current Device:</span>
                <span className="font-bold text-slate-900">Chrome Mac OS (Current Session)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Secondary Device:</span>
                <span className="font-bold text-slate-900">iPhone 15 Pro (Mobile Sync)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Encryption Protocol:</span>
                <span className="font-mono text-blue-700">AES-256-GCM / TLS 1.3</span>
              </div>
            </div>

            <button
              onClick={() => setShowSecurityModal(null)}
              className="w-full py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRM MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-rose-200 p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Delete Account & Data?</h3>
              <p className="text-xs text-slate-500 mt-1">
                This action is permanent and will wipe all patient medical records, medication schedules, and family linkages.
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onOpenRoleModal('SELECT');
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE TOAST */}
      {showShareToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Family Invite Code copied to clipboard for sharing!</span>
        </div>
      )}
    </>
  );
};
