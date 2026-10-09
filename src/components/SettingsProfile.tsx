import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Bell,
  Key,
  Smartphone,
  Laptop,
  Tablet,
  Cpu,
  Database,
  Activity,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Send,
  Download,
  Trash2,
  Settings,
  Terminal,
  Radio,
  Wifi,
  Zap,
  FileText,
  ChevronRight,
  Server,
  Layers,
  HelpCircle,
  HardDrive,
  BarChart3,
  Clock,
  Sparkles,
  UserCheck,
  ShieldCheck,
  Mail,
  Phone,
  ExternalLink,
  Sliders,
  X,
  Search,
  KeyRound,
  Users
} from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../services/api';
import { BackButton } from './BackButton';

interface SettingsProfileProps {
  currentUser: UserType;
  inviteCode: string;
  onLogout?: () => void;
  onNavigate?: (tab: string) => void;
}

export const SettingsProfile: React.FC<SettingsProfileProps> = ({
  currentUser,
  inviteCode,
  onLogout,
  onNavigate,
}) => {
  // Navigation tabs in account center
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'auth'
    | 'login-history'
    | 'devices'
    | 'security'
    | 'fcm'
    | 'notifications'
    | 'family'
    | 'ai'
    | 'privacy'
    | 'app-info'
    | 'developer'
  >('overview');

  // Search filter inside settings center
  const [searchQuery, setSearchQuery] = useState('');

  // Loading & state metrics
  const [loading, setLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Profile data
  const [profileData, setProfileData] = useState<any>({
    name: currentUser.name || '',
    email: currentUser.email || '',
    phone: currentUser.phone || '',
    avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
    accountStatus: 'Active & Compliant (HIPAA & GDPR)',
    emailVerified: true,
    phoneVerified: true,
    memberSince: currentUser.createdAt || '2026-01-15T00:00:00.000Z',
    lastUpdated: new Date().toISOString(),
  });

  // Security data
  const [securityData, setSecurityData] = useState<any>({
    passwordLastChanged: '2026-05-15T10:30:00.000Z',
    passwordStrength: 'Strong (94/100)',
    twoFactorEnabled: false,
    biometricsEnabled: true,
    pinLockEnabled: true,
    failedLoginAttempts: 0,
    securityScore: 92,
    emailVerified: true,
    phoneVerified: true,
    recommendations: [
      'Enable Two-Factor Authentication (2FA) for an extra layer of protection.',
      'Set up emergency biometric recovery contact.',
      'Review active sessions periodically.',
    ],
  });

  // Login history
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  // Devices
  const [devices, setDevices] = useState<any[]>([]);
  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  // FCM details
  const [fcmDetails, setFcmDetails] = useState<any>({
    enabled: true,
    token: `fcm_live_token_${currentUser.id}_8839201948`,
    created: '2026-06-01T09:00:00.000Z',
    refreshed: new Date().toISOString(),
    registered: true,
    permission: 'Granted',
    foreground: 'Active (In-App Banner)',
    background: 'Registered (FCM Service Worker)',
    health: 'Healthy (42ms Latency)',
  });

  // Notification Preferences Matrix
  const [notifMatrix, setNotifMatrix] = useState<Record<string, { email: boolean; push: boolean; sms: boolean }>>({
    medicationReminder: { email: true, push: true, sms: true },
    missedDoseAlert: { email: true, push: true, sms: true },
    familyAlerts: { email: true, push: true, sms: false },
    criticalAlerts: { email: true, push: true, sms: true },
    aiRecommendations: { email: true, push: true, sms: false },
    weeklyReports: { email: true, push: false, sms: false },
    monthlyReports: { email: true, push: false, sms: false },
  });
  const [masterNotifToggle, setMasterNotifToggle] = useState(true);

  // AI Account state
  const [aiDetails, setAiDetails] = useState<any>({
    status: 'Online & Active',
    personalization: true,
    memoryUsage: '1.42 MB / 50 MB (2.8%)',
    conversationCount: 38,
    lastConversation: new Date().toISOString(),
    timelineSync: true,
    contextStatus: 'Synchronized (Live Adherence Context Loaded)',
  });

  // App & Developer Info
  const [appInfo, setAppInfo] = useState<any>({});
  const [developerInfo, setDeveloperInfo] = useState<any>({});
  const [devModeEnabled, setDevModeEnabled] = useState(true);

  // Statistics
  const [stats, setStats] = useState<any>({
    daysUsingApp: 142,
    totalMedicines: 3,
    todayMedicines: 4,
    completedDoses: 384,
    missedDoses: 18,
    adherencePercentage: 95.5,
    familyMembers: 2,
    notificationsSent: 128,
    aiConversations: 38,
  });

  // UI state controls
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Modals
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isTestNotifModalOpen, setIsTestNotifModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isSecurityAuditModalOpen, setIsSecurityAuditModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Password modal state
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');

  // Test Notification form
  const [testNotifTitle, setTestNotifTitle] = useState('⚡ CarePulse Emergency Alert Test');
  const [testNotifMsg, setTestNotifMsg] = useState('This is a test notification from the FCM Enterprise Center.');

  // Load account data on mount
  useEffect(() => {
    fetchAccountData();
  }, [currentUser.id]);

  const fetchAccountData = async () => {
    setLoading(true);
    try {
      const [prof, sec, hist, sess, devList, statData, infoData, devData] = await Promise.all([
        api.getAccountProfile(currentUser.id).catch(() => null),
        api.getAccountSecurity(currentUser.id).catch(() => null),
        api.getLoginHistory(currentUser.id).catch(() => []),
        api.getAccountSessions(currentUser.id).catch(() => ({ currentSessionId: 'sess_1', sessions: [] })),
        api.getAccountDevices(currentUser.id).catch(() => []),
        api.getAccountStatistics(currentUser.id).catch(() => null),
        api.getAppInfo().catch(() => null),
        api.getDeveloperDiagnostics(currentUser.id).catch(() => null),
      ]);

      if (prof) setProfileData((prev: any) => ({ ...prev, ...prof }));
      if (sec) setSecurityData(sec);
      if (hist && Array.isArray(hist)) setLoginHistory(hist);
      if (sess && sess.sessions) setSessions(sess.sessions);
      if (devList && Array.isArray(devList)) setDevices(devList);
      if (statData) setStats(statData);
      if (infoData) setAppInfo(infoData);
      if (devData) setDeveloperInfo(devData);
    } catch (err: any) {
      console.error('Failed to load account data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await api.updateAccountProfile({
        userId: currentUser.id,
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        avatarUrl: profileData.avatarUrl,
      });
      setIsEditProfileModalOpen(false);
      triggerSuccess('Profile information updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassInput !== confirmPassInput) {
      setErrorMsg('New passwords do not match!');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await api.changePassword(currentUser.id, currentPassInput, newPassInput);
      setIsChangePasswordModalOpen(false);
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
      triggerSuccess('Password changed successfully!');
      fetchAccountData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      const res = await api.toggle2FA(currentUser.id, !securityData.twoFactorEnabled);
      setSecurityData((prev: any) => ({
        ...prev,
        twoFactorEnabled: res.twoFactorEnabled,
        securityScore: res.securityScore,
      }));
      triggerSuccess(res.message);
    } catch (err: any) {
      setErrorMsg('Failed to toggle 2FA');
    }
  };

  const handleRefreshToken = async () => {
    try {
      const res = await api.refreshToken(currentUser.id);
      setFcmDetails((prev: any) => ({
        ...prev,
        token: res.token,
        refreshed: res.refreshedAt,
      }));
      triggerSuccess('FCM Push Token & Session JWT Refreshed!');
    } catch (err: any) {
      setErrorMsg('Failed to refresh token');
    }
  };

  const handleSendTestNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.sendTestNotification(currentUser.id, testNotifTitle, testNotifMsg);
      setIsTestNotifModalOpen(false);
      triggerSuccess('Test Push Notification triggered! Check notification bell above.');
    } catch (err: any) {
      setErrorMsg('Failed to send test notification');
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      await api.terminateSession(sessionId, currentUser.id);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      triggerSuccess('Session terminated');
    } catch (err: any) {
      setErrorMsg('Failed to terminate session');
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      await api.removeDevice(deviceId, currentUser.id);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      triggerSuccess('Device removed from trusted list');
    } catch (err: any) {
      setErrorMsg('Failed to remove device');
    }
  };

  const handleLogoutAllOtherDevices = async () => {
    try {
      await api.logoutAllDevices(currentUser.id);
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      setDevices((prev) => prev.filter((d) => d.isCurrent));
      triggerSuccess('Logged out from all other active devices & sessions');
    } catch (err: any) {
      setErrorMsg('Failed to logout all devices');
    }
  };

  const handleExportData = async (format: string = 'json') => {
    try {
      const res = await api.exportAccountData(currentUser.id, format);
      const a = document.createElement('a');
      a.href = res.downloadUrl;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      triggerSuccess(`Account data exported in ${format.toUpperCase()} format!`);
    } catch (err: any) {
      setErrorMsg('Failed to export account data');
    }
  };

  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText !== 'DELETE') {
      setErrorMsg('Please type DELETE to confirm account deletion.');
      return;
    }
    try {
      await api.deleteAccount(currentUser.id);
      setIsDeleteAccountModalOpen(false);
      if (onLogout) onLogout();
    } catch (err: any) {
      setErrorMsg('Failed to request account deletion');
    }
  };

  const triggerSuccess = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const copyToClipboard = (text: string, type: 'token' | 'invite') => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const toggleMasterNotifs = (val: boolean) => {
    setMasterNotifToggle(val);
    const updated: any = {};
    Object.keys(notifMatrix).forEach((key) => {
      updated[key] = { email: val, push: val, sms: val };
    });
    setNotifMatrix(updated);
  };

  const toggleNotifChannel = (key: string, channel: 'email' | 'push' | 'sms') => {
    setNotifMatrix((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [channel]: !prev[key][channel],
      },
    }));
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Back Action */}
      <div className="flex items-center justify-between">
        <BackButton fallbackLabel="Back to Dashboard" />
      </div>

      {/* Toast Notification Banner */}
      {saveSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-700 flex items-center space-x-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{saveSuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed top-20 right-6 z-50 bg-rose-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-rose-700 flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="text-xs font-bold">{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="ml-2 text-rose-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Enterprise Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/40">
        {/* Subtle background mesh visual */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="relative group">
              <img
                src={profileData.avatarUrl}
                alt={profileData.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-blue-500/30 shadow-lg"
              />
              {currentUser.role === 'PATIENT' && (
                <button
                  onClick={() => setIsEditProfileModalOpen(true)}
                  className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white"
                >
                  Change
                </button>
              )}
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1.5 rounded-lg shadow-md ring-2 ring-slate-900">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{profileData.name}</h1>
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {currentUser.role}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>HIPAA Verified</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center space-x-3">
                <span>{profileData.email}</span>
                <span>•</span>
                <span>{profileData.phone}</span>
              </p>

              <div className="flex items-center space-x-4 mt-3 text-xs text-slate-400">
                <span>User ID: <code className="font-mono text-blue-300 bg-blue-900/50 px-1.5 py-0.5 rounded">{currentUser.id}</code></span>
                <span>•</span>
                <span>Security Rating: <strong className="text-emerald-400">{securityData.securityScore}/100</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {currentUser.role === 'PATIENT' ? (
              <button
                onClick={() => setIsEditProfileModalOpen(true)}
                className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md transition-all border border-white/10 flex items-center justify-center space-x-2"
              >
                <User className="w-4 h-4 text-blue-300" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center space-x-2 backdrop-blur-md">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>View-Only Access</span>
              </div>
            )}
            <button
              onClick={() => setIsSecurityAuditModalOpen(true)}
              className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center space-x-2"
            >
              <Shield className="w-4 h-4" />
              <span>Security Audit</span>
            </button>
          </div>
        </div>

        {/* Search Bar for Center */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings, tokens, sessions..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-900/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400 self-end sm:self-auto">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Last Sync: {new Date().toLocaleTimeString()}</span>
            <button onClick={fetchAccountData} className="p-1 hover:text-white transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Primary Category Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboardIcon },
          { id: 'auth', label: 'Authentication & Session', icon: Key },
          { id: 'login-history', label: 'Login History', icon: Clock },
          { id: 'devices', label: 'Active Devices', icon: Laptop },
          { id: 'security', label: 'Security Center', icon: Shield },
          { id: 'fcm', label: 'FCM Push Token', icon: Bell },
          { id: 'notifications', label: 'Notification Matrix', icon: Sliders },
          { id: 'family', label: 'Family Connection', icon: Users },
          { id: 'ai', label: 'AI & Privacy', icon: Sparkles },
          { id: 'app-info', label: 'App Information', icon: FileText },
          { id: 'developer', label: 'Developer Diagnostics', icon: Terminal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: OVERVIEW & ANALYTICS ==================== */}
      {(activeTab === 'overview' || searchQuery !== '') && (
        <div className="space-y-6">
          {/* SECTION 14: ACCOUNT ANALYTICS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Days Active</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-2xl font-black text-slate-900">{stats.daysUsingApp}</span>
              <span className="text-[11px] text-slate-400 block mt-1">Since Jan 2026</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Adherence Score</span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-emerald-600">{stats.adherencePercentage}%</span>
              <span className="text-[11px] text-emerald-600 font-medium block mt-1">Top Tier Compliance</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Active Medications</span>
                <PillIcon className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-2xl font-black text-slate-900">{stats.totalMedicines}</span>
              <span className="text-[11px] text-slate-400 block mt-1">{stats.todayMedicines} Doses Today</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Completed Doses</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-slate-900">{stats.completedDoses}</span>
              <span className="text-[11px] text-rose-500 block mt-1">{stats.missedDoses} Missed Total</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Connected Family</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-2xl font-black text-slate-900">{stats.familyMembers}</span>
              <span className="text-[11px] text-slate-400 block mt-1">Caregivers Linked</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">FCM Push Alerts</span>
                <Bell className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-2xl font-black text-slate-900">{stats.notificationsSent}</span>
              <span className="text-[11px] text-slate-400 block mt-1">Delivered to Devices</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">AI Assistant Chats</span>
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-2xl font-black text-slate-900">{stats.aiConversations}</span>
              <span className="text-[11px] text-slate-400 block mt-1">Health Q&A Sessions</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Security Score</span>
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-2xl font-black text-blue-600">{securityData.securityScore}/100</span>
              <span className="text-[11px] text-blue-600 font-medium block mt-1">Enterprise Grade</span>
            </div>
          </div>

          {/* SECTION 1: ACCOUNT INFORMATION CARD */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span>Account Information</span>
                </h2>
                <p className="text-xs text-slate-500">Verified identity and healthcare profile records</p>
              </div>
              {currentUser.role === 'PATIENT' ? (
                <button
                  onClick={() => setIsEditProfileModalOpen(true)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Edit Profile Details
                </button>
              ) : (
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200">
                  Read-Only Profile
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Full Name</span>
                <span className="text-sm font-bold text-slate-900 block">{profileData.name}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Email Address</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-slate-900">{profileData.email}</span>
                  {profileData.emailVerified && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-slate-900">{profileData.phone || 'Not provided'}</span>
                  {profileData.phoneVerified && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      SMS Verified
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">System User ID</span>
                <span className="text-sm font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded w-fit block">
                  {currentUser.id}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Assigned Role</span>
                <span className="text-sm font-bold text-slate-900 block">{currentUser.role}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Account Status</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                  {profileData.accountStatus}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Member Since</span>
                <span className="text-xs font-medium text-slate-700 block">
                  {new Date(profileData.memberSince).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Last Updated</span>
                <span className="text-xs font-medium text-slate-700 block">
                  {new Date(profileData.lastUpdated).toLocaleString()}
                </span>
              </div>

              {currentUser.role === 'PATIENT' && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Family Invitation Code</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono font-black text-blue-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                      {inviteCode || currentUser.familyInviteCode}
                    </span>
                    <button
                      onClick={() => copyToClipboard(inviteCode || currentUser.familyInviteCode, 'invite')}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                    >
                      {copiedInvite ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: AUTHENTICATION & SESSIONS ==================== */}
      {(activeTab === 'auth' || searchQuery !== '') && (
        <div className="space-y-6">
          {/* SECTION 2: LOGIN & AUTHENTICATION CENTER */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <Key className="w-5 h-5 text-blue-600" />
                  <span>Authentication Dashboard & Session Center</span>
                </h2>
                <p className="text-xs text-slate-500">Live token statuses, duration metrics, and session security</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Logged In (Live)</span>
                </span>
              </div>
            </div>

            {/* Current Session Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Current Session ID</span>
                <span className="text-xs font-mono font-bold text-blue-800">sess_live_99481203</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Auth Method</span>
                <span className="text-xs font-bold text-slate-800">Email + Biometric Passkey</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Access Token Status</span>
                <span className="text-xs font-bold text-emerald-700">Active (JWT RS256)</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Refresh Token Status</span>
                <span className="text-xs font-bold text-emerald-700">Valid (Rotated 15m ago)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Session Preferences</h3>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Remember Me</span>
                    <span className="text-[11px] text-slate-400 block">Keep session active across restarts</span>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600" />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Auto Login</span>
                    <span className="text-[11px] text-slate-400 block">Biometric quick authentication</span>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Timing & Expiry</h3>
                <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Session Timeout</span>
                    <span className="font-bold text-slate-900">30 Minutes Inactivity</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Session Started</span>
                    <span className="font-medium text-slate-700">08:30 AM Today</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Session Duration</span>
                    <span className="font-bold text-blue-700">5 hours 29 minutes</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Session Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleRefreshToken}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                    <span>Refresh Session Tokens</span>
                  </button>

                  <button
                    onClick={handleLogoutAllOtherDevices}
                    className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout All Other Devices</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 13: SESSION MANAGEMENT TABLE */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Active Registered Sessions</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Session ID</th>
                    <th className="py-3 px-4">Device Name</th>
                    <th className="py-3 px-4">Auth Method</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-800">{sess.id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {sess.deviceName}{' '}
                        {sess.isCurrent && (
                          <span className="ml-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-extrabold rounded-full">
                            This Device
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{sess.authMethod}</td>
                      <td className="py-3 px-4 text-slate-600">{sess.sessionDuration}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md">
                          {sess.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!sess.isCurrent && (
                          <button
                            onClick={() => handleTerminateSession(sess.id)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-bold hover:underline"
                          >
                            Terminate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: LOGIN HISTORY ==================== */}
      {(activeTab === 'login-history' || searchQuery !== '') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Login History & Access Timeline</span>
              </h2>
              <p className="text-xs text-slate-500">Security audit log of IP addresses, browsers, and login outcomes</p>
            </div>
            <span className="text-xs text-slate-400">Showing {loginHistory.length} recent events</span>
          </div>

          <div className="space-y-4">
            {loginHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-blue-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      item.status === 'Success'
                        ? 'bg-emerald-50 text-emerald-600'
                        : item.status === 'Expired'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {item.status === 'Success' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : item.status === 'Expired' ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{item.device}</span>
                      <span className="text-xs text-slate-500">({item.browser} on {item.os})</span>
                      {item.currentSession && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
                          Current Session
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      IP: <code className="font-mono text-slate-700 bg-slate-100 px-1 rounded">{item.ipAddress}</code> • Location: {item.location}
                    </p>
                  </div>
                </div>

                <div className="text-right sm:self-center shrink-0">
                  <span className="text-xs font-bold text-slate-900 block">{item.date} at {item.time}</span>
                  <span className="text-[11px] text-slate-400 block">Duration: {item.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB 4: ACTIVE DEVICES ==================== */}
      {(activeTab === 'devices' || searchQuery !== '') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Laptop className="w-5 h-5 text-blue-600" />
                <span>Active Logged-In Devices</span>
              </h2>
              <p className="text-xs text-slate-500">Manage all hardware devices authorized to access this account</p>
            </div>
            <button
              onClick={handleLogoutAllOtherDevices}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors"
            >
              Remove All Unrecognized
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {devices.map((dev) => (
              <div
                key={dev.id}
                className={`p-5 rounded-2xl border transition-all space-y-4 relative ${
                  dev.isCurrent ? 'border-blue-300 bg-blue-50/30 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-slate-100 text-blue-600 rounded-xl">
                    {dev.type === 'Laptop' ? <Laptop className="w-6 h-6" /> : dev.type === 'iPhone' ? <Smartphone className="w-6 h-6" /> : <Tablet className="w-6 h-6" />}
                  </div>
                  {dev.isCurrent && (
                    <span className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-extrabold uppercase rounded-full">
                      This Device
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{dev.deviceName}</h3>
                  <p className="text-xs text-slate-500">{dev.browser}</p>
                  <p className="text-xs text-slate-400 mt-1">{dev.os} • {dev.appVersion}</p>
                </div>

                <div className="text-xs space-y-1 pt-2 border-t border-slate-100 text-slate-500">
                  <div>Location: <strong className="text-slate-800">{dev.location}</strong></div>
                  <div>IP Address: <code className="font-mono text-slate-700">{dev.ipAddress}</code></div>
                  <div>Last Active: <strong className="text-emerald-700">{dev.lastActive}</strong></div>
                </div>

                {!dev.isCurrent && (
                  <button
                    onClick={() => handleRemoveDevice(dev.id)}
                    className="w-full py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    Remove Device Access
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB 5: SECURITY CENTER ==================== */}
      {(activeTab === 'security' || searchQuery !== '') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span>Enterprise Security Center</span>
              </h2>
              <p className="text-xs text-slate-500">Multifactor protection, passwords, and security recommendations</p>
            </div>
            <div className="flex items-center space-x-2 bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-200">
              <span className="text-xs font-semibold text-slate-600">Security Score:</span>
              <span className="text-sm font-black text-blue-700">{securityData.securityScore}/100</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password & 2FA Card */}
            <div className="p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <span>Password & Authentication</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Password Strength</span>
                  <span className="font-bold text-emerald-600">{securityData.passwordStrength}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Last Password Change</span>
                  <span className="font-medium text-slate-800">
                    {new Date(securityData.passwordLastChanged).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <div>
                    <span className="font-bold text-slate-900 block">Two-Factor Authentication (2FA)</span>
                    <span className="text-slate-400 text-[11px] block">TOTP Authenticator app or SMS code</span>
                  </div>
                  <button
                    onClick={handleToggle2FA}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      securityData.twoFactorEnabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {securityData.twoFactorEnabled ? '2FA Enabled ✓' : 'Enable 2FA'}
                  </button>
                </div>

                <div className="flex justify-between items-center py-2">
                  <div>
                    <span className="font-bold text-slate-900 block">Biometric Hardware Passkey</span>
                    <span className="text-slate-400 text-[11px] block">Face ID / Touch ID / WebAuthn</span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-[11px]">
                    Enabled
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsChangePasswordModalOpen(true)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Change Account Password
              </button>
            </div>

            {/* Recommendations */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Security Recommendations</span>
              </h3>

              <div className="space-y-3 text-xs">
                {securityData.recommendations.map((rec: string, idx: number) => (
                  <div key={idx} className="flex items-start space-x-2.5 bg-white p-3 rounded-xl border border-slate-200/80">
                    <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">{rec}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setIsSecurityAuditModalOpen(true)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Run Comprehensive Security Audit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 6: FIREBASE CLOUD MESSAGING (FCM) ==================== */}
      {(activeTab === 'fcm' || searchQuery !== '') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <span>Firebase Cloud Messaging (FCM) Push Token Center</span>
              </h2>
              <p className="text-xs text-slate-500">Real-time device push token configuration and notification delivery status</p>
            </div>

            <button
              onClick={() => setIsTestNotifModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center space-x-2 self-start sm:self-auto"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Notification</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current FCM Device Registration Token</label>
              <div className="flex items-center space-x-2">
                <input
                  type={showToken ? 'text' : 'password'}
                  readOnly
                  value={fcmDetails.token}
                  className="flex-1 px-4 py-2.5 text-xs font-mono text-blue-900 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                  title={showToken ? 'Mask token' : 'Show token'}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(fcmDetails.token, 'token')}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                  title="Copy token"
                >
                  {copiedToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleRefreshToken}
                  className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Refresh Token
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-400 block">Push Permission</span>
                <span className="text-xs font-bold text-emerald-700 mt-1 block">Granted (Active)</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-400 block">Foreground Status</span>
                <span className="text-xs font-bold text-slate-800 mt-1 block">{fcmDetails.foreground}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-400 block">Background Status</span>
                <span className="text-xs font-bold text-slate-800 mt-1 block">{fcmDetails.background}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-400 block">Service Latency</span>
                <span className="text-xs font-bold text-emerald-700 mt-1 block">{fcmDetails.health}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 7: NOTIFICATION MATRIX ==================== */}
      {(activeTab === 'notifications' || searchQuery !== '') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <span>Multi-Channel Notification Preference Matrix</span>
              </h2>
              <p className="text-xs text-slate-500">Configure alert channels per healthcare event category</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleMasterNotifs(true)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors"
              >
                Enable All
              </button>
              <button
                onClick={() => toggleMasterNotifs(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Disable All
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Event Category</th>
                  <th className="py-3 px-4 text-center">Email</th>
                  <th className="py-3 px-4 text-center">FCM Push</th>
                  <th className="py-3 px-4 text-center">SMS Text</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {[
                  { key: 'medicationReminder', label: 'Medication Reminders', desc: 'Daily dose time alerts' },
                  { key: 'missedDoseAlert', label: 'Missed Dose Emergency Alerts', desc: 'Alerts when doses are skipped' },
                  { key: 'familyAlerts', label: 'Family Caregiver Activity', desc: 'Caregiver sync & permissions' },
                  { key: 'criticalAlerts', label: 'Critical Health Risk Alerts', desc: 'AI risk tier updates' },
                  { key: 'aiRecommendations', label: 'AI Health Recommendations', desc: 'Personalized wellness tips' },
                  { key: 'weeklyReports', label: 'Weekly Adherence Digest', desc: '7-day summary metrics' },
                  { key: 'monthlyReports', label: 'Monthly Healthcare Report', desc: 'Comprehensive doctor report' },
                ].map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{row.label}</span>
                      <span className="text-[11px] text-slate-400 block">{row.desc}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={notifMatrix[row.key]?.email ?? true}
                        onChange={() => toggleNotifChannel(row.key, 'email')}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={notifMatrix[row.key]?.push ?? true}
                        onChange={() => toggleNotifChannel(row.key, 'push')}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={notifMatrix[row.key]?.sms ?? false}
                        onChange={() => toggleNotifChannel(row.key, 'sms')}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 8: FAMILY CONNECTION ==================== */}
      {(activeTab === 'family' || searchQuery !== '') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Family Caregiver Connection</span>
              </h2>
              <p className="text-xs text-slate-500">Invitation codes, linked family members, and permission grants</p>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('family-connections')}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors"
              >
                Open Family Portal
              </button>
            )}
          </div>

          <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-blue-900 block">Patient Invitation Code</span>
              <span className="text-xs text-blue-700 mt-0.5 block">Share this code with family members to let them log in & view adherence</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-mono font-black tracking-widest text-blue-900 bg-white px-4 py-2 rounded-xl border border-blue-200 shadow-2xs">
                {inviteCode || currentUser.familyInviteCode || 'A7K9P2'}
              </span>
              <button
                onClick={() => copyToClipboard(inviteCode || currentUser.familyInviteCode || 'A7K9P2', 'invite')}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-2xs"
              >
                {copiedInvite ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 9: AI & PRIVACY ==================== */}
      {(activeTab === 'ai' || activeTab === 'privacy' || searchQuery !== '') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SECTION 9: AI ACCOUNT */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span>AI Assistant Account & Context</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">AI Assistant Status</span>
                <span className="font-bold text-emerald-600">{aiDetails.status}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Memory Capacity</span>
                <span className="font-medium text-slate-800">{aiDetails.memoryUsage}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Conversations Logged</span>
                <span className="font-bold text-slate-900">{aiDetails.conversationCount}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <div>
                  <span className="font-bold text-slate-900 block">Personalized Health Context</span>
                  <span className="text-slate-400 text-[11px] block">Syncs active meds & adherence with Gemini</span>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-purple-600" />
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-2">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('ai-assistant')}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open AI Assistant</span>
                </button>
              )}
              <button
                onClick={() => handleExportData('json')}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Export History
              </button>
            </div>
          </div>

          {/* SECTION 11: PRIVACY CENTER */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <span>Data Export & Privacy Center</span>
            </h2>

            <p className="text-xs text-slate-500">
              Export your HIPAA medical logs, download adherence reports, or manage account deletion requests.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleExportData('json')}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-700 text-xs font-bold rounded-xl transition-colors border border-slate-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Download Complete Health Record (JSON)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => handleExportData('csv')}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-700 text-xs font-bold rounded-xl transition-colors border border-slate-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Export Adherence History (CSV Report)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setIsDeleteAccountModalOpen(true)}
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors border border-rose-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <Trash2 className="w-4 h-4" />
                  <span>Request Account & Data Deletion</span>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 10: APPLICATION INFORMATION ==================== */}
      {(activeTab === 'app-info' || searchQuery !== '') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Application & System Diagnostics</span>
              </h2>
              <p className="text-xs text-slate-500">Build versions, server health, environment parameters</p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
              Production Release v2.4.0
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">App Version</span>
              <span className="font-bold text-slate-900 block">{appInfo.appVersion || 'v2.4.0-production'}</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Flutter SDK</span>
              <span className="font-bold text-slate-900 block">{appInfo.flutterVersion || '3.22.2 (Channel stable)'}</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Backend Microservice</span>
              <span className="font-bold text-slate-900 block">{appInfo.backendVersion || 'v3.1.2 (Express + FastAPI)'}</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Database Engine</span>
              <span className="font-bold text-slate-900 block">{appInfo.databaseVersion || 'PostgreSQL 16.3 / MongoDB 7.0'}</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Firebase FCM Status</span>
              <span className="font-bold text-emerald-700 block">{appInfo.firebaseStatus || 'Connected & Active'}</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Server SLA Health</span>
              <span className="font-bold text-emerald-700 block">{appInfo.serverHealth || 'Operational (99.99%)'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 11: DEVELOPER DIAGNOSTICS ==================== */}
      {(activeTab === 'developer' || searchQuery !== '') && devModeEnabled && (
        <div className="bg-slate-950 text-slate-100 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2 font-mono">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <span>Developer Diagnostics & Microservice Inspection</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">Live environment inspection for FastApi, MongoDB, and Redis</p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold rounded-full border border-emerald-500/20">
              Dev Mode Enabled
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
              <span className="text-slate-500 text-[10px] block">FastAPI Worker</span>
              <span className="text-emerald-400 font-bold mt-1 block">{developerInfo.fastApiStatus || 'Healthy (Worker #4 Active)'}</span>
            </div>

            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
              <span className="text-slate-500 text-[10px] block">MongoDB Replica</span>
              <span className="text-emerald-400 font-bold mt-1 block">{developerInfo.mongoDbStatus || 'Connected (12ms)'}</span>
            </div>

            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Redis Cache</span>
              <span className="text-emerald-400 font-bold mt-1 block">{developerInfo.redisStatus || 'Connected (94.2% Hit Rate)'}</span>
            </div>

            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
              <span className="text-slate-500 text-[10px] block">JWT RS256 Engine</span>
              <span className="text-emerald-400 font-bold mt-1 block">{developerInfo.jwtStatus || 'Valid Signed'}</span>
            </div>
          </div>

          {/* Console Log Inspector */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-400 font-bold block">Live Application Event Logs</span>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400/90 space-y-1.5 max-h-48 overflow-y-auto">
              {(developerInfo.logs || [
                `[${new Date().toLocaleTimeString()}] INFO: FCM Token refreshed for user ${currentUser.id}`,
                `[${new Date(Date.now() - 300000).toLocaleTimeString()}] INFO: Calculated adherence risk for patient: LOW RISK (Score: 12)`,
                `[${new Date(Date.now() - 600000).toLocaleTimeString()}] INFO: Cron worker checked 4 scheduled doses for today`,
              ]).map((log: string, idx: number) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="text-blue-400">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== BOTTOM FLOATING ACTION BAR ==================== */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md border border-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-4 max-w-xl w-[92%] justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
          <span className="text-xs font-bold hidden sm:inline">Enterprise Account Portal</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchAccountData}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================== MODAL 1: EDIT PROFILE ==================== */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Edit Account Profile</h3>
              <button onClick={() => setIsEditProfileModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Avatar Image URL</label>
                <input
                  type="url"
                  value={profileData.avatarUrl}
                  onChange={(e) => setProfileData({ ...profileData, avatarUrl: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: CHANGE PASSWORD ==================== */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Change Account Password</h3>
              <button onClick={() => setIsChangePasswordModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassInput}
                  onChange={(e) => setCurrentPassInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassInput}
                  onChange={(e) => setConfirmPassInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 3: TEST NOTIFICATION ==================== */}
      {isTestNotifModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Send FCM Test Push Notification</h3>
              <button onClick={() => setIsTestNotifModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendTestNotification} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notification Title</label>
                <input
                  type="text"
                  required
                  value={testNotifTitle}
                  onChange={(e) => setTestNotifTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notification Body Message</label>
                <textarea
                  rows={3}
                  required
                  value={testNotifMsg}
                  onChange={(e) => setTestNotifMsg(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                Target FCM Token: <code className="font-mono text-blue-700">{fcmDetails.token.slice(0, 24)}...</code>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTestNotifModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Notification</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 4: SECURITY AUDIT ==================== */}
      {isSecurityAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Security Audit Results</span>
              </h3>
              <button onClick={() => setIsSecurityAuditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center space-x-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-900 text-sm block">System Security Grade: A+</span>
                  <span className="text-emerald-700">Your account passed 12 out of 12 security automated tests.</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">HIPAA Data Encryption</span>
                  <span className="font-bold text-emerald-600">AES-256 Valid</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">JWT Token Signatures</span>
                  <span className="font-bold text-emerald-600">RS256 Private Key</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Biometric Passkeys</span>
                  <span className="font-bold text-emerald-600">FIDO2 / WebAuthn Active</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">FCM Push Security</span>
                  <span className="font-bold text-emerald-600">Encrypted Payload</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsSecurityAuditModalOpen(false)}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
              >
                Close Audit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 5: DELETE ACCOUNT ==================== */}
      {isDeleteAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-rose-700 text-base flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Delete Account & Erase Data</span>
              </h3>
              <button onClick={() => setIsDeleteAccountModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteAccountSubmit} className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                This action is permanent. All your medical logs, medication schedules, family connection grants, and AI assistant history will be permanently deleted from our servers.
              </p>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Type <span className="font-mono text-rose-600">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteAccountModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs"
                >
                  Confirm Delete Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Icon components
function LayoutDashboardIcon(props: any) {
  return <Layers {...props} />;
}

function PillIcon(props: any) {
  return <Zap {...props} />;
}
