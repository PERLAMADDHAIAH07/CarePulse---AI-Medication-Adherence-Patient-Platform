import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  Laptop,
  Clock,
  MapPin,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../services/api';
import { BackButton } from './BackButton';

interface SecurityAlert {
  id: string;
  title: string;
  message: string;
  date: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface SecurityData {
  overallStatus: 'PROTECTED' | 'ATTENTION_RECOMMENDED' | 'ACTION_REQUIRED';
  statusTitle: string;
  statusDescription: string;
  accountProtection: {
    authentication: string;
    currentSession: string;
    loginProtection: string;
    twoFactorEnabled: boolean;
    authMethod: string;
  };
  deviceSecurity: {
    activeDevicesCount: number;
    hasUnknownDevices: boolean;
    statusMessage: string;
  };
  recentLogin: {
    date: string;
    time: string;
    location: string;
    device: string;
    deviceType?: string;
    browser: string;
    status: string;
    isSuccessful: boolean;
  };
  alerts: SecurityAlert[];
  hasAlerts: boolean;
}

interface SecurityCenterViewProps {
  currentUser: UserType;
  onNavigate?: (tab: string) => void;
}

export const SecurityCenterView: React.FC<SecurityCenterViewProps> = ({
  currentUser,
  onNavigate,
}) => {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSecurityData();
  }, [currentUser.id]);

  const fetchSecurityData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api.getControlRoomSecurity(currentUser.id);
      if (res && res.success) {
        setData(res);
      } else {
        setError(res?.error || 'Unable to load security status.');
      }
    } catch (err: any) {
      console.error('Failed to load security status:', err);
      setError('Unable to load your security status.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ==================== 1. HEADER & NAVIGATION ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2.5">
            <BackButton fallbackLabel="Back to Patient Control Room" />
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 text-xs font-semibold">Security Center</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Shield className="w-6 h-6 text-blue-600" />
            <span>Security Center</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Check your CarePulse account security and manage important security actions.
          </p>
        </div>

        {/* Refresh Action */}
        <div className="shrink-0 flex items-center space-x-2">
          <button
            onClick={() => fetchSecurityData(true)}
            disabled={refreshing || loading}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ==================== 2. MAIN CONTENT ==================== */}
      {loading ? (
        // Skeleton Loading State
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs animate-pulse space-y-3">
            <div className="h-4 w-32 bg-slate-100 rounded" />
            <div className="h-6 w-56 bg-slate-100 rounded" />
            <div className="h-4 w-80 bg-slate-100 rounded" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs animate-pulse space-y-3">
                <div className="h-4 w-28 bg-slate-100 rounded" />
                <div className="h-5 w-40 bg-slate-100 rounded" />
                <div className="h-3 w-48 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : error || !data ? (
        // Error State
        <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{error || 'Unable to load your security status.'}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We could not retrieve your account security status right now.
          </p>
          <button
            onClick={() => fetchSecurityData(false)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-2xs"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ==================== 3. MAIN SECURITY STATUS CARD ==================== */}
          <div
            className={`rounded-3xl p-6 sm:p-7 border shadow-2xs transition-all ${
              data.overallStatus === 'PROTECTED'
                ? 'bg-emerald-50/70 border-emerald-200'
                : data.overallStatus === 'ATTENTION_RECOMMENDED'
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-rose-50/70 border-rose-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div
                  className={`p-3 rounded-2xl shrink-0 ${
                    data.overallStatus === 'PROTECTED'
                      ? 'bg-emerald-600 text-white'
                      : data.overallStatus === 'ATTENTION_RECOMMENDED'
                      ? 'bg-amber-500 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  <ShieldCheck className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Account Security
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        data.overallStatus === 'PROTECTED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : data.overallStatus === 'ATTENTION_RECOMMENDED'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {data.overallStatus === 'PROTECTED'
                        ? '🟢 Protected'
                        : data.overallStatus === 'ATTENTION_RECOMMENDED'
                        ? '🟡 Attention Recommended'
                        : '🔴 Action Required'}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {data.statusTitle}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600">
                    {data.statusDescription}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== 4. CORE CARDS GRID ==================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CARD 1: ACCOUNT PROTECTION */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Lock className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Account Protection</h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {data.accountProtection.authMethod}
                  </span>
                </div>

                <div className="space-y-2.5 pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Authentication</span>
                    <span className="flex items-center space-x-1.5 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{data.accountProtection.authentication}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Current Session</span>
                    <span className="flex items-center space-x-1.5 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{data.accountProtection.currentSession}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Login Protection</span>
                    <span className="flex items-center space-x-1.5 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{data.accountProtection.loginProtection}</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('auth')}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>Manage Authentication & Session</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* CARD 2: DEVICE SECURITY */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Device Security</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {data.deviceSecurity.activeDevicesCount} Active {data.deviceSecurity.activeDevicesCount === 1 ? 'Device' : 'Devices'}
                  </span>
                </div>

                <div className="space-y-2 pt-3 text-xs">
                  <div className="flex items-center space-x-2 text-slate-700">
                    {data.deviceSecurity.hasUnknownDevices ? (
                      <span className="flex items-center space-x-1.5 font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Unknown or new device detected</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>No unknown devices detected.</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    All active sessions correspond to authorized patient devices.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('devices')}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>View Active Devices</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* CARD 3: RECENT LOGIN */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Clock className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Recent Login</h3>
                  </div>
                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      data.recentLogin.isSuccessful
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {data.recentLogin.isSuccessful ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-rose-600" />
                    )}
                    <span>{data.recentLogin.status}</span>
                  </span>
                </div>

                <div className="space-y-2 pt-3 text-xs text-slate-600">
                  <div className="font-bold text-slate-900">
                    {data.recentLogin.date} • {data.recentLogin.time}
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{data.recentLogin.location}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-500">
                    <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{data.recentLogin.device} · {data.recentLogin.browser}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('login-history')}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>View Login History</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* CARD 4: SECURITY ALERTS */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Security Alerts</h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {data.alerts.length === 0 ? '0 Active' : `${data.alerts.length} Active`}
                  </span>
                </div>

                <div className="space-y-2 pt-3 text-xs">
                  {data.alerts.length === 0 ? (
                    <div className="py-2 text-slate-600 space-y-1">
                      <div className="flex items-center space-x-1.5 font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>No security issues detected.</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-5.5">
                        Your recent account activity looks normal.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center space-x-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>{alert.title}</span>
                            </span>
                            <span className="text-[10px] text-amber-700">{alert.date}</span>
                          </div>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            {alert.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {data.alerts.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('login-history')}
                  className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-2xs"
                >
                  <span>Review Alerts in Login History</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="w-full py-2 px-3 rounded-xl bg-slate-50 text-slate-400 text-xs font-semibold flex items-center justify-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>All Systems Normal</span>
                </div>
              )}
            </div>
          </div>

          {/* ==================== 5. QUICK SECURITY ACTIONS ==================== */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Quick Security Actions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('auth')}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2.5">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    Authentication & Session
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('devices')}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2.5">
                  <Laptop className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    Manage Active Devices
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('login-history')}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    Review Login History
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
