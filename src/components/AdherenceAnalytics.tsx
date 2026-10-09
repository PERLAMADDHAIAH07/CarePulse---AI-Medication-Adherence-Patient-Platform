import React, { useState } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Calendar,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { AdherenceLog, AdherenceSummary } from '../types';
import { BackButton } from './BackButton';

interface AdherenceAnalyticsProps {
  logs: AdherenceLog[];
  summary: AdherenceSummary;
}

export const AdherenceAnalytics: React.FC<AdherenceAnalyticsProps> = ({ logs, summary }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (filterStatus === 'ALL') return true;
    return log.status === filterStatus;
  });

  const takenCount = logs.filter((l) => l.status === 'TAKEN').length;
  const missedCount = logs.filter((l) => l.status === 'MISSED').length;
  const pendingCount = logs.filter((l) => l.status === 'PENDING' || l.status === 'UPCOMING').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Back Action */}
      <div className="flex items-center justify-between">
        <BackButton fallbackLabel="Back to Dashboard" />
      </div>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <TrendingUp className="w-7 h-7 text-blue-600" />
            <span>Adherence Analytics & Compliance</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track dose compliance percentages, missed dose patterns, and overall adherence trajectory.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Today's Adherence</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-black text-slate-900">{summary.todayPercentage}%</span>
            <span className="text-xs font-semibold text-blue-600">
              {summary.takenToday}/{summary.totalScheduledToday} Doses
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all"
              style={{ width: `${summary.todayPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Weekly Compliance</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-black text-blue-700">{summary.weeklyPercentage}%</span>
            <span className="text-xs font-semibold text-emerald-600">Past 7 Days</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${summary.weeklyPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Doses Logged</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-3xl font-black text-slate-900">{logs.length}</span>
            <span className="text-xs font-semibold text-slate-500">History</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {takenCount} Taken • {missedCount} Missed
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Adherence Trend</span>
          <div className="flex items-center space-x-2 mt-1">
            <span
              className={`text-xl font-bold uppercase ${
                summary.trend === 'improving'
                  ? 'text-emerald-600'
                  : summary.trend === 'declining'
                  ? 'text-rose-600'
                  : 'text-amber-600'
              }`}
            >
              {summary.trend}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Calculated based on 14-day history window</p>
        </div>
      </div>

      {/* Adherence History Table & Filter */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Adherence Logs History</h2>
            <p className="text-xs text-slate-500">Detailed list of recorded intake statuses</p>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses ({logs.length})</option>
              <option value="TAKEN">Taken ({takenCount})</option>
              <option value="MISSED">Missed ({missedCount})</option>
              <option value="PENDING">Pending / Upcoming ({pendingCount})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="pb-3 px-2">Medication</th>
                <th className="pb-3 px-2">Scheduled Time</th>
                <th className="pb-3 px-2">Date</th>
                <th className="pb-3 px-2">Logged Status</th>
                <th className="pb-3 px-2">Taken At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-2 font-bold text-slate-900">
                    {log.medicineName}{' '}
                    <span className="text-slate-500 font-normal">({log.dosage})</span>
                  </td>
                  <td className="py-3.5 px-2 text-slate-700 font-semibold">{log.scheduledTime}</td>
                  <td className="py-3.5 px-2 text-slate-500">{log.scheduledDate}</td>
                  <td className="py-3.5 px-2">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                        log.status === 'TAKEN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.status === 'MISSED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {log.status === 'TAKEN' ? (
                        <CheckCircle2 className="w-3 h-3 mr-0.5" />
                      ) : log.status === 'MISSED' ? (
                        <XCircle className="w-3 h-3 mr-0.5" />
                      ) : (
                        <Clock className="w-3 h-3 mr-0.5" />
                      )}
                      <span>{log.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-slate-500">
                    {log.takenAt ? new Date(log.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
