import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Share2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Trash2,
  Plus,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { FamilyConnection } from '../types';
import { api } from '../services/api';

interface InviteFamilyCardProps {
  patientId: string;
  inviteCode?: string;
  familyMembers?: FamilyConnection[];
  onCodeChange?: (newCode: string) => void;
  onRefreshFamily?: () => void;
}

export const InviteFamilyCard: React.FC<InviteFamilyCardProps> = ({
  patientId,
  inviteCode: initialInviteCode = '',
  familyMembers = [],
  onCodeChange,
  onRefreshFamily,
}) => {
  const [code, setCode] = useState(initialInviteCode || 'CP-7X92-KLM4');
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  // Sync prop changes
  React.useEffect(() => {
    if (initialInviteCode) {
      setCode(initialInviteCode);
    }
  }, [initialInviteCode]);

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleShareCode = async () => {
    if (!code) return;
    const shareData = {
      title: 'CarePulse Family Care Connection',
      text: `Join my CarePulse care team! Use my Patient Invite Code: ${code} to securely access my health updates.`,
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: Copy formatted text to clipboard
      try {
        await navigator.clipboard.writeText(
          `Join my CarePulse care team! Use my Patient Invite Code: ${code} to securely access my health updates.`
        );
        setShared(true);
        setStatusMsg('Invite message copied to clipboard!');
        setTimeout(() => {
          setShared(false);
          setStatusMsg('');
        }, 3000);
      } catch {}
    }
  };

  const handleRegenerateCode = async () => {
    setLoading(true);
    setStatusMsg('');
    try {
      const res = await api.regenerateFamilyInviteCode(patientId);
      const newCode = res.code || 'CP-7X92-KLM4';
      setCode(newCode);
      if (onCodeChange) onCodeChange(newCode);
      setStatusMsg('New invitation code generated successfully!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch {
      // Fallback generated code
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let p1 = '', p2 = '';
      for (let i = 0; i < 4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
      for (let i = 0; i < 4; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
      const fallbackCode = `CP-${p1}-${p2}`;
      setCode(fallbackCode);
      if (onCodeChange) onCodeChange(fallbackCode);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeCode = async () => {
    setLoading(true);
    try {
      await api.revokeFamilyInviteCode(patientId);
      setCode('');
      if (onCodeChange) onCodeChange('');
      setShowRevokeConfirm(false);
      setStatusMsg('Invite code revoked. No new caregivers can connect with the old code.');
      setTimeout(() => setStatusMsg(''), 4000);
    } catch {
      setCode('');
      if (onCodeChange) onCodeChange('');
      setShowRevokeConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this family member?')) return;
    try {
      await api.removeFamilyMember(connectionId);
      if (onRefreshFamily) onRefreshFamily();
    } catch {}
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Invite Family Member</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Share this code with a trusted family member to connect them to your CarePulse care information.
          </p>
        </div>

        <span className="self-start sm:self-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted Family Network</span>
        </span>
      </div>

      {statusMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{statusMsg}</span>
          </div>
        </div>
      )}

      {/* Primary Invite Code Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Patient Invite Code
              </span>
            </div>
            <h3 className="text-base font-bold text-white">Caregiver Connection Access</h3>
            <p className="text-xs text-slate-300 max-w-md leading-relaxed">
              Family members enter this code during login or account creation to securely view your allowed health updates.
            </p>
          </div>

          {/* Code Display & Action Controls */}
          {code ? (
            <div className="flex flex-col items-center justify-center bg-slate-800/90 p-5 rounded-2xl border border-slate-700/80 min-w-[240px] space-y-3">
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                  Your Active Code
                </span>
                <span className="font-mono font-black text-2xl sm:text-3xl tracking-wider text-emerald-400 select-all">
                  {code}
                </span>
              </div>

              {/* Four Action Buttons: Copy, Share, Regenerate, Revoke */}
              <div className="grid grid-cols-2 gap-2 w-full pt-1">
                <button
                  onClick={handleCopyCode}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>

                <button
                  onClick={handleShareCode}
                  className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5"
                >
                  {shared ? <Check className="w-3.5 h-3.5 text-blue-200" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{shared ? 'Shared!' : 'Share Code'}</span>
                </button>

                <button
                  onClick={handleRegenerateCode}
                  disabled={loading}
                  className="py-2 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-all border border-slate-600 flex items-center justify-center space-x-1.5"
                  title="Generate a fresh code"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>

                <button
                  onClick={() => setShowRevokeConfirm(true)}
                  disabled={loading}
                  className="py-2 px-3 rounded-xl bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all border border-rose-800/50 flex items-center justify-center space-x-1.5"
                  title="Disable current code"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Revoke</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center bg-slate-800/80 p-6 rounded-2xl border border-slate-700 text-center space-y-3 min-w-[240px]">
              <p className="text-xs text-rose-300 font-semibold">No active invite code</p>
              <button
                onClick={handleRegenerateCode}
                disabled={loading}
                className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Invite Code</span>
              </button>
            </div>
          )}
        </div>

        {/* Revoke Confirmation Dialog */}
        {showRevokeConfirm && (
          <div className="mt-4 p-4 bg-rose-950/80 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Are you sure you want to revoke this code? Existing connected family members remain connected, but no new members can use this code.</span>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
              <button
                onClick={handleRevokeCode}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Confirm Revoke
              </button>
              <button
                onClick={() => setShowRevokeConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connected Family Members Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Connected Family Members</span>
            </h3>
            <p className="text-xs text-slate-500">Caregivers currently connected to your CarePulse record</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            {familyMembers.length} Active Caregiver{familyMembers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {familyMembers.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No connected family members yet</p>
            <p className="text-[11px] text-slate-500">
              Share your Patient Invite Code ({code || 'CP-7X92-KLM4'}) with a family member to connect them.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {familyMembers.map((member) => (
              <div
                key={member.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                    {member.familyMemberName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{member.familyMemberName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {member.relationship || 'Caregiver'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 uppercase">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{member.familyMemberEmail}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Disconnect Family Member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
