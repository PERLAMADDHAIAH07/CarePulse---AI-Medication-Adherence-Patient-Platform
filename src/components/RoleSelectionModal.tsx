import React, { useState } from 'react';
import { User, Heart, ShieldCheck, ArrowRight, UserPlus, KeyRound, X } from 'lucide-react';
import { User as UserType } from '../types';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onSelectUser: (user: UserType) => void;
  onRegisterPatient: (data: { name: string; email: string; phone?: string; password: string }) => Promise<void>;
  onRegisterFamily: (data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    familyInviteCode: string;
    relationship?: string;
  }) => Promise<void>;
  onFamilyLoginCode: (patientCode: string, caregiverName?: string, caregiverEmail?: string) => Promise<void>;
  initialMode?: 'FAMILY_LOGIN' | 'SELECT' | 'REGISTER_PATIENT' | 'REGISTER_FAMILY';
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  onRegisterPatient,
  onRegisterFamily,
  onFamilyLoginCode,
  initialMode = 'FAMILY_LOGIN',
}) => {
  const [mode, setMode] = useState<'FAMILY_LOGIN' | 'SELECT' | 'REGISTER_PATIENT' | 'REGISTER_FAMILY'>(initialMode);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('A7K9P2');
  const [relationship, setRelationship] = useState('Son / Caregiver');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleDemoPatient = () => {
    onSelectUser({
      id: 'p-101',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      phone: '+1 (555) 234-5678',
      role: 'PATIENT',
      familyInviteCode: 'A7K9P2',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
      createdAt: '2026-01-15T10:00:00Z',
    });
    onClose();
  };

  const handleDemoFamily = () => {
    onSelectUser({
      id: 'f-201',
      name: 'Marcus Johnson',
      email: 'marcus.j@example.com',
      phone: '+1 (555) 987-6543',
      role: 'FAMILY_MEMBER',
      familyInviteCode: '',
      linkedPatientId: 'p-101',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
      createdAt: '2026-02-01T14:30:00Z',
    });
    onClose();
  };

  const handleFamilyCodeLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setErrorMsg('Please enter a 6-character patient invitation code.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await onFamilyLoginCode(inviteCode.trim().toUpperCase(), name || 'Marcus Johnson', email || 'marcus.j@example.com');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid patient code. Please check code with patient.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await onRegisterPatient({ name, email, phone, password });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await onRegisterFamily({
        name,
        email,
        phone,
        password,
        familyInviteCode: inviteCode,
        relationship,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect family member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Top Modal Navigation Tabs */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setMode('FAMILY_LOGIN');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5 ${
                mode === 'FAMILY_LOGIN'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Family Code Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setMode('SELECT');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5 ${
                mode === 'SELECT'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Workspace Roles</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setMode('REGISTER_PATIENT');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5 ${
                mode === 'REGISTER_PATIENT'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New Patient</span>
            </button>
          </div>

          {mode === 'FAMILY_LOGIN' && (
            <form onSubmit={handleFamilyCodeLoginSubmit}>
              <div className="text-center mb-5">
                <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-blue-600 mb-2">
                  <KeyRound className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Family Member Login</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Enter the 6-character patient invitation code provided by your family member to log in and open their health profile.
                </p>
              </div>

              {errorMsg && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">{errorMsg}</div>}

              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Patient Invitation Code <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setInviteCode('A7K9P2')}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      Use Demo Code: A7K9P2
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A7K9P2"
                    className="w-full px-4 py-3 text-center text-xl font-mono font-black tracking-widest text-blue-900 bg-slate-50 uppercase rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Code for demo patient <strong className="text-slate-800">Sarah Johnson</strong> is <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">A7K9P2</code>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name (Caregiver)</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Marcus Johnson"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Caregiver Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="marcus.j@example.com"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs flex items-center space-x-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{loading ? 'Verifying Code...' : 'Open Patient Profile'}</span>
                </button>
              </div>
            </form>
          )}

          {mode === 'SELECT' && (
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-blue-600 mb-3">
                  <Heart className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Choose Workspace Role</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Switch instantly between Patient View or Linked Family Caregiver Monitoring.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div
                  onClick={handleDemoPatient}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    currentUser.role === 'PATIENT'
                      ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <img
                      src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80"
                      alt="Sarah Johnson"
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-blue-600/30"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">Sarah Johnson</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                          Patient
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Manage medications, adherence, symptoms & AI Assistant</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-600" />
                </div>

                <div
                  onClick={handleDemoFamily}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    currentUser.role === 'FAMILY_MEMBER'
                      ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <img
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80"
                      alt="Marcus Johnson"
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-600/30"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">Marcus Johnson</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                          Caregiver
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Monitor Sarah Johnson's missed-dose alerts & adherence</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-600" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
                <button
                  onClick={() => setMode('REGISTER_PATIENT')}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center justify-center space-x-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register New Patient</span>
                </button>
                <button
                  onClick={() => setMode('REGISTER_FAMILY')}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center space-x-1.5"
                >
                  <KeyRound className="w-4 h-4 text-slate-500" />
                  <span>Connect with Invite Code</span>
                </button>
              </div>
            </div>
          )}

          {mode === 'REGISTER_PATIENT' && (
            <form onSubmit={handleSubmitPatient}>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Register New Patient</h2>
              <p className="text-xs text-slate-500 mb-4">
                Create a patient account. A unique 6-character family invitation code will be generated.
              </p>

              {errorMsg && <div className="mb-3 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{errorMsg}</div>}

              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="eleanor@example.com"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setMode('SELECT')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  {loading ? 'Registering...' : 'Create Patient Account'}
                </button>
              </div>
            </form>
          )}

          {mode === 'REGISTER_FAMILY' && (
            <form onSubmit={handleSubmitFamily}>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Register Family Member / Caregiver</h2>
              <p className="text-xs text-slate-500 mb-4">
                Connect to a patient by entering their 6-character invitation code (e.g., A7K9P2).
              </p>

              {errorMsg && <div className="mb-3 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{errorMsg}</div>}

              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient Invitation Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A7K9P2"
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold tracking-widest text-blue-800 uppercase rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Use <strong className="text-slate-600">A7K9P2</strong> for demo patient Sarah Johnson.
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. David Johnson"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship to Patient</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Son / Caregiver">Son / Caregiver</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Primary Caregiver">Primary Caregiver</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="david@example.com"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setMode('SELECT')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  {loading ? 'Connecting...' : 'Connect to Patient'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
