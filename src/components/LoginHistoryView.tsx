import React, { useState, useEffect } from 'react';
import {
  Clock,
  Laptop,
  Smartphone,
  Tablet,
  MapPin,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  ArrowLeft,
  X,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../services/api';
import { BackButton } from './BackButton';

interface LoginRecord {
  id: string;
  date: string;
  time: string;
  timestamp: string;
  location: string;
  device: string;
  deviceType?: string;
  browser: string;
  authMethod: string;
  status: 'SUCCESS' | 'FAILED' | 'UNUSUAL' | string;
  isCurrentDevice?: boolean;
}

interface LoginHistoryViewProps {
  currentUser: UserType;
  onNavigate?: (tab: string) => void;
}

export const LoginHistoryView: React.FC<LoginHistoryViewProps> = ({
  currentUser,
  onNavigate,
}) => {
  const [logs, setLogs] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple filter & search
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Details Modal
  const [selectedRecord, setSelectedRecord] = useState<LoginRecord | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [currentUser.id, statusFilter]);

  const fetchHistory = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api.getControlRoomLoginHistory({
        patientId: currentUser.id,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });

      if (res && Array.isArray(res.logs)) {
        setLogs(res.logs);
      } else {
        setLogs([]);
      }
    } catch (err: any) {
      console.error('Failed to load login history:', err);
      setError('Unable to load login history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory(true);
  };

  const getDeviceIcon = (device: string = '', deviceType: string = '') => {
    const text = `${device} ${deviceType}`.toLowerCase();
    if (text.includes('phone') || text.includes('android') || text.includes('iphone') || text.includes('mobile')) {
      return <Smartphone className="w-5 h-5 text-blue-600 shrink-0" />;
    }
    if (text.includes('tablet') || text.includes('ipad')) {
      return <Tablet className="w-5 h-5 text-blue-600 shrink-0" />;
    }
    return <Laptop className="w-5 h-5 text-blue-600 shrink-0" />;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ==================== 1. HEADER & BACK NAVIGATION ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2.5">
            <BackButton fallbackLabel="Back to Patient Control Room" />
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 text-xs font-semibold">Login History</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Clock className="w-6 h-6 text-blue-600" />
            <span>Login History</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            View when and where your CarePulse account was accessed.
          </p>
        </div>

        {/* Small Action */}
        <div className="shrink-0 flex items-center space-x-2">
          <button
            onClick={() => fetchHistory(true)}
            disabled={refreshing || loading}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ==================== 2. SIMPLE FILTER & SEARCH BAR ==================== */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Simple Filters */}
        <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto scrollbar-none">
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: 'SUCCESS', label: 'Successful' },
              { id: 'FAILED', label: 'Failed' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                statusFilter === filter.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search login history..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
        </form>
      </div>

      {/* ==================== 3. MAIN CONTENT: TIMELINE / CARDS ==================== */}
      {loading ? (
        // Clean Skeleton Loading State
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-100 rounded" />
                  <div className="h-3.5 w-48 bg-slate-100 rounded" />
                  <div className="h-3 w-40 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-8 w-20 bg-slate-100 rounded-xl self-end sm:self-auto" />
            </div>
          ))}
        </div>
      ) : error ? (
        // Error State
        <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{error}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We were unable to retrieve your account login records right now.
          </p>
          <button
            onClick={() => fetchHistory(false)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-2xs"
          >
            Try Again
          </button>
        </div>
      ) : logs.length === 0 ? (
        // Empty State
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No login history yet.</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your CarePulse sign-in activity will appear here.
          </p>
          {statusFilter !== 'ALL' || searchQuery ? (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors"
            >
              Reset Filters
            </button>
          ) : null}
        </div>
      ) : (
        // Chronological Login Records List
        <div className="space-y-3">
          {logs.map((record) => {
            const isSuccess = record.status === 'SUCCESS';
            const isFailed = record.status === 'FAILED';
            const isUnusual = record.status === 'UNUSUAL';

            return (
              <div
                key={record.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left Side: Status, Timing, Location, Device & Method */}
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                    {getDeviceIcon(record.device, record.deviceType)}
                  </div>

                  <div className="space-y-1.5">
                    {/* Status & Timing */}
                    <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                      {isSuccess && (
                        <span className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Successful Login</span>
                        </span>
                      )}

                      {isFailed && (
                        <span className="flex items-center space-x-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Failed Login</span>
                        </span>
                      )}

                      {isUnusual && (
                        <span className="flex items-center space-x-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Unusual Login</span>
                        </span>
                      )}

                      <span className="text-xs font-bold text-slate-900">
                        {record.date} • {record.time}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{record.location}</span>
                    </div>

                    {/* Device, Browser & Current Device badge */}
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">
                        {record.device}
                      </span>
                      <span>·</span>
                      <span>{record.browser}</span>

                      {record.isCurrentDevice && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 ml-1">
                          Current Device
                        </span>
                      )}
                    </div>

                    {/* Authentication Method */}
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{record.authMethod}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Simple Details Button */}
                <div className="self-end sm:self-center shrink-0">
                  <button
                    onClick={() => setSelectedRecord(record)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== 4. SIMPLE DETAILS MODAL ==================== */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Login Details</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-slate-900">
                  {selectedRecord.status === 'SUCCESS'
                    ? 'Successful'
                    : selectedRecord.status === 'FAILED'
                    ? 'Failed'
                    : 'Unusual'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-900">{selectedRecord.date}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Time</span>
                <span className="font-semibold text-slate-900">{selectedRecord.time}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Location</span>
                <span className="font-semibold text-slate-900">{selectedRecord.location}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Device</span>
                <span className="font-semibold text-slate-900">{selectedRecord.device}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Browser</span>
                <span className="font-semibold text-slate-900">{selectedRecord.browser}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Authentication</span>
                <span className="font-semibold text-slate-900">{selectedRecord.authMethod}</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-500">Current Device</span>
                <span className="font-semibold text-slate-900">
                  {selectedRecord.isCurrentDevice ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
