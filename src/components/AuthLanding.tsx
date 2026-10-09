import React, { useState } from 'react';
import {
  Heart,
  ShieldCheck,
  User,
  Users,
  ArrowRight,
  Lock,
  Mail,
  KeyRound,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
  ChevronLeft,
  X,
  Smartphone,
  Shield,
  Activity,
  HeartPulse,
  ChevronRight,
} from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../services/api';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  googleProvider,
} from '../services/firebase';

interface AuthLandingProps {
  onAuthenticated: (data: { user: UserType; patient?: UserType }) => void;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onAuthenticated }) => {
  // Navigation & Screen Steps
  const [screenStep, setScreenStep] = useState<'LANDING' | 'PATIENT_AUTH' | 'FAMILY_AUTH' | 'CONNECT_PATIENT' | 'CONNECTED_SUCCESS'>('LANDING');
  const [connectedSuccessData, setConnectedSuccessData] = useState<{ user: UserType; patient: UserType } | null>(null);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'OTP'>('LOGIN');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);

  // Invite Code State for Family Flow
  const [inviteCode, setInviteCode] = useState('');
  const [relationship, setRelationship] = useState('Son / Caregiver');
  const [pendingFamilyUser, setPendingFamilyUser] = useState<UserType | null>(null);

  // Status & Feedback State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const [isNoCodeInfoOpen, setIsNoCodeInfoOpen] = useState(false);
  const [isHowToGetCodeOpen, setIsHowToGetCodeOpen] = useState(false);

  // Helper: Password Strength Calculator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-blue-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const pwdStrength = getPasswordStrength(password);

  // Fast Demo Shortcuts
  const handleQuickDemoPatient = async () => {
    setLoading(true);
    try {
      const res = await api.login('sarah.johnson@example.com', 'hashed_password_123', 'PATIENT');
      onAuthenticated({ user: res.user, patient: res.user });
    } catch {
      // Fallback
      onAuthenticated({
        user: {
          id: 'p-101',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@example.com',
          phone: '+1 (555) 234-5678',
          role: 'PATIENT',
          familyInviteCode: 'A7K9P2',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
          createdAt: '2026-01-15T10:00:00Z',
        },
        patient: {
          id: 'p-101',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@example.com',
          phone: '+1 (555) 234-5678',
          role: 'PATIENT',
          familyInviteCode: 'A7K9P2',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
          createdAt: '2026-01-15T10:00:00Z',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoFamily = async () => {
    setLoading(true);
    try {
      const res = await api.login('marcus.j@example.com', 'hashed_password_456', 'FAMILY_MEMBER');
      onAuthenticated({
        user: res.user,
        patient: res.patient || {
          id: 'p-101',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@example.com',
          phone: '+1 (555) 234-5678',
          role: 'PATIENT',
          familyInviteCode: 'A7K9P2',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
          createdAt: '2026-01-15T10:00:00Z',
        },
      });
    } catch {
      onAuthenticated({
        user: {
          id: 'f-201',
          name: 'Marcus Johnson',
          email: 'marcus.j@example.com',
          phone: '+1 (555) 987-6543',
          role: 'FAMILY_MEMBER',
          familyInviteCode: '',
          linkedPatientId: 'p-101',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
          createdAt: '2026-02-01T14:30:00Z',
        },
        patient: {
          id: 'p-101',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@example.com',
          phone: '+1 (555) 234-5678',
          role: 'PATIENT',
          familyInviteCode: 'A7K9P2',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
          createdAt: '2026-01-15T10:00:00Z',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Patient Auth Submit
  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (authMode === 'LOGIN') {
        const loginEmail = email || 'sarah.johnson@example.com';
        const loginPwd = password || 'password';
        let fbUid = '';
        let idToken = '';

        try {
          const cred = await signInWithEmailAndPassword(auth, loginEmail, loginPwd);
          fbUid = cred.user.uid;
          idToken = await cred.user.getIdToken();
        } catch (fbErr: any) {
          // Log or gracefully fallback to backend authentication
        }

        const res = await api.firebaseAuthExchange({
          idToken,
          uid: fbUid,
          email: loginEmail,
          password: loginPwd,
          role: 'PATIENT',
          loginMethod: 'Email + Password',
        });
        onAuthenticated({ user: res.user, patient: res.user });
      } else if (authMode === 'REGISTER') {
        let fbUid = '';
        let idToken = '';

        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          fbUid = cred.user.uid;
          idToken = await cred.user.getIdToken();
        } catch (fbErr: any) {
          // If already exists in Firebase Auth or network issue
        }

        const res = await api.firebaseAuthExchange({
          idToken,
          uid: fbUid,
          name: name || 'Eleanor Vance',
          email,
          phone,
          password,
          role: 'PATIENT',
          loginMethod: 'Create Account',
        });
        onAuthenticated({ user: res.user, patient: res.user });
      } else if (authMode === 'OTP') {
        if (!otpSent) {
          setOtpSent(true);
          setSuccessMessage('A 6-digit verification code has been sent via SMS.');
          setLoading(false);
          return;
        }
        const res = await api.verifyOtp({ phone, otp, role: 'PATIENT', name });
        onAuthenticated({ user: res.user, patient: res.user });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Family Auth Submit
  const handleFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      // If user provided a Patient Invite Code in the form, verify and connect immediately
      if (inviteCode && inviteCode.trim()) {
        try {
          const codeRes = await api.familyLoginWithCode(
            inviteCode.trim(),
            name || 'Caregiver Family Member',
            email || 'marcus.j@example.com'
          );
          if (codeRes && codeRes.user && codeRes.patient) {
            setConnectedSuccessData({ user: codeRes.user, patient: codeRes.patient });
            setScreenStep('CONNECTED_SUCCESS');
            return;
          }
        } catch (codeErr: any) {
          setErrorMessage(codeErr.message || 'This Patient Invite Code is no longer active or invalid. Please check and try again.');
          setLoading(false);
          return;
        }
      }

      if (authMode === 'LOGIN') {
        const famEmail = email || 'marcus.j@example.com';
        const famPwd = password || 'password';
        let fbUid = '';
        let idToken = '';

        try {
          const cred = await signInWithEmailAndPassword(auth, famEmail, famPwd);
          fbUid = cred.user.uid;
          idToken = await cred.user.getIdToken();
        } catch (fbErr: any) {
          // Gracefully continue to backend authorization
        }

        const res = await api.firebaseAuthExchange({
          idToken,
          uid: fbUid,
          email: famEmail,
          password: famPwd,
          role: 'FAMILY_MEMBER',
          familyInviteCode: inviteCode,
          loginMethod: 'Email + Password',
        });

        // Check if user is connected to a patient
        if (res.user.linkedPatientId && res.patient) {
          onAuthenticated({ user: res.user, patient: res.patient });
        } else {
          // Needs connection
          setPendingFamilyUser(res.user);
          setScreenStep('CONNECT_PATIENT');
        }
      } else if (authMode === 'REGISTER') {
        let fbUid = '';
        let idToken = '';

        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          fbUid = cred.user.uid;
          idToken = await cred.user.getIdToken();
        } catch (fbErr: any) {
          // Gracefully continue to backend registration
        }

        const res = await api.firebaseAuthExchange({
          idToken,
          uid: fbUid,
          name: name || 'Caregiver Family Member',
          email,
          phone,
          password,
          role: 'FAMILY_MEMBER',
          familyInviteCode: inviteCode,
          relationship,
          loginMethod: 'Create Account',
        });

        if (res.user.linkedPatientId && res.patient) {
          onAuthenticated({ user: res.user, patient: res.patient });
        } else {
          setPendingFamilyUser(res.user);
          setScreenStep('CONNECT_PATIENT');
        }
      } else if (authMode === 'OTP') {
        if (!otpSent) {
          setOtpSent(true);
          setSuccessMessage('A 6-digit OTP code has been sent via SMS.');
          setLoading(false);
          return;
        }
        const res = await api.verifyOtp({ phone, otp, role: 'FAMILY_MEMBER', name });
        if (res.user.linkedPatientId && res.patient) {
          onAuthenticated({ user: res.user, patient: res.patient });
        } else {
          setPendingFamilyUser(res.user);
          setScreenStep('CONNECT_PATIENT');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Auth with Firebase & Backend Authorization
  const handleGoogleAuth = async (role: 'PATIENT' | 'FAMILY_MEMBER') => {
    setLoading(true);
    setErrorMessage('');
    try {
      let fbUid = '';
      let googleEmail = '';
      let googleName = '';
      let googlePhoto = '';
      let idToken = '';

      try {
        const cred = await signInWithPopup(auth, googleProvider);
        fbUid = cred.user.uid;
        googleEmail = cred.user.email || '';
        googleName = cred.user.displayName || '';
        googlePhoto = cred.user.photoURL || '';
        idToken = await cred.user.getIdToken();
      } catch (popupErr: any) {
        // Fallback for popups blocked or demo environments
      }

      const defaultEmail = role === 'PATIENT' ? 'sarah.johnson@example.com' : 'marcus.j@example.com';
      const defaultName = role === 'PATIENT' ? 'Sarah Johnson' : 'Marcus Johnson';
      const defaultPhoto =
        role === 'PATIENT'
          ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80'
          : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80';

      const res = await api.firebaseAuthExchange({
        idToken,
        uid: fbUid,
        email: googleEmail || defaultEmail,
        name: googleName || defaultName,
        role,
        photoUrl: googlePhoto || defaultPhoto,
        loginMethod: 'Google OAuth',
      });

      if (role === 'PATIENT') {
        onAuthenticated({ user: res.user, patient: res.user });
      } else {
        if (res.user.linkedPatientId && res.patient) {
          onAuthenticated({ user: res.user, patient: res.patient });
        } else {
          setPendingFamilyUser(res.user);
          setScreenStep('CONNECT_PATIENT');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Patient Invite Code Verification
  const handleConnectPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setErrorMessage('Please enter the 6-character patient invitation code.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const res = await api.connectPatient({
        userId: pendingFamilyUser?.id,
        familyInviteCode: inviteCode.trim(),
        relationship,
      });

      setConnectedSuccessData({
        user: res.user,
        patient: res.patient,
      });
      setScreenStep('CONNECTED_SUCCESS');
    } catch (err: any) {
      setErrorMessage(err.message || 'This invite code is invalid or no longer active. Please request a new code from the patient.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Submit using Firebase Auth
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setLoading(true);
    try {
      try {
        await sendPasswordResetEmail(auth, forgotEmail);
      } catch (fbErr: any) {
        // Continue to server-side notification
      }
      await api.forgotPassword(forgotEmail);
      setForgotSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* Top Header / Brand Nav Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setScreenStep('LANDING')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-2 text-white shadow-md shadow-blue-500/20 flex items-center justify-center">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-tight text-slate-900">CarePulse</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 uppercase tracking-wider">
                  Enterprise Auth
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Intelligent Healthcare & Family Medication Portal
              </p>
            </div>
          </div>

          {/* Demo Quick Logins pill bar */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-400 hidden lg:inline-block">Quick Demo Preview:</span>
            <button
              onClick={handleQuickDemoPatient}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all flex items-center space-x-1.5"
            >
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Demo</span> Patient (Sarah)
            </button>
            <button
              onClick={handleQuickDemoFamily}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all flex items-center space-x-1.5"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Demo</span> Caregiver (Marcus)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-10 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Branding, Value Prop & Security Badges (Desktop 5-col / 7-col split) */}
          <div className="lg:col-span-5 space-y-6 lg:pr-4 text-slate-900">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 text-blue-800 text-xs font-bold border border-blue-200/80">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>HIPAA-Aware Privacy & Security</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-[1.15]">
              Medication Safety & Care, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600">Reimagined.</span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              CarePulse bridges patients and family caregivers through intelligent medication tracking, adherence reminders, symptom logs, and privacy-first permission control.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Smart Adherence</h4>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Automated schedules, missed-dose alerts & AI risk scoring.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Family Care Network</h4>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Secure invitation codes with granular data sharing choices.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">AI Care Assistant</h4>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Permission-aware answers based strictly on authorized logs.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Privacy & Audits</h4>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">End-to-end encrypted session keys and real-time audit trails.</p>
                </div>
              </div>
            </div>

            {/* Trust Indicators Footer */}
            <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
              <span className="flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>256-Bit SSL Encrypted</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>HIPAA Standards</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-600" />
                <span>99.9% Uptime</span>
              </span>
            </div>
          </div>

          {/* Right Column: Authentication Card (Interactive State Machine) */}
          <div className="lg:col-span-7 w-full max-w-xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden relative transition-all duration-300">
              
              {/* Back button if in sub-step */}
              {screenStep !== 'LANDING' && (
                <div className="px-6 pt-5 pb-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <button
                    onClick={() => {
                      setErrorMessage('');
                      setSuccessMessage('');
                      if (screenStep === 'CONNECT_PATIENT' && pendingFamilyUser) {
                        setScreenStep('FAMILY_AUTH');
                      } else {
                        setScreenStep('LANDING');
                      }
                    }}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Options</span>
                  </button>

                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {screenStep === 'PATIENT_AUTH' && 'Patient Journey'}
                    {screenStep === 'FAMILY_AUTH' && 'Family Caregiver Journey'}
                    {screenStep === 'CONNECT_PATIENT' && 'Patient Connection'}
                  </span>
                </div>
              )}

              <div className="p-6 sm:p-8 lg:p-10">

                {/* Feedback Alerts */}
                {errorMessage && (
                  <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start space-x-3 animate-in fade-in">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">Authentication Alert</p>
                      <p className="mt-0.5">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {successMessage && (
                  <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start space-x-3 animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">Success</p>
                      <p className="mt-0.5">{successMessage}</p>
                    </div>
                  </div>
                )}

                {/* ================= STEP 1: AUTH LANDING SCREEN ================= */}
                {screenStep === 'LANDING' && (
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center border border-blue-100 shadow-2xs">
                        <Heart className="w-6 h-6" />
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Welcome to CarePulse</h2>
                      <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                        Secure medication and family care management, powered by intelligent healthcare assistance.
                      </p>
                    </div>

                    <div className="space-y-4 pt-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                        Select Your Account Role
                      </p>

                      {/* Option 1: Patient */}
                      <div
                        onClick={() => {
                          setErrorMessage('');
                          setSuccessMessage('');
                          setAuthMode('LOGIN');
                          setScreenStep('PATIENT_AUTH');
                        }}
                        className="group p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-600 bg-white hover:bg-blue-50/40 transition-all cursor-pointer shadow-2xs hover:shadow-md flex items-start justify-between space-x-4"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="p-3 rounded-2xl bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                            <User className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-900">Patient</h3>
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
                                Personal Care
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 group-hover:text-slate-600 leading-relaxed">
                              Manage your medicines, medication schedules, symptoms, health records, adherence and personal care.
                            </p>
                          </div>
                        </div>
                        <div className="pt-2">
                          <button className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 group-hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center space-x-1 shrink-0">
                            <span>Continue</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Option 2: Family / Caregiver */}
                      <div
                        onClick={() => {
                          setErrorMessage('');
                          setSuccessMessage('');
                          setAuthMode('LOGIN');
                          setScreenStep('FAMILY_AUTH');
                        }}
                        className="group p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 bg-white hover:bg-emerald-50/40 transition-all cursor-pointer shadow-2xs hover:shadow-md flex items-start justify-between space-x-4"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                            <Users className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-950">Family / Caregiver</h3>
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                Authorized Support
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 group-hover:text-slate-600 leading-relaxed">
                              Connect securely with an authorized patient and help monitor their medication and care.
                            </p>
                          </div>
                        </div>
                        <div className="pt-2">
                          <button className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 group-hover:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center space-x-1 shrink-0">
                            <span>Continue</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-center text-slate-400 pt-2">
                      🔒 Protected by end-to-end security protocols & patient permission enforcement.
                    </p>
                  </div>
                )}

                {/* ================= STEP 2: PATIENT AUTHENTICATION ================= */}
                {screenStep === 'PATIENT_AUTH' && (
                  <div className="space-y-5">
                    <div className="text-center">
                      <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-blue-600 mb-2 border border-blue-100">
                        <User className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">Patient Authentication</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {authMode === 'LOGIN' && 'Sign in to access your medication profile and personal care logs.'}
                        {authMode === 'REGISTER' && 'Create a new Patient Account. Your unique invitation code will be generated.'}
                        {authMode === 'OTP' && 'Sign in with Phone SMS OTP verification.'}
                      </p>
                    </div>

                    {/* Mode Selector Tabs */}
                    <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('LOGIN');
                          setErrorMessage('');
                        }}
                        className={`flex-1 py-2 rounded-lg transition-all ${
                          authMode === 'LOGIN' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('REGISTER');
                          setErrorMessage('');
                        }}
                        className={`flex-1 py-2 rounded-lg transition-all ${
                          authMode === 'REGISTER' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Create Account
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('OTP');
                          setErrorMessage('');
                        }}
                        className={`flex-1 py-2 rounded-lg transition-all ${
                          authMode === 'OTP' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Phone OTP
                      </button>
                    </div>

                    {/* Google OAuth Quick Button */}
                    {authMode !== 'OTP' && (
                      <div>
                        <button
                          type="button"
                          onClick={() => handleGoogleAuth('PATIENT')}
                          disabled={loading}
                          className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-2xs hover:bg-slate-50"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Continue with Google</span>
                        </button>
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                          </div>
                          <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                            <span className="bg-white px-2">or continue with email</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Patient Auth Form */}
                    <form onSubmit={handlePatientSubmit} className="space-y-4">
                      {authMode === 'REGISTER' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Eleanor Vance"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      )}

                      {authMode !== 'OTP' && (
                        <>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                              {authMode === 'LOGIN' && (
                                <button
                                  type="button"
                                  onClick={() => setEmail('sarah.johnson@example.com')}
                                  className="text-[10px] font-bold text-blue-600 hover:underline"
                                >
                                  Use Demo Email
                                </button>
                              )}
                            </div>
                            <div className="relative">
                              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                              <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="sarah.johnson@example.com"
                                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-semibold text-slate-700">Password</label>
                              {authMode === 'LOGIN' && (
                                <button
                                  type="button"
                                  onClick={() => setIsForgotPasswordOpen(true)}
                                  className="text-[11px] font-bold text-blue-600 hover:underline"
                                >
                                  Forgot Password?
                                </button>
                              )}
                            </div>
                            <div className="relative">
                              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>

                            {/* Password Strength Meter when registering */}
                            {authMode === 'REGISTER' && password.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                                  <span>Password Strength:</span>
                                  <span>{pwdStrength.label}</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-300 ${pwdStrength.color}`}
                                    style={{ width: `${pwdStrength.score}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Phone OTP fields */}
                      {authMode === 'OTP' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone Number</label>
                            <div className="relative">
                              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                              <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 (555) 234-5678"
                                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          {otpSent && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">6-Digit Verification Code</label>
                              <input
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="123456"
                                className="w-full px-3.5 py-2.5 text-center text-lg font-mono tracking-widest rounded-xl border border-blue-400 bg-blue-50/50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-500 mt-1 block text-center">
                                Use demo code <code className="font-bold text-blue-700">123456</code>
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Remember Session */}
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rememberSession}
                            onChange={(e) => setRememberSession(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Remember session on this device</span>
                        </label>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 mt-2"
                      >
                        <User className="w-4 h-4" />
                        <span>
                          {loading
                            ? 'Authenticating...'
                            : authMode === 'LOGIN'
                            ? 'Sign In as Patient'
                            : authMode === 'REGISTER'
                            ? 'Create Patient Account'
                            : otpSent
                            ? 'Verify Code & Sign In'
                            : 'Send SMS Code'}
                        </span>
                      </button>
                    </form>
                  </div>
                )}

                {/* ================= STEP 3: FAMILY AUTHENTICATION ================= */}
                {screenStep === 'FAMILY_AUTH' && (
                  <div className="space-y-5">
                    <div className="text-center">
                      <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-700 mb-2 border border-emerald-100">
                        <Users className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">Family & Caregiver Access</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {authMode === 'LOGIN' && 'Sign in to access authorized patient medication logs and care updates.'}
                        {authMode === 'REGISTER' && 'Create a Family Caregiver Account. Next step connects you to a patient.'}
                        {authMode === 'OTP' && 'Sign in with Phone SMS OTP.'}
                      </p>
                    </div>

                    {/* Mode Selector Tabs */}
                    <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('LOGIN');
                          setErrorMessage('');
                        }}
                        className={`flex-1 py-2 rounded-lg transition-all ${
                          authMode === 'LOGIN' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('REGISTER');
                          setErrorMessage('');
                        }}
                        className={`flex-1 py-2 rounded-lg transition-all ${
                          authMode === 'REGISTER' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Create Account
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('OTP');
                          setErrorMessage('');
                        }}
                        className={`flex-1 py-2 rounded-lg transition-all ${
                          authMode === 'OTP' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Phone OTP
                      </button>
                    </div>

                    {/* Google OAuth Quick Button */}
                    {authMode !== 'OTP' && (
                      <div>
                        <button
                          type="button"
                          onClick={() => handleGoogleAuth('FAMILY_MEMBER')}
                          disabled={loading}
                          className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-2xs hover:bg-slate-50"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Continue with Google</span>
                        </button>
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                          </div>
                          <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                            <span className="bg-white px-2">or continue with email</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Family Auth Form */}
                    <form onSubmit={handleFamilySubmit} className="space-y-4">
                      {authMode === 'REGISTER' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name</label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Marcus Johnson"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      )}

                      {authMode !== 'OTP' && (
                        <>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                              {authMode === 'LOGIN' && (
                                <button
                                  type="button"
                                  onClick={() => setEmail('marcus.j@example.com')}
                                  className="text-[10px] font-bold text-emerald-800 hover:underline"
                                >
                                  Use Demo Email
                                </button>
                              )}
                            </div>
                            <div className="relative">
                              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                              <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="marcus.j@example.com"
                                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-semibold text-slate-700">Password</label>
                              {authMode === 'LOGIN' && (
                                <button
                                  type="button"
                                  onClick={() => setIsForgotPasswordOpen(true)}
                                  className="text-[11px] font-bold text-emerald-800 hover:underline"
                                >
                                  Forgot Password?
                                </button>
                              )}
                            </div>
                            <div className="relative">
                              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Patient Invite Code Field */}
                          <div className="pt-2 border-t border-slate-100/80">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-semibold text-slate-800 flex items-center space-x-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Patient Invite Code</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsHowToGetCodeOpen(!isHowToGetCodeOpen)}
                                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-0.5 hover:underline"
                              >
                                <HelpCircle className="w-3 h-3 mr-0.5" />
                                <span>How do I get an invite code?</span>
                              </button>
                            </div>

                            <div className="relative">
                              <KeyRound className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3" />
                              <input
                                type="text"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                placeholder="CP-KA7T-QPMR"
                                className="w-full pl-10 pr-24 py-2.5 text-xs font-mono font-bold tracking-wider rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none uppercase bg-emerald-50/20"
                              />
                              <button
                                type="button"
                                onClick={() => setInviteCode('A7K9P2')}
                                className="absolute right-2 top-2 text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                Demo Code
                              </button>
                            </div>

                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              Enter the secure invite code provided by the patient to connect to their CarePulse care information.
                            </p>

                            {isHowToGetCodeOpen && (
                              <div className="mt-2 p-3 bg-emerald-50/90 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 animate-fadeIn space-y-1">
                                <p className="font-bold flex items-center space-x-1">
                                  <Info className="w-3.5 h-3.5 text-emerald-700 inline mr-1" />
                                  <span>How do I get an invite code?</span>
                                </p>
                                <p className="text-emerald-800 leading-snug">
                                  Ask the patient to open <strong>Family → Invite Family Member</strong> in their CarePulse dashboard and share their invitation code.
                                </p>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Phone OTP */}
                      {authMode === 'OTP' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone Number</label>
                            <div className="relative">
                              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                              <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 (555) 987-6543"
                                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          {otpSent && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">6-Digit Verification Code</label>
                              <input
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="123456"
                                className="w-full px-3.5 py-2.5 text-center text-lg font-mono tracking-widest rounded-xl border border-emerald-400 bg-emerald-50/50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Remember Session */}
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rememberSession}
                            onChange={(e) => setRememberSession(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Remember session on this device</span>
                        </label>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-2 mt-2"
                      >
                        <Users className="w-4 h-4" />
                        <span>
                          {loading
                            ? 'Processing...'
                            : authMode === 'LOGIN'
                            ? 'Sign In as Family Member'
                            : authMode === 'REGISTER'
                            ? 'Continue to Connect Patient'
                            : otpSent
                            ? 'Verify Code & Sign In'
                            : 'Send SMS Code'}
                        </span>
                      </button>
                    </form>
                  </div>
                )}

                {/* ================= STEP 4: CONNECT TO A PATIENT (Invite Code) ================= */}
                {screenStep === 'CONNECT_PATIENT' && (
                  <div className="space-y-6">
                    <div className="text-center space-y-1">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center border border-blue-100 shadow-2xs">
                        <KeyRound className="w-6 h-6" />
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Connect to a Patient</h2>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Enter the unique 6-character patient invitation code to establish a authorized caregiver connection.
                      </p>
                    </div>

                    <form onSubmit={handleConnectPatientSubmit} className="space-y-5">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-800">
                            Patient Invite Code <span className="text-rose-500">*</span>
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
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                          placeholder="e.g. CP-7X92-KLM4 or A7K9P2"
                          className="w-full px-4 py-3.5 text-center text-xl sm:text-2xl font-mono font-black tracking-widest text-blue-900 bg-slate-50 uppercase rounded-2xl border-2 border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all"
                        />
                        <span className="text-[11px] text-slate-500 mt-1.5 block text-center">
                          Demo patient <strong className="text-slate-800">Sarah Johnson</strong> invitation code is <code className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">A7K9P2</code>
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">Your Relationship to Patient</label>
                        <select
                          value={relationship}
                          onChange={(e) => setRelationship(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                        >
                          <option value="Son / Caregiver">Son / Caregiver</option>
                          <option value="Daughter">Daughter</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Primary Caregiver">Primary Caregiver</option>
                          <option value="Legal Guardian">Legal Guardian</option>
                        </select>
                      </div>

                      {/* Action buttons */}
                      <div className="space-y-2.5 pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>{loading ? 'Verifying Code...' : 'Connect Patient'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsNoCodeInfoOpen(true)}
                          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-all flex items-center justify-center space-x-1.5"
                        >
                          <HelpCircle className="w-4 h-4 text-slate-400" />
                          <span>I Don't Have an Invite Code</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* ================= STEP 5: CONNECTED SUCCESS ================= */}
                {screenStep === 'CONNECTED_SUCCESS' && connectedSuccessData && (
                  <div className="space-y-6 text-center animate-fadeIn py-2">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center border-2 border-emerald-200 shadow-xs">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>

                    <div className="space-y-1.5">
                      <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">
                        Connection Verified
                      </span>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        Patient Connected Successfully
                      </h2>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                        Your family account is now connected to the patient's CarePulse account.
                      </p>
                    </div>

                    {/* Connected Patient Summary Card */}
                    <div className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200/90 text-left space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center space-x-3">
                          <img
                            src={connectedSuccessData.patient.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80'}
                            alt={connectedSuccessData.patient.name}
                            className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 shadow-2xs"
                          />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{connectedSuccessData.patient.name}</h4>
                            <p className="text-[11px] text-slate-500">{connectedSuccessData.patient.email}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active Patient
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Relationship</span>
                          <span className="font-bold text-slate-800">{relationship || 'Caregiver'}</span>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Permissions</span>
                          <span className="font-bold text-emerald-700 flex items-center space-x-1">
                            <ShieldCheck className="w-3.5 h-3.5 inline mr-0.5 text-emerald-600" />
                            <span>Care View</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-normal">
                      Future logins will automatically connect to this patient without re-entering the invite code.
                    </p>

                    <button
                      type="button"
                      onClick={() => onAuthenticated(connectedSuccessData)}
                      className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2"
                    >
                      <span>Continue to Family Dashboard</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 CarePulse Inc. All rights reserved. Patient-centered healthcare privacy platform.</p>
          <div className="flex items-center space-x-4 text-[11px] font-semibold text-slate-500">
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">HIPAA Notice</span>
          </div>
        </div>
      </footer>

      {/* Modal 1: Forgot Password */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => {
                setIsForgotPasswordOpen(false);
                setForgotSubmitted(false);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {!forgotSubmitted ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Reset Your Password</h3>
                  <p className="text-xs text-slate-500">
                    Enter your registered email address and we'll send a password recovery link.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  {loading ? 'Sending...' : 'Send Password Reset Link'}
                </button>
              </form>
            ) : (
              <div className="text-center space-y-3 py-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Reset Link Dispatched</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We have sent a password reset link to <strong className="text-slate-800">{forgotEmail}</strong>. Please check your inbox and follow the instructions.
                </p>
                <button
                  onClick={() => {
                    setIsForgotPasswordOpen(false);
                    setForgotSubmitted(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: "I Don't Have an Invite Code" Explanation */}
      {isNoCodeInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 space-y-4">
            <button
              onClick={() => setIsNoCodeInfoOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center border border-blue-100">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">How Patient Invite Codes Work</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <p>
                <strong className="text-slate-800">1. Ask the Patient:</strong> Request the authorized patient to generate and share their CarePulse Family Invitation Code with you.
              </p>
              <p>
                <strong className="text-slate-800">2. Patient Generation:</strong> The patient generates their code from their CarePulse Patient Dashboard under <em>"Family Connections"</em> or their Account Profile.
              </p>
              <p>
                <strong className="text-slate-800">3. Granular Control:</strong> The invitation code is unique and secure. The patient can revoke or change permissions at any time.
              </p>
              <div className="p-2.5 rounded-xl bg-blue-100/60 text-blue-900 font-bold text-[11px] text-center">
                Testing Demo Code: <code className="bg-white px-2 py-0.5 rounded text-blue-700 font-mono">A7K9P2</code>
              </div>
            </div>

            <button
              onClick={() => setIsNoCodeInfoOpen(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
            >
              Got It, Enter Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
