import React, { useState } from 'react';
import {
  Users,
  Sliders,
  X,
  Trash2,
} from 'lucide-react';
import { FamilyConnection, FamilyPermissions } from '../types';
import { InviteFamilyCard } from './InviteFamilyCard';
import { BackButton } from './BackButton';

interface FamilyConnectionsProps {
  inviteCode: string;
  onRegenerateCode: () => Promise<void>;
  familyMembers: FamilyConnection[];
  onUpdatePermissions: (connectionId: string, permissions: Partial<FamilyPermissions>) => Promise<void>;
  onRemoveFamilyMember: (connectionId: string) => Promise<void>;
}

export const FamilyConnections: React.FC<FamilyConnectionsProps> = ({
  inviteCode,
  familyMembers,
  onUpdatePermissions,
  onRemoveFamilyMember,
}) => {
  const [editingConnection, setEditingConnection] = useState<FamilyConnection | null>(null);
  const [permissionState, setPermissionState] = useState<FamilyPermissions>({
    medicationStatus: true,
    adherencePercentage: true,
    missedDoseAlerts: true,
    riskLevel: true,
    symptoms: true,
    healthUpdates: true,
    privateNotes: false,
    aiConversations: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const openPermissionModal = (member: FamilyConnection) => {
    setEditingConnection(member);
    setPermissionState({
      ...member.permissions,
    });
  };

  const handleSavePermissions = async () => {
    if (!editingConnection) return;
    setIsSaving(true);
    try {
      await onUpdatePermissions(editingConnection.id, permissionState);
      setEditingConnection(null);
    } catch (err) {
      console.error('Error saving family permissions:', err);
    } finally {
      setIsSaving(false);
    }
  };

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
            <Users className="w-7 h-7 text-blue-600" />
            <span>Family Connections & Permissions</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Connect trusted family caregivers with secure invitation codes and manage real-time caregiver access.
          </p>
        </div>
      </div>

      {/* Invitation Code Generator Box */}
      <InviteFamilyCard
        patientId="p-101"
        inviteCode={inviteCode}
        familyMembers={familyMembers}
      />

      {/* Connected Family Members List */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Connected Caregivers</h2>
            <p className="text-xs text-slate-500">Caregivers linked to your health updates and medication adherence feeds</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
            {familyMembers.length} Connected
          </span>
        </div>

        {familyMembers.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No connected family members yet</p>
            <p className="text-xs text-slate-500 mt-1">Share your 6-character code ({inviteCode}) to allow caregiver connectivity.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {familyMembers.map((member) => {
              return (
                <div
                  key={member.id}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                      {member.familyMemberName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-base">{member.familyMemberName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {member.relationship}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{member.familyMemberEmail}</p>
                      {member.phone && (
                        <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                          Phone: <span className="font-semibold text-slate-800">{member.phone}</span>
                        </p>
                      )}
                      <div className="flex items-center space-x-3 text-[11px] text-blue-700 font-medium mt-1">
                        <span>
                          Permitted: {Object.values(member.permissions || {}).filter(Boolean).length}/8 Data Channels
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => openPermissionModal(member)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center space-x-1.5"
                    >
                      <Sliders className="w-4 h-4 text-slate-500" />
                      <span>Manage Access & Alerts</span>
                    </button>
                    <button
                      onClick={() => onRemoveFamilyMember(member.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remove Caregiver"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Permissions Modal */}
      {editingConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingConnection(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Caregiver Access & Alerts
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Patient-controlled access permissions for <strong className="text-slate-800">{editingConnection.familyMemberName}</strong> ({editingConnection.relationship}).
            </p>

            {/* Granular Caregiver Data Permissions */}
            <div className="space-y-3 mb-6 divide-y divide-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Portal Data Access Permissions
              </h3>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">Medication Status</span>
                  <p className="text-[11px] text-slate-500">Allow viewing today's taken/pending status</p>
                </div>
                <input
                  type="checkbox"
                  checked={permissionState.medicationStatus}
                  onChange={(e) =>
                    setPermissionState({ ...permissionState, medicationStatus: e.target.checked })
                  }
                  className="w-4 h-4 accent-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">Adherence Percentage</span>
                  <p className="text-[11px] text-slate-500">Allow viewing weekly & monthly compliance rates</p>
                </div>
                <input
                  type="checkbox"
                  checked={permissionState.adherencePercentage}
                  onChange={(e) =>
                    setPermissionState({ ...permissionState, adherencePercentage: e.target.checked })
                  }
                  className="w-4 h-4 accent-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">Missed Dose Alerts</span>
                  <p className="text-[11px] text-slate-500">Send caregiver alerts when a dose is missed</p>
                </div>
                <input
                  type="checkbox"
                  checked={permissionState.missedDoseAlerts}
                  onChange={(e) =>
                    setPermissionState({ ...permissionState, missedDoseAlerts: e.target.checked })
                  }
                  className="w-4 h-4 accent-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">AI Risk Level Score</span>
                  <p className="text-[11px] text-slate-500">Allow viewing LOW / MEDIUM / HIGH risk status</p>
                </div>
                <input
                  type="checkbox"
                  checked={permissionState.riskLevel}
                  onChange={(e) =>
                    setPermissionState({ ...permissionState, riskLevel: e.target.checked })
                  }
                  className="w-4 h-4 accent-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">Symptoms Journal</span>
                  <p className="text-[11px] text-slate-500">Allow viewing logged physical symptoms</p>
                </div>
                <input
                  type="checkbox"
                  checked={permissionState.symptoms}
                  onChange={(e) =>
                    setPermissionState({ ...permissionState, symptoms: e.target.checked })
                  }
                  className="w-4 h-4 accent-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">Private Notes & AI Chats</span>
                  <p className="text-[11px] text-slate-500">Keep confidential conversations hidden</p>
                </div>
                <input
                  type="checkbox"
                  checked={permissionState.privateNotes}
                  onChange={(e) =>
                    setPermissionState({ ...permissionState, privateNotes: e.target.checked })
                  }
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setEditingConnection(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
