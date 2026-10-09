import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle2,
  Clock,
  ArrowLeft,
  RefreshCw,
  X,
  Trash2,
  Eye,
  Check,
  AlertTriangle,
  HeartHandshake,
  Lock,
} from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../services/api';
import { BackButton } from './BackButton';

interface FamilyMemberItem {
  id: string;
  familyMemberId: string;
  name: string;
  email: string;
  relationship: string;
  status: 'ACTIVE' | 'PENDING';
  connectedSince?: string;
  requestedAt?: string;
  permissions: {
    medicationInfo: boolean;
    adherence: boolean;
    medicationAlerts: boolean;
    symptoms?: boolean;
    healthUpdates?: boolean;
    loginHistory?: boolean;
    securityInfo?: boolean;
  };
}

interface FamilyConnectionViewProps {
  currentUser: UserType;
  onNavigate?: (tab: string) => void;
}

export const FamilyConnectionView: React.FC<FamilyConnectionViewProps> = ({
  currentUser,
  onNavigate,
}) => {
  const [activeMembers, setActiveMembers] = useState<FamilyMemberItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FamilyMemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmailOrPhone, setInviteEmailOrPhone] = useState('');
  const [inviteRelationship, setInviteRelationship] = useState('Caregiver');
  const [inviteMedicationInfo, setInviteMedicationInfo] = useState(true);
  const [inviteAdherence, setInviteAdherence] = useState(true);
  const [inviteMedicationAlerts, setInviteMedicationAlerts] = useState(true);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // View / Edit Access Modal
  const [selectedMember, setSelectedMember] = useState<FamilyMemberItem | null>(null);
  const [editPermissionsMode, setEditPermissionsMode] = useState(false);
  const [permMedicationInfo, setPermMedicationInfo] = useState(true);
  const [permAdherence, setPermAdherence] = useState(true);
  const [permMedicationAlerts, setPermMedicationAlerts] = useState(true);
  const [updatingPerms, setUpdatingPerms] = useState(false);

  // Remove confirmation modal
  const [memberToRemove, setMemberToRemove] = useState<FamilyMemberItem | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchFamilyData();
  }, [currentUser.id]);

  const fetchFamilyData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api.getControlRoomFamily(currentUser.id);
      if (res && res.success) {
        setActiveMembers(res.activeMembers || []);
        setPendingRequests(res.pendingRequests || []);
      } else {
        setError(res?.error || 'Unable to load family connections.');
      }
    } catch (err: any) {
      console.error('Failed to load family connections:', err);
      setError('Unable to load family connections.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenAccessModal = (member: FamilyMemberItem) => {
    setSelectedMember(member);
    setEditPermissionsMode(false);
    setPermMedicationInfo(Boolean(member.permissions.medicationInfo));
    setPermAdherence(Boolean(member.permissions.adherence));
    setPermMedicationAlerts(Boolean(member.permissions.medicationAlerts));
  };

  const handleSavePermissions = async () => {
    if (!selectedMember) return;
    setUpdatingPerms(true);
    try {
      const res = await api.updateControlRoomFamilyPermissions(
        selectedMember.id,
        {
          medicationInfo: permMedicationInfo,
          adherence: permAdherence,
          medicationAlerts: permMedicationAlerts,
        },
        currentUser.id
      );

      if (res && res.success) {
        setActiveMembers((prev) =>
          prev.map((m) =>
            m.id === selectedMember.id
              ? {
                  ...m,
                  permissions: {
                    ...m.permissions,
                    medicationInfo: permMedicationInfo,
                    adherence: permAdherence,
                    medicationAlerts: permMedicationAlerts,
                  },
                }
              : m
          )
        );
        setSelectedMember(null);
        setEditPermissionsMode(false);
        showToast(`Access permissions updated for ${selectedMember.name}.`);
      } else {
        alert(res?.error || 'Failed to update access permissions.');
      }
    } catch (err: any) {
      console.error('Permissions update error:', err);
      alert('Failed to update access permissions.');
    } finally {
      setUpdatingPerms(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmailOrPhone.trim()) {
      alert('Please provide a name and email or phone number.');
      return;
    }

    setInviteSubmitting(true);
    try {
      const res = await api.inviteFamilyMember(
        currentUser.id,
        inviteName.trim(),
        inviteEmailOrPhone.trim(),
        inviteRelationship,
        {
          medicationInfo: inviteMedicationInfo,
          adherence: inviteAdherence,
          medicationAlerts: inviteMedicationAlerts,
        }
      );

      if (res && res.success) {
        setShowInviteModal(false);
        setInviteName('');
        setInviteEmailOrPhone('');
        setInviteRelationship('Caregiver');
        fetchFamilyData();
        showToast(`Invitation sent to ${inviteName.trim()}.`);
      } else {
        alert(res?.error || 'Failed to send invitation.');
      }
    } catch (err: any) {
      console.error('Invite error:', err);
      alert('Failed to send connection invitation.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    setRemovingMember(true);
    try {
      const res = await api.removeFamilyConnection(memberToRemove.id, currentUser.id);
      if (res && res.success) {
        setActiveMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
        setPendingRequests((prev) => prev.filter((m) => m.id !== memberToRemove.id));
        setMemberToRemove(null);
        showToast(`Family connection removed.`);
      } else {
        alert(res?.error || 'Failed to remove connection.');
      }
    } catch (err: any) {
      console.error('Removal error:', err);
      alert('Failed to remove connection.');
    } finally {
      setRemovingMember(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center space-x-2 text-xs font-bold animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==================== 1. HEADER & NAVIGATION ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2.5">
            <BackButton fallbackLabel="Back to Patient Control Room" />
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 text-xs font-semibold">Family Connection</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Family Connection</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Manage the family members or caregivers connected to your CarePulse account.
          </p>
        </div>

        {/* Action Controls */}
        <div className="shrink-0 flex items-center space-x-2">
          <button
            onClick={() => fetchFamilyData(true)}
            disabled={refreshing || loading}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs flex items-center space-x-2 disabled:opacity-50"
            title="Refresh family connections"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-2xs flex items-center space-x-2"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Connect Family Member</span>
          </button>
        </div>
      </div>

      {/* ==================== 2. MAIN BODY ==================== */}
      {loading ? (
        // Skeleton Loading State
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs animate-pulse space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100" />
                  <div className="space-y-1 flex-1">
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded" />
                <div className="h-8 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        // Error State
        <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{error}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We could not retrieve your family connections.
          </p>
          <button
            onClick={() => fetchFamilyData(false)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-2xs"
          >
            Try Again
          </button>
        </div>
      ) : activeMembers.length === 0 && pendingRequests.length === 0 ? (
        // Empty State
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-2xs text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <HeartHandshake className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No family members connected yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Connect a trusted family member or caregiver to support your care and receive medication alerts.
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-2xs inline-flex items-center space-x-2"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Connect Family Member</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ==================== 3. CONNECTED FAMILY MEMBERS ==================== */}
          {activeMembers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Connected Family Members ({activeMembers.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeMembers.map((member) => {
                  const accessItems: string[] = [];
                  if (member.permissions.medicationInfo) accessItems.push('Medication');
                  if (member.permissions.adherence) accessItems.push('Adherence');
                  if (member.permissions.medicationAlerts) accessItems.push('Alerts');

                  return (
                    <div
                      key={member.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
                              {member.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                {member.name}
                              </h4>
                              <p className="text-xs font-semibold text-slate-500">
                                {member.relationship} · <span className="font-normal text-slate-400">{member.email}</span>
                              </p>
                            </div>
                          </div>

                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                            Connected
                          </span>
                        </div>

                        {/* Access Permissions Summary */}
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Permitted Access:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {accessItems.length > 0 ? (
                              accessItems.map((item) => (
                                <span
                                  key={item}
                                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium"
                                >
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>{item}</span>
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-xs">No active access permissions</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleOpenAccessModal(member)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors inline-flex items-center space-x-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>View Access</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMemberToRemove(member)}
                          className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors inline-flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== 4. PENDING REQUESTS SECTION ==================== */}
          {pendingRequests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Pending Connections ({pendingRequests.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200 shadow-2xs flex flex-col justify-between space-y-3 bg-amber-50/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-200">
                          {req.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {req.name}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {req.relationship} · <span className="text-slate-600 font-mono">{req.email}</span>
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 mr-1 text-amber-600" />
                        Invitation Pending
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-100/60">
                      <span className="text-[11px] text-slate-500">
                        Waiting for family member to accept
                      </span>

                      <button
                        type="button"
                        onClick={() => setMemberToRemove(req)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-rose-600 border border-slate-200 text-xs font-bold transition-colors"
                      >
                        Cancel Request
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 5. PRIVACY & ACCESS NOTICE ==================== */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center space-x-2 font-bold text-slate-900">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>Family Access & Healthcare Privacy Protections</span>
            </div>
            <p className="leading-relaxed">
              Family members and caregivers can only view data you explicitly authorize. Connected persons never have access to your account passwords, login history, security settings, or private health notes.
            </p>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD / CONNECT FAMILY MEMBER ==================== */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Connect Family Member</h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Johnson"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Email Address or Phone</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. sarah.j@example.com or +1 (555) 019-2834"
                  value={inviteEmailOrPhone}
                  onChange={(e) => setInviteEmailOrPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Relationship</label>
                <select
                  value={inviteRelationship}
                  onChange={(e) => setInviteRelationship(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs"
                >
                  <option value="Caregiver">Caregiver</option>
                  <option value="Family Member">Family Member</option>
                  <option value="Authorized Support Person">Authorized Support Person</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Son / Daughter">Son / Daughter</option>
                </select>
              </div>

              {/* Initial Permissions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-700 block">Initial Access Permissions</label>
                
                <label className="flex items-center space-x-2.5 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={inviteMedicationInfo}
                    onChange={(e) => setInviteMedicationInfo(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">Medication Information (prescriptions & schedule)</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={inviteAdherence}
                    onChange={(e) => setInviteAdherence(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">Medication Adherence (daily progress %)</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={inviteMedicationAlerts}
                    onChange={(e) => setInviteMedicationAlerts(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">Medication Alerts (missed dose notifications)</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-2xs disabled:opacity-50"
                >
                  {inviteSubmitting ? 'Sending Request...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: VIEW & MANAGE ACCESS ==================== */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Family Access</h3>
                <p className="text-xs text-slate-500">
                  {selectedMember.name} · <span className="font-semibold text-slate-700">{selectedMember.relationship}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!editPermissionsMode ? (
              // READ-ONLY SUMMARY VIEW
              <div className="space-y-4 text-xs">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Can access:</span>
                  </div>
                  <div className="space-y-2 pl-2">
                    <div className="flex items-center space-x-2 text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Medication Information</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Adherence</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>Medication Alerts</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cannot access:</span>
                  </div>
                  <div className="space-y-2 pl-2 text-slate-500">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 font-bold">✕</span>
                      <span>Private Health Notes</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 font-bold">✕</span>
                      <span>Login History</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 font-bold">✕</span>
                      <span>Security Information</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedMember(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPermissionsMode(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-2xs"
                  >
                    Manage Access
                  </button>
                </div>
              </div>
            ) : (
              // EDIT PERMISSIONS MODE
              <div className="space-y-4 text-xs">
                <div className="space-y-2.5">
                  <label className="font-bold text-slate-700 block">Edit Permitted Access</label>

                  <label className="flex items-center space-x-2.5 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={permMedicationInfo}
                      onChange={(e) => setPermMedicationInfo(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">Medication Information</span>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={permAdherence}
                      onChange={(e) => setPermAdherence(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">Adherence Percentage</span>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={permMedicationAlerts}
                      onChange={(e) => setPermMedicationAlerts(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">Medication Alerts</span>
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px]">
                  Private health notes and account credentials remain permanently restricted from family access.
                </div>

                <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditPermissionsMode(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={updatingPerms}
                    onClick={handleSavePermissions}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-2xs disabled:opacity-50"
                  >
                    {updatingPerms ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL: REMOVE CONNECTION CONFIRMATION ==================== */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                Remove {memberToRemove.name}?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {memberToRemove.name} will no longer have access to the information shared with this connection.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removingMember}
                onClick={handleConfirmRemove}
                className="w-full py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition-colors shadow-2xs disabled:opacity-50"
              >
                {removingMember ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
