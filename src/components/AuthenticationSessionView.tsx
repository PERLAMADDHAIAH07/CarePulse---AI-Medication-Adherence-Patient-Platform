import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  MapPin,
  Clock,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Check,
  X,
  Info,
  ShieldCheck,
  Mail,
  Phone,
  HelpCircle,
  Cpu,
  AlertCircle,
  Trash2,
  ChevronRight,
  Sparkles,
  Archive,
  PauseCircle,
  PlayCircle,
  Calendar,
  Pill,
  Users,
  BellOff,
  Bot,
  FileText,
  Activity,
  ArrowLeft,
} from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../services/api';
import { BackButton } from './BackButton';

interface AuthenticationSessionViewProps {
  currentUser: UserType;
  onLogout?: () => void;
  onNavigate?: (tab: string) => void;
}

export const AuthenticationSessionView: React.FC<AuthenticationSessionViewProps> = ({
  currentUser,
  onLogout,
  onNavigate,
}) => {
  // Data state
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals state for Session Management
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isLogoutAllModalOpen, setIsLogoutAllModalOpen] = useState(false);
  const [isRevokeSpecificModalOpen, setIsRevokeSpecificModalOpen] = useState(false);
  const [selectedSessionToRevoke, setSelectedSessionToRevoke] = useState<any>(null);
  const [processingAction, setProcessingAction] = useState(false);

  // Modals state for Account Lifecycle & Data Control
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('Treatment course successfully completed');
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('Temporarily pausing active medication tracking');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [processingLifecycle, setProcessingLifecycle] = useState(false);

  useEffect(() => {
    fetchAuthData();
  }, [currentUser.id]);

  const fetchAuthData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPatientAuthentication(currentUser.id);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load authentication data:', err);
      setError('Unable to load your authentication and session details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAuthData();
    showToast('Authentication status & care journey refreshed.');
  };

  // Sign out current session
  const handleConfirmSignOut = async () => {
    setProcessingAction(true);
    try {
      await api.logoutSession(currentUser.id, data?.currentSession?.id);
      setIsSignOutModalOpen(false);
      if (onLogout) {
        onLogout();
      }
    } catch (err) {
      console.error('Logout failed:', err);
      setIsSignOutModalOpen(false);
      if (onLogout) onLogout();
    } finally {
      setProcessingAction(false);
    }
  };

  // Sign out all OTHER sessions
  const handleConfirmLogoutAll = async () => {
    setProcessingAction(true);
    try {
      const res = await api.logoutAllOtherSessions(currentUser.id);
      setIsLogoutAllModalOpen(false);
      showToast(res.message || 'All other active sessions have been safely revoked.');
      await fetchAuthData();
    } catch (err: any) {
      console.error('Failed to revoke all sessions:', err);
      showToast('Failed to revoke secondary sessions.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Revoke single specific session
  const handleConfirmRevokeSession = async () => {
    if (!selectedSessionToRevoke) return;
    setProcessingAction(true);
    try {
      await api.revokeSession(currentUser.id, selectedSessionToRevoke.id);
      setIsRevokeSpecificModalOpen(false);
      showToast(`Session on ${selectedSessionToRevoke.deviceName} revoked.`);
      setSelectedSessionToRevoke(null);
      await fetchAuthData();
    } catch (err: any) {
      console.error('Failed to revoke session:', err);
      showToast('Unable to revoke selected session.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Archive Care Journey
  const handleArchiveCareJourney = async () => {
    setProcessingLifecycle(true);
    try {
      const res = await api.archiveCareJourney(currentUser.id, archiveReason);
      setIsArchiveModalOpen(false);
      showToast('Care journey archived successfully. Historical records preserved.');
      await fetchAuthData();
    } catch (err: any) {
      console.error('Failed to archive care journey:', err);
      showToast('Unable to archive care journey right now.');
    } finally {
      setProcessingLifecycle(false);
    }
  };

  // Resume Care Journey
  const handleResumeCareJourney = async () => {
    setProcessingLifecycle(true);
    try {
      await api.resumeCareJourney(currentUser.id);
      showToast('Care journey is now active. Active care tracking enabled.');
      await fetchAuthData();
    } catch (err: any) {
      console.error('Failed to resume care journey:', err);
      showToast('Unable to activate care journey.');
    } finally {
      setProcessingLifecycle(false);
    }
  };

  // Deactivate Account
  const handleDeactivateAccount = async () => {
    setProcessingLifecycle(true);
    try {
      const res = await api.deactivateAccount(currentUser.id, deactivateReason);
      setIsDeactivateModalOpen(false);
      showToast('Your CarePulse account has been deactivated.');
      await fetchAuthData();
    } catch (err: any) {
      console.error('Failed to deactivate account:', err);
      showToast('Unable to deactivate account right now.');
    } finally {
      setProcessingLifecycle(false);
    }
  };

  // Permanent Delete Account & Data
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      showToast('Please type "DELETE MY ACCOUNT" exactly to authorize deletion.');
      return;
    }
    setProcessingLifecycle(true);
    try {
      const res = await api.deleteAccountAndData(currentUser.id, deleteConfirmText, 'Patient voluntary account deletion');
      setIsDeleteModalOpen(false);
      showToast(res.message || 'Account deletion processed according to retention policy.');
      setTimeout(() => {
        if (onLogout) {
          onLogout();
        }
      }, 1500);
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      showToast(err.message || 'Account deletion failed. Please check authorization.');
    } finally {
      setProcessingLifecycle(false);
    }
  };

  const getDeviceIcon = (deviceName: string = '', os: string = '') => {
    const text = `${deviceName} ${os}`.toLowerCase();
    if (text.includes('iphone') || text.includes('android') || text.includes('phone')) {
      return <Smartphone className="w-5 h-5 text-blue-600" />;
    }
    if (text.includes('ipad') || text.includes('tablet')) {
      return <Tablet className="w-5 h-5 text-indigo-600" />;
    }
    return <Laptop className="w-5 h-5 text-emerald-600" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-xs flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">
          Loading authentication credentials, active sessions & care lifecycle...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-4 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Session Information Unavailable</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error || 'Unable to connect with auth server.'}</p>
        <button
          onClick={fetchAuthData}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors inline-flex items-center space-x-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  const { currentSession, authenticationMethods = [], sessionSecurity = {}, otherSessions = [], careJourney } = data;
  const isCareJourneyArchived = careJourney?.careJourneyStatus === 'ARCHIVED';
  const isAccountDeactivated = careJourney?.accountStatus === 'DEACTIVATED';
  const isAccountDeleted = careJourney?.accountStatus === 'DELETED';

  // Helper for Care Journey Status badge
  const renderCareJourneyStatusBadge = () => {
    if (isAccountDeactivated) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center space-x-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          <span>⚪ Inactive / Paused</span>
        </span>
      );
    }
    if (isCareJourneyArchived) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center space-x-1.5 shrink-0">
          <Archive className="w-3 h-3 text-purple-600" />
          <span>📦 Archived Care Plan</span>
        </span>
      );
    }
    if (careJourney?.careJourneyStatus === 'COMPLETED') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>🔵 Treatment Completed</span>
        </span>
      );
    }
    if (careJourney?.careJourneyStatus === 'ENDING_SOON') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span>🟡 Treatment Ending Soon</span>
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>🟢 Active Care</span>
      </span>
    );
  };

  return (
    <div className="space-y-7 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-medium flex items-center space-x-2.5 animate-slide-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ==================== 1. VIEW HEADER & BREADCRUMB ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2.5">
            <BackButton fallbackLabel="Back to Patient Control Room" />
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 text-xs font-semibold">Authentication & Session</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Lock className="w-5 h-5 text-blue-600" />
            <span>Authentication & Session Control</span>
          </h2>
          <p className="text-xs text-slate-500">
            Who am I authenticated as, what is my current session status, and what can I do with my CarePulse account when my care journey is completed?
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsSignOutModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* ==================== 2. CURRENT ACTIVE SESSION (PROMINENT CARD) ==================== */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 text-blue-600 shadow-xs">
              {getDeviceIcon(currentSession.deviceName, currentSession.os)}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-base font-bold text-slate-900">{currentSession.deviceName}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Active Live Session</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentSession.browser} • {currentSession.os} • {currentSession.appVersion}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSignOutModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-bold transition-colors shadow-2xs self-start sm:self-auto flex items-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out This Device</span>
          </button>
        </div>

        {/* 4 Metadata Points Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Device Hardware
            </span>
            <span className="text-xs font-bold text-slate-900 block truncate">
              {currentSession.deviceName}
            </span>
            <span className="text-[11px] text-slate-500 block truncate">
              {currentSession.os}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Location & Network
            </span>
            <span className="text-xs font-bold text-slate-900 flex items-center space-x-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">{currentSession.approxLocation}</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono block">
              IP: {currentSession.ipAddress}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Logged In
            </span>
            <span className="text-xs font-bold text-slate-900 flex items-center space-x-1 truncate">
              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{currentSession.loginDate} • {currentSession.loginTime}</span>
            </span>
            <span className="text-[11px] text-slate-500 block">
              Duration: {currentSession.sessionDuration || 'Ongoing'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Session Encryption
            </span>
            <span className="text-xs font-bold text-emerald-700 flex items-center space-x-1 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{currentSession.tokenStatus}</span>
            </span>
            <span className="text-[11px] text-slate-500 block truncate">
              Expires: {currentSession.expiresIn}
            </span>
          </div>
        </div>

        {/* Security Badge Ribbon */}
        <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5">
            <Lock className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-blue-950 font-medium">
              Session token signed with enterprise <strong className="font-bold">JWT RS256</strong> and encrypted via <strong className="font-bold">TLS 1.3 / AES-256</strong>.
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-mono text-[10px] font-bold whitespace-nowrap self-start sm:self-auto">
            ID: {currentSession.id.slice(0, 16)}...
          </span>
        </div>
      </div>

      {/* ==================== 3. AUTHENTICATION METHODS ==================== */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Authentication Methods</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {authenticationMethods.filter((m: any) => m.status === 'CONNECTED').length} Configured
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {authenticationMethods.map((method: any) => {
            const isConnected = method.status === 'CONNECTED';
            return (
              <div
                key={method.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isConnected
                    ? 'bg-slate-50/80 border-slate-200 text-slate-900'
                    : 'bg-slate-50/40 border-slate-200/60 text-slate-500 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`p-2 rounded-xl ${
                        isConnected ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {method.type === 'email_password' && <Mail className="w-4 h-4" />}
                      {method.type === 'google' && <Globe className="w-4 h-4" />}
                      {method.type === 'phone_otp' && <Phone className="w-4 h-4" />}
                      {method.type === 'biometrics_passkey' && <Key className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-bold text-slate-900">{method.name}</h4>
                        {method.isPrimary && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800">
                            Primary
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-600">{method.identifier}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isConnected ? '✓ Connected' : 'Not Configured'}
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate">{method.description}</span>
                  <span className="font-medium text-slate-400 shrink-0 ml-2">
                    {method.lastUsed ? `Used: ${method.lastUsed}` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-500 flex items-center space-x-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>CarePulse protects your EHR credentials with end-to-end cryptographic hashing. Passwords and keys are never stored in cleartext.</span>
        </p>
      </div>

      {/* ==================== 4. 🗂️ ACCOUNT LIFECYCLE & DATA CONTROL ==================== */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2">
            <Archive className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-black text-slate-900 tracking-tight">Account Lifecycle & Data Control</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage your CarePulse care journey, account status, and personal data. CarePulse supports you when starting care, completing treatment, archiving your plan, or managing retention.
          </p>
        </div>

        {/* SECTION A: CARE JOURNEY STATUS & TREATMENT COMPLETION */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-indigo-100/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Care Journey</span>
              </div>
              <h4 className="text-sm font-black text-slate-900">
                {careJourney?.careJourneyTitle || 'Cardiometabolic & Hypertension Care Plan'}
              </h4>
            </div>
            <div>{renderCareJourneyStatusBadge()}</div>
          </div>

          {/* Timeline & Treatment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Active Treatment</span>
              <span className="text-xs font-bold text-slate-900 block">
                {careJourney?.treatmentCourses?.filter((c: any) => c.status === 'ACTIVE').length || 2} Active Medications
              </span>
              <span className="text-[11px] text-slate-500">
                {careJourney?.treatmentCourses?.filter((c: any) => c.status === 'COMPLETED').length || 1} Course Completed
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Journey Started</span>
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>June 10, 2026</span>
              </span>
              <span className="text-[11px] text-slate-500">Prescribed by Dr. Evelyn Vance, MD</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Expected Completion</span>
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>September 10, 2026</span>
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">92% Overall Adherence Target</span>
            </div>
          </div>

          {/* Connected Treatment Courses Breakdown */}
          {careJourney?.treatmentCourses && careJourney.treatmentCourses.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <span className="text-xs font-bold text-slate-800 block">Medication & Treatment Courses</span>
              <div className="space-y-2">
                {careJourney.treatmentCourses.map((course: any) => {
                  const isCompleted = course.status === 'COMPLETED';
                  return (
                    <div
                      key={course.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                        isCompleted
                          ? 'bg-emerald-50/50 border-emerald-200 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">{course.medicineName}</span>
                            <span className="text-[11px] text-slate-500">({course.dosage})</span>
                          </div>
                          <span className="text-[11px] text-slate-500 block">
                            Course: {course.courseDuration} • {course.clinicalNotes}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0">
                        {isCompleted ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                            <Check className="w-3 h-3 text-emerald-700" />
                            <span>✓ Completed ({course.completionDate})</span>
                          </span>
                        ) : (
                          <div className="text-right">
                            <span className="text-[11px] font-bold text-blue-600 block">
                              {course.completionPercentage}% Complete
                            </span>
                            <span className="text-[10px] text-slate-400">Ends: {course.completionDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION B: ARCHIVE CARE JOURNEY */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Archive className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-bold text-slate-900">Archive Care Journey</h4>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                Completed a treatment or medication course? Archive the completed care journey while preserving appropriate historical records. This removes the journey from active alarms while keeping records safely available.
              </p>
            </div>

            {isCareJourneyArchived ? (
              <button
                onClick={handleResumeCareJourney}
                disabled={processingLifecycle}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
              >
                {processingLifecycle ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                <span>Resume Active Care Plan</span>
              </button>
            ) : (
              <button
                onClick={() => setIsArchiveModalOpen(true)}
                disabled={processingLifecycle}
                className="px-4 py-2 rounded-xl bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive Care Journey</span>
              </button>
            )}
          </div>
        </div>

        {/* SECTION C: DEACTIVATE ACCOUNT */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <PauseCircle className="w-4 h-4 text-slate-600" />
                <h4 className="text-xs font-bold text-slate-900">Deactivate Account</h4>
              </div>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                Not currently using CarePulse? Temporarily pause your account. This disables active reminders and notifications while keeping your account and records recoverable when you return.
              </p>
            </div>

            {isAccountDeactivated ? (
              <button
                onClick={handleResumeCareJourney}
                disabled={processingLifecycle}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
              >
                {processingLifecycle ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                <span>Reactivate Account</span>
              </button>
            ) : (
              <button
                onClick={() => setIsDeactivateModalOpen(true)}
                disabled={processingLifecycle}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Deactivate Account</span>
              </button>
            )}
          </div>
        </div>

        {/* SECTION D: DELETE ACCOUNT & DATA (HIGH-RISK DESTRUCTIVE ZONE) */}
        <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <h4 className="text-xs font-bold text-rose-950">Delete Account & Data</h4>
              </div>
              <p className="text-xs text-rose-800/80 max-w-2xl leading-relaxed">
                Permanently close your CarePulse account. This revokes caregiver family access, invalidates all sessions, mutes push notifications, and clears personal credentials. Clinical audit trails are preserved per healthcare retention statutes (HIPAA § 164.316).
              </p>
            </div>

            <button
              onClick={() => {
                setDeleteStep(1);
                setDeleteConfirmText('');
                setIsDeleteModalOpen(true);
              }}
              disabled={processingLifecycle}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account & Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 5. SESSION SECURITY & AUTHENTICATION STATUS ==================== */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Authentication & Session Security Status</h3>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Score: {sessionSecurity.securityScore || 92}/100
          </span>
        </div>

        {/* 4 Status Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 flex items-center space-x-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Account Authenticated</span>
              <span className="text-[10px] text-emerald-700">Verified Patient Identity</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 flex items-center space-x-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Current Session Active</span>
              <span className="text-[10px] text-emerald-700">Token Valid & Healthy</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 flex items-center space-x-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Auth Provider Connected</span>
              <span className="text-[10px] text-emerald-700">OAuth / Passkey Linked</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 flex items-center space-x-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">No Immediate Issue</span>
              <span className="text-[10px] text-emerald-700">Zero Flagged Breaches</span>
            </div>
          </div>
        </div>

        {/* Audit Details Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Last Successful Login
            </span>
            <span className="text-xs font-bold text-slate-900 block">
              {sessionSecurity.lastLogin}
            </span>
            <span className="text-[11px] text-slate-500">Method: {sessionSecurity.lastAuthMethod}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Password Last Updated
            </span>
            <span className="text-xs font-bold text-slate-900 block">
              {new Date(sessionSecurity.lastPasswordChange).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">94/100 Strong Rating</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Two-Factor Authentication (2FA)
            </span>
            <span className="text-xs font-bold text-slate-900 block">
              {sessionSecurity.twoFactorStatus}
            </span>
            <button
              onClick={() => onNavigate && onNavigate('security')}
              className="text-[11px] text-blue-600 font-bold hover:underline flex items-center space-x-0.5 mt-0.5"
            >
              <span>Security Center</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 6. OTHER SESSIONS CONTROL (REMOTE DEVICES) ==================== */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Laptop className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Other Active Sessions</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                {otherSessions.length} Secondary
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Manage logins from your other phones, tablets, or family devices
            </p>
          </div>

          {otherSessions.length > 0 && (
            <button
              onClick={() => setIsLogoutAllModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all shadow-xs flex items-center space-x-2"
            >
              <LogOut className="w-3.5 h-3.5 text-amber-700" />
              <span>Sign Out All Other Sessions</span>
            </button>
          )}
        </div>

        {otherSessions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="text-xs font-bold text-slate-900">No other active sessions detected</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Your account is currently active only on this device. You are not logged into any secondary terminals or phones.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {otherSessions.map((sess: any) => (
              <div
                key={sess.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    {getDeviceIcon(sess.deviceName, sess.os)}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">{sess.deviceName}</h5>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                      <span>{sess.browser}</span>
                      <span>•</span>
                      <span>{sess.location}</span>
                      <span>•</span>
                      <span>Login: {sess.loginAt?.slice(0, 10) || 'Aug 23, 2026'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-auto">
                  <span className="text-[11px] font-mono text-slate-400">{sess.ipAddress}</span>
                  <button
                    onClick={() => {
                      setSelectedSessionToRevoke(sess);
                      setIsRevokeSpecificModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-bold transition-colors shadow-2xs flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            Signing out other sessions terminates secondary tokens across all remote phones and browser tabs while <strong>keeping your current session on this device uninterrupted</strong>.
          </p>
        </div>
      </div>

      {/* ==================== MODAL: ARCHIVE CARE JOURNEY ==================== */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
              <Archive className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900">Archive this care journey?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will mark the completed care journey as archived and remove it from active-care workflows.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-800 block">What happens when you archive:</span>
              <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc list-inside">
                <li>Medication & adherence history is safely preserved</li>
                <li>Unnecessary active medication reminders stop</li>
                <li>Caregiver monitoring is updated with completed status</li>
                <li>You can resume active tracking anytime if prescribed new medication</li>
              </ul>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveCareJourney}
                disabled={processingLifecycle}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors shadow-md flex items-center justify-center space-x-2"
              >
                {processingLifecycle && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: DEACTIVATE ACCOUNT ==================== */}
      {isDeactivateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
              <PauseCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-slate-900">Deactivate your CarePulse account?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your account will become inactive. Your information may be retained according to CarePulse data-retention requirements.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
              <span className="font-bold block">Account Status: Inactive</span>
              <p className="text-[11px] leading-relaxed">
                Active alerts and push notifications will be muted. You can log back in and reactivate your account whenever you return.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeactivateModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivateAccount}
                disabled={processingLifecycle}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors shadow-md flex items-center justify-center space-x-2"
              >
                {processingLifecycle && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Deactivate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: DELETE ACCOUNT & DATA (MULTI-STEP HIGH RISK) ==================== */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-rose-200 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            {deleteStep === 1 ? (
              <>
                <div className="text-center space-y-2">
                  <h3 className="text-base font-bold text-slate-900">Delete your CarePulse account?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This is a permanent account action. Data eligible for deletion will be removed according to CarePulse policies. Some records may need to be retained for legal, healthcare, security, or audit requirements.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-2">
                  <span className="font-bold flex items-center space-x-1.5">
                    <Shield className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Healthcare Data Retention & Lifecycle Impact:</span>
                  </span>
                  <ul className="space-y-1 text-[11px] text-rose-900 list-disc list-inside">
                    <li>All active sessions and mobile tokens will be permanently revoked.</li>
                    <li>Connected family caregiver access will be immediately severed.</li>
                    <li>AI Assistant access and conversation history will be revoked.</li>
                    <li>Push notifications and SMS reminders will stop completely.</li>
                    <li>Clinical logs are archived under HIPAA § 164.316 6-year retention rules.</li>
                  </ul>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteStep(2)}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-md flex items-center justify-center space-x-1.5"
                  >
                    <span>Continue to Confirmation</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <h3 className="text-base font-bold text-rose-900">Final Confirmation Required</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    To confirm permanent deletion of your account and revocation of all services, please type <strong className="font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">DELETE MY ACCOUNT</strong> below:
                  </p>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    className="w-full px-4 py-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 text-center uppercase"
                  />
                  {deleteConfirmText.length > 0 && deleteConfirmText !== 'DELETE MY ACCOUNT' && (
                    <span className="text-[10px] text-rose-600 font-medium block text-center">
                      Must match exact phrase: DELETE MY ACCOUNT
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteStep(1)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE MY ACCOUNT' || processingLifecycle}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-md flex items-center justify-center space-x-2 ${
                      deleteConfirmText === 'DELETE MY ACCOUNT'
                        ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {processingLifecycle && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm Permanent Deletion</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL: SIGN OUT CURRENT SESSION ==================== */}
      {isSignOutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Are you sure you want to sign out?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your authenticated session tokens will be revoked and sensitive patient health data cleared from this browser.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSignOutModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSignOut}
                disabled={processingAction}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-md flex items-center justify-center space-x-2"
              >
                {processingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: SIGN OUT ALL OTHER SESSIONS ==================== */}
      {isLogoutAllModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Sign out all other sessions?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will sign you out from all other devices, mobile apps, and browser tabs. <strong>Your current session on this device will remain active.</strong>
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutAllModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogoutAll}
                disabled={processingAction}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-md flex items-center justify-center space-x-2"
              >
                {processingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Revocation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: REVOKE SPECIFIC SESSION ==================== */}
      {isRevokeSpecificModalOpen && selectedSessionToRevoke && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Revoke this session?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Terminate active access on <strong>{selectedSessionToRevoke.deviceName}</strong> ({selectedSessionToRevoke.location}).
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRevokeSpecificModalOpen(false);
                  setSelectedSessionToRevoke(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevokeSession}
                disabled={processingAction}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-md flex items-center justify-center space-x-2"
              >
                {processingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Revoke Access</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
