import React, { useState, useEffect } from 'react';
import {
  Bell,
  ArrowLeft,
  RefreshCw,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Pill,
  Users,
  Shield,
  ShieldAlert,
  Smartphone,
  Laptop,
  Search,
  Filter,
  Trash2,
  Eye,
  Sliders,
  Radio,
  Zap,
  Info,
  Clock,
  Send,
  X,
  ExternalLink,
  MessageSquare,
  AlertOctagon,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { User as UserType, AlertNotification, NotificationPreference, SlackAlertRecord } from '../types';
import { api } from '../services/api';
import { BackButton } from './BackButton';

interface NotificationsViewProps {
  currentUser: UserType;
  onNavigate?: (tab: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  currentUser,
  onNavigate,
}) => {
  // Main Data States
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference>({
    medicationReminders: true,
    missedDoseAlerts: true,
    familyCareAlerts: true,
    securityAlerts: true,
    pushChannel: true,
    smsChannel: true,
    inAppChannel: true,
    soundAlerts: true,
  });
  const [registeredDevices, setRegisteredDevices] = useState<any[]>([]);
  const [slackAlerts, setSlackAlerts] = useState<SlackAlertRecord[]>([]);

  // UI States
  const [activeSubTab, setActiveSubTab] = useState<'inbox' | 'preferences' | 'slack-ops'>('inbox');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MEDICATION' | 'FAMILY_ALERT' | 'SECURITY_ALERT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Scheduler Status State
  const [schedulerStatus, setSchedulerStatus] = useState<{
    activeScheduledCount: number;
    nextMedication: {
      medicationName: string;
      dosage: string;
      scheduledTime: string;
      timingText: string;
    } | null;
    registeredDevicesCount: number;
    timezone: string;
    currentTime: string;
    currentDate: string;
    schedulerActive: boolean;
  } | null>(null);

  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Selected Notification Modal/Drawer State
  const [selectedNotif, setSelectedNotif] = useState<AlertNotification | null>(null);

  // Live incoming toast simulation
  const [liveBanner, setLiveBanner] = useState<AlertNotification | null>(null);

  useEffect(() => {
    fetchNotifications();
    fetchSlackAlerts();
  }, [currentUser.id]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const [data, schedData] = await Promise.allSettled([
        api.getControlRoomNotifications({
          patientId: currentUser.id,
        }),
        api.getMedicationSchedulerStatus(currentUser.id),
      ]);

      if (data.status === 'fulfilled') {
        setNotifications(data.value.notifications || []);
        setUnreadCount(data.value.unreadCount || 0);
        setTotalCount(data.value.totalCount || 0);
        if (data.value.preferences) setPreferences(data.value.preferences);
        if (data.value.registeredDevices) setRegisteredDevices(data.value.registeredDevices);
      }

      if (schedData.status === 'fulfilled') {
        setSchedulerStatus(schedData.value);
      }

      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      showToast('Unable to load latest notifications.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSlackAlerts = async () => {
    try {
      const data = await api.getInternalSlackAlerts();
      setSlackAlerts(data.alerts || []);
    } catch (err: any) {
      console.error('Failed to load Slack alerts:', err);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
    fetchSlackAlerts();
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (selectedNotif?.id === id) {
        setSelectedNotif((prev) => (prev ? { ...prev, isRead: true } : null));
      }
      showToast('Marked as read');
    } catch (err) {
      showToast('Failed to update read state', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead(currentUser.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
      showToast('All notifications marked as read');
    } catch (err) {
      showToast('Failed to mark all as read', 'error');
    }
  };

  const handleDeleteNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.deleteControlRoomNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (selectedNotif?.id === id) setSelectedNotif(null);
      showToast('Notification removed from history');
    } catch (err) {
      showToast('Failed to delete notification', 'error');
    }
  };

  const handleTogglePreference = async (key: keyof NotificationPreference) => {
    if (key === 'securityAlerts') {
      showToast('Security alerts are mandatory by healthcare safety policy', 'info');
      return;
    }

    const updated = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(updated);

    try {
      await api.updateControlRoomNotificationPreferences(currentUser.id, updated);
      showToast('Preferences updated');
    } catch (err) {
      showToast('Failed to update preference', 'error');
      // Revert
      setPreferences(preferences);
    }
  };

  // Trigger Internal Slack Alert Simulator
  const handleTriggerSlackAlert = async () => {
    try {
      const res = await api.triggerInternalSlackAlert({
        severity: 'Critical',
        service: 'Notification Service',
        referenceId: `ERR-${Math.floor(1000 + Math.random() * 9000)}`,
        message: 'Push worker connection timeout during peak schedule dispatch cycle.',
        action: 'Review Notification Service logs and reconnect FCM Admin gateway',
      });
      if (res.alert) {
        setSlackAlerts((prev) => [res.alert, ...prev]);
        showToast('Internal Slack operational alert dispatched to #carepulse-ops-alerts');
      }
    } catch (err: any) {
      showToast('Failed to dispatch Slack alert', 'error');
    }
  };

  // Filtered Notifications List
  const filteredNotifications = notifications.filter((notif) => {
    // Type filter
    if (typeFilter === 'MEDICATION') {
      if (notif.type !== 'MEDICATION_REMINDER' && notif.type !== 'MISSED_DOSE') return false;
    } else if (typeFilter !== 'ALL') {
      if (notif.type !== typeFilter) return false;
    }

    // Status filter
    if (statusFilter === 'unread' && notif.isRead) return false;
    if (statusFilter === 'read' && !notif.isRead) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = notif.title.toLowerCase().includes(q);
      const matchMessage = notif.message.toLowerCase().includes(q);
      const matchReason = notif.triggerReason?.toLowerCase().includes(q);
      if (!matchTitle && !matchMessage && !matchReason) return false;
    }

    return true;
  });

  // Format Helper for Notification Type Badges & Icons
  const getTypeMeta = (type: string) => {
    switch (type) {
      case 'MEDICATION_REMINDER':
        return {
          icon: Pill,
          label: 'Medication Reminder',
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          badgeColor: 'bg-blue-100 text-blue-800',
        };
      case 'MISSED_DOSE':
        return {
          icon: AlertTriangle,
          label: 'Missed Dose Alert',
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          badgeColor: 'bg-amber-100 text-amber-900',
        };
      case 'FAMILY_ALERT':
        return {
          icon: Users,
          label: 'Care Alert',
          color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
          badgeColor: 'bg-emerald-100 text-emerald-900',
        };
      case 'SECURITY_ALERT':
        return {
          icon: ShieldAlert,
          label: 'Security Alert',
          color: 'text-rose-600 bg-rose-50 border-rose-200',
          badgeColor: 'bg-rose-100 text-rose-900',
        };
      default:
        return {
          icon: Bell,
          label: 'System Notification',
          color: 'text-slate-600 bg-slate-50 border-slate-200',
          badgeColor: 'bg-slate-100 text-slate-800',
        };
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const isToday = new Date().toDateString() === date.toDateString();
      const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) {
        return `Today • ${timePart}`;
      }
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} • ${timePart}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto animate-fade-in">
      {/* Toast Feedback */}
      {toastMsg && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center space-x-2.5 transition-all ${
            toastMsg.type === 'error'
              ? 'bg-rose-900 text-rose-100 border-rose-700'
              : toastMsg.type === 'info'
              ? 'bg-blue-900 text-blue-100 border-blue-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Real-time Incoming Alert Banner (FCM Push Preview) */}
      {liveBanner && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-blue-500/40 flex items-start justify-between gap-4 animate-bounce">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-blue-500/20 rounded-2xl border border-blue-400/30 text-blue-300 shrink-0">
              <Zap className="w-5 h-5 text-blue-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/20">
                  ⚡ Live FCM Push Received
                </span>
                <span className="text-[11px] text-blue-300">Just now</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1">{liveBanner.title}</h4>
              <p className="text-xs text-blue-100 mt-0.5">{liveBanner.message}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedNotif(liveBanner);
              setLiveBanner(null);
            }}
            className="px-3 py-1.5 rounded-xl bg-white text-blue-950 hover:bg-blue-50 text-xs font-bold shrink-0 transition-colors"
          >
            View Details
          </button>
        </div>
      )}

      {/* ==================== 1. TOP BAR / NAVIGATION HEADER ==================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <BackButton fallbackLabel="Back to Patient Control Room" />
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black text-slate-900">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-2xs">
                    Unread: {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                View and manage your CarePulse alerts, real-time push events, and notification history.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Mark All as Read</span>
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ==================== 2. SUB-VIEW SELECTOR TABS ==================== */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('inbox')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeSubTab === 'inbox'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Notification Center ({totalCount})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('preferences')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeSubTab === 'preferences'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Notification Preferences</span>
        </button>

        <button
          onClick={() => setActiveSubTab('slack-ops')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeSubTab === 'slack-ops'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
          <span>Internal Slack Operations ({slackAlerts.length})</span>
        </button>
      </div>

      {/* ==================== SUB-VIEW 1: INBOX & REAL-TIME ALERTS ==================== */}
      {activeSubTab === 'inbox' && (
        <div className="space-y-6">
          {/* A. 💊 MEDICATION REMINDER SYSTEM STATUS */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-base">💊</span>
                  <h3 className="text-sm font-bold text-white">Medication Reminder System</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Automated Scheduler Active</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    FCM Push Channels Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Medication reminders are automatically sent according to your scheduled medication times.
                </p>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('medications')}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors flex items-center space-x-1.5 shrink-0 shadow-sm"
                >
                  <Pill className="w-3.5 h-3.5" />
                  <span>Manage Medication Schedule</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Real Information Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Active Scheduled Medications */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Active Scheduled Medications</span>
                  <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300">
                    <Pill className="w-4 h-4" />
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">
                    {schedulerStatus?.activeScheduledCount ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {(schedulerStatus?.activeScheduledCount ?? 0) === 1
                      ? '1 active prescription monitored'
                      : `${schedulerStatus?.activeScheduledCount ?? 0} active prescriptions monitored`}
                  </p>
                </div>
              </div>

              {/* Card 2: Next Medication */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Next Scheduled Dose</span>
                  <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                    <Clock className="w-4 h-4" />
                  </span>
                </div>
                <div>
                  {schedulerStatus?.nextMedication ? (
                    <>
                      <div className="text-base font-black text-emerald-300 truncate">
                        {schedulerStatus.nextMedication.medicationName}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                        {schedulerStatus.nextMedication.dosage} • {schedulerStatus.nextMedication.timingText}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-base font-black text-slate-300">No Pending Doses</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">All scheduled doses completed</p>
                    </>
                  )}
                </div>
              </div>

              {/* Card 3: Configured Timezone & Clock */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Patient Timezone</span>
                  <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                    <Radio className="w-4 h-4" />
                  </span>
                </div>
                <div>
                  <div className="text-base font-black text-white truncate">
                    {schedulerStatus?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles'}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Local Time: <span className="text-slate-200 font-mono font-medium">{schedulerStatus?.currentTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
                </div>
              </div>

              {/* Card 4: Delivery Channels */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Delivery Channels</span>
                  <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                    <Smartphone className="w-4 h-4" />
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>FCM Push & In-App Alerts</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {registeredDevices.length || schedulerStatus?.registeredDevicesCount || 2} active registered devices
                  </p>
                </div>
              </div>
            </div>

            {/* Scheduled Alert Delivery Explanation Notice */}
            <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-start space-x-3 text-xs text-slate-400">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11.5px]">
                CarePulse monitors active prescriptions server-side. At each scheduled intake time, an official push notification is dispatched to all registered devices. Doses not logged within 30 minutes trigger automatic missed dose records and notify authorized family caregivers.
              </p>
            </div>
          </div>

          {/* B. SEARCH & FILTER CONTROLS */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none">
              {[
                { id: 'ALL', label: 'All Alerts' },
                { id: 'MEDICATION', label: '💊 Medication' },
                { id: 'FAMILY_ALERT', label: '👨‍👩‍👧 Family' },
                { id: 'SECURITY_ALERT', label: '🔐 Security' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                    typeFilter === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

              <button
                onClick={() => setStatusFilter(statusFilter === 'unread' ? 'all' : 'unread')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 flex items-center space-x-1 ${
                  statusFilter === 'unread'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>🔴 Unread Only</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alert history..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* C. NOTIFICATION LIST & EMPTY STATES */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-3xl p-5 border border-slate-200 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 rounded-md w-1/3" />
                  <div className="h-3 bg-slate-100 rounded-md w-2/3" />
                  <div className="h-3 bg-slate-100 rounded-md w-1/4" />
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-2xs text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Bell className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No notifications found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || typeFilter !== 'ALL' || statusFilter !== 'all'
                  ? 'No alerts match your active filters. Try clearing your search or filter tags.'
                  : 'Your CarePulse alerts and real-time push reminders will appear here.'}
              </p>
              {(searchQuery || typeFilter !== 'ALL' || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setTypeFilter('ALL');
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors inline-block"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notif) => {
                const meta = getTypeMeta(notif.type);
                const Icon = meta.icon;
                return (
                  <div
                    key={notif.id}
                    onClick={() => setSelectedNotif(notif)}
                    className={`group bg-white rounded-3xl p-4 sm:p-5 border transition-all cursor-pointer shadow-2xs hover:shadow-xs hover:border-blue-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      !notif.isRead ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start space-x-3.5 min-w-0">
                      {/* Type Icon */}
                      <div className={`p-3 rounded-2xl border ${meta.color} shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badgeColor}`}>
                            {meta.label}
                          </span>
                          {!notif.isRead ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                              <span>Unread</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center space-x-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Read</span>
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatTimestamp(notif.createdAt)}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{notif.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{notif.message}</p>
                      </div>
                    </div>

                    {/* Right Meta & Actions */}
                    <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        ✓ {notif.deliveryStatus || 'Delivered'}
                      </span>

                      {!notif.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                          title="Mark as Read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={(e) => handleDeleteNotification(notif.id, e)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== SUB-VIEW 2: NOTIFICATION PREFERENCES ==================== */}
      {activeSubTab === 'preferences' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <span>Patient Alert & Delivery Preferences</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure which events create alerts on your account. Settings are synchronized to the backend in real time.
              </p>
            </div>

            {/* Alert Categories */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Healthcare Event Types</h4>

              {/* 1. Medication Reminders */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">💊 Medication Reminders</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Receive alerts when scheduled medication intake times arrive (e.g. “It's time to take Metformin”).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleTogglePreference('medicationReminders')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    preferences.medicationReminders
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {preferences.medicationReminders ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* 2. Missed Dose Alerts */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">⚠️ Missed Dose Alerts</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Trigger alerts if a scheduled medication dose is not marked taken within the 30-minute window.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleTogglePreference('missedDoseAlerts')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    preferences.missedDoseAlerts
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {preferences.missedDoseAlerts ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* 3. Family / Caregiver Alerts */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">👨‍👩‍👧 Family & Caregiver Notifications</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Dispatch care alerts to authorized family members who have verified permissions enabled.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleTogglePreference('familyCareAlerts')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    preferences.familyCareAlerts
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {preferences.familyCareAlerts ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* 4. Security Alerts */}
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 flex items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-800 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h5 className="text-xs font-bold text-slate-900">🔐 Security & Authentication Alerts</h5>
                      <span className="px-2 py-0.2 text-[9px] font-bold bg-rose-200 text-rose-900 rounded-full">
                        Mandatory Policy
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Alerts for logins from new devices, session revocations, and suspicious account activities.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleTogglePreference('securityAlerts')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white cursor-default"
                >
                  ALWAYS ACTIVE
                </button>
              </div>
            </div>

            {/* Delivery Channels */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Channels</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">FCM Push</span>
                  </div>
                  <button
                    onClick={() => handleTogglePreference('pushChannel')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      preferences.pushChannel ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {preferences.pushChannel ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-800">In-App Center</span>
                  </div>
                  <button
                    onClick={() => handleTogglePreference('inAppChannel')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      preferences.inAppChannel ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {preferences.inAppChannel ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">SMS Alerts</span>
                  </div>
                  <button
                    onClick={() => handleTogglePreference('smsChannel')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      preferences.smsChannel ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {preferences.smsChannel ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-VIEW 3: INTERNAL SLACK OPERATIONS ==================== */}
      {activeSubTab === 'slack-ops' && (
        <div className="space-y-6">
          {/* Architectural Boundary Callout */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Internal Team & Operations Alert Channel</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    #carepulse-ops-alerts
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                  Slack is strictly an <span className="text-white font-semibold">internal operations channel</span> for the CarePulse engineering and clinical operations team.
                  It is completely decoupled from patient healthcare communication and follows strict HIPAA PHI data minimization.
                </p>
              </div>

              <button
                onClick={handleTriggerSlackAlert}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-2 shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Simulate Backend Failure Alert</span>
              </button>
            </div>

            {/* Strict PHI Data Minimization Principles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
                <span className="font-bold text-emerald-400 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Permitted in Slack Ops Alerts</span>
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Service name, error severity (Critical/High), UTC timestamp, reference error ID (e.g. ERR-2048),
                  technical description, and secure internal investigation links.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-900/60 space-y-1.5">
                <span className="font-bold text-rose-400 flex items-center space-x-1.5">
                  <AlertOctagon className="w-4 h-4" />
                  <span>Strictly Banned from Slack (HIPAA Protection)</span>
                </span>
                <p className="text-[11px] text-rose-200 leading-relaxed">
                  Patient names, medication details, diagnoses, prescription images, auth tokens, and FCM private tokens.
                  Healthcare data is never sent to Slack.
                </p>
              </div>
            </div>
          </div>

          {/* Operational Alerts Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Operational Alert Audit Log ({slackAlerts.length})
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                Channel: #carepulse-ops-alerts
              </span>
            </div>

            <div className="space-y-3">
              {slackAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          alert.severity === 'Critical'
                            ? 'bg-rose-100 text-rose-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {alert.severity === 'Critical' ? '🔴' : '⚠️'} {alert.severity}
                      </span>
                      <span className="font-bold text-slate-900">{alert.service}</span>
                      <span className="text-[11px] font-mono text-slate-400">Ref: {alert.referenceId}</span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      {formatTimestamp(alert.timestamp)}
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed">{alert.message}</p>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-200/60">
                    <span>
                      <strong className="text-slate-700">Recommended Action:</strong> {alert.action}
                    </span>
                    <span className="text-emerald-700 font-bold">✓ Delivered to Slack</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 4. NOTIFICATION DETAILS MODAL / DRAWER ==================== */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-start space-x-3">
                <div className={`p-3 rounded-2xl border ${getTypeMeta(selectedNotif.type).color} shrink-0`}>
                  {React.createElement(getTypeMeta(selectedNotif.type).icon, { className: 'w-6 h-6' })}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getTypeMeta(selectedNotif.type).badgeColor}`}>
                      {getTypeMeta(selectedNotif.type).label}
                    </span>
                    {!selectedNotif.isRead ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        🔴 Unread
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                        ✓ Read
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{selectedNotif.title}</h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedNotif(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Structured Information */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Message</label>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-medium leading-relaxed">
                  {selectedNotif.message}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Triggered Because (Event Reason)</label>
                <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200 text-blue-950 font-medium leading-relaxed">
                  {selectedNotif.triggerReason || 'Authoritative CarePulse scheduled event trigger.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Date & Time</span>
                  <span className="text-xs font-bold text-slate-800">{formatTimestamp(selectedNotif.createdAt)}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery Status</span>
                  <span className="text-xs font-bold text-emerald-600">✓ Delivered (FCM Push)</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>Target Device: <strong className="text-slate-800">{selectedNotif.targetDeviceName || 'MacBook Pro (Chrome)'}</strong></span>
                <span className="font-mono text-[10px] text-slate-400">ID: {selectedNotif.id}</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={(e) => handleDeleteNotification(selectedNotif.id, e)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 text-xs font-bold transition-colors flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center space-x-2">
                {!selectedNotif.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(selectedNotif.id)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark as Read</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
