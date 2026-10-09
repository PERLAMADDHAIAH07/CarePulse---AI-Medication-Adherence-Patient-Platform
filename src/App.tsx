import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { RightSidebar } from './components/RightSidebar';
import { RoleSelectionModal } from './components/RoleSelectionModal';
import { AuthLanding } from './components/AuthLanding';
import { PatientDashboard } from './components/PatientDashboard';
import { MedicationList } from './components/MedicationList';
import { AdherenceAnalytics } from './components/AdherenceAnalytics';
import { SymptomTracker } from './components/SymptomTracker';
import { FamilyConnections } from './components/FamilyConnections';
import { FamilyDashboard } from './components/FamilyDashboard';
import { AIAssistantChat } from './components/AIAssistantChat';
import { PatientHistoryTimeline } from './components/PatientHistoryTimeline';
import { SettingsProfile } from './components/SettingsProfile';
import { PatientProfile } from './components/PatientProfile';
import { PatientControlRoom } from './components/PatientControlRoom';
import { FamilyProfile } from './components/FamilyProfile';
import { OCRMedicineScanner } from './components/OCRMedicineScanner';
import { MedicalDocuments } from './components/MedicalDocuments';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { api } from './services/api';
import { auth, fbSignOut } from './services/firebase';
import {
  User,
  Medication,
  AdherenceLog,
  AdherenceSummary,
  RiskAssessment,
  Symptom,
  FamilyConnection,
  AlertNotification,
  FamilyPermissions,
} from './types';

export default function App() {
  const todayStr = new Date().toISOString().split('T')[0];

  // Auth & Session State (First screen MUST always be Authentication Landing Screen unless logged in)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('carepulse_auth');
    return !!saved;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('carepulse_auth');
    if (saved) {
      try {
        return JSON.parse(saved).user;
      } catch (e) {}
    }
    return {
      id: 'p-101',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      phone: '+1 (555) 234-5678',
      role: 'PATIENT',
      familyInviteCode: 'A7K9P2',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
      createdAt: '2026-01-15T10:00:00Z',
    };
  });

  const [linkedPatient, setLinkedPatient] = useState<User | null>(() => {
    const saved = localStorage.getItem('carepulse_auth');
    if (saved) {
      try {
        return JSON.parse(saved).patient || null;
      } catch (e) {}
    }
    return {
      id: 'p-101',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      phone: '+1 (555) 234-5678',
      role: 'PATIENT',
      familyInviteCode: 'A7K9P2',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
      createdAt: '2026-01-15T10:00:00Z',
    };
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<'FAMILY_LOGIN' | 'SELECT' | 'REGISTER_PATIENT' | 'REGISTER_FAMILY'>('FAMILY_LOGIN');
  const [isAddMedModalOpen, setIsAddMedModalOpen] = useState(false);
  const [isAddSymptomModalOpen, setIsAddSymptomModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Authentication Handlers
  const handleAuthSuccess = (data: { user: User; patient?: User }) => {
    setCurrentUser(data.user);
    if (data.patient) setLinkedPatient(data.patient);
    setIsAuthenticated(true);
    setActiveTab(data.user.role === 'PATIENT' ? 'dashboard' : 'family-dashboard');
    localStorage.setItem('carepulse_auth', JSON.stringify({ user: data.user, patient: data.patient || data.user }));
  };

  const handleUpdateUser = (updated: User) => {
    setCurrentUser(updated);
    if (currentUser.role === 'PATIENT') {
      setLinkedPatient(updated);
    }
    localStorage.setItem(
      'carepulse_auth',
      JSON.stringify({ user: updated, patient: currentUser.role === 'PATIENT' ? updated : linkedPatient })
    );
  };

  const handleLogout = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      // Continue cleanup
    }
    localStorage.removeItem('carepulse_auth');
    setIsAuthenticated(false);
    setIsRoleModalOpen(false);
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // App Data State
  const [medications, setMedications] = useState<Medication[]>([
    {
      id: 'med-1',
      patientId: 'p-101',
      medicineName: 'Metformin',
      dosage: '500 mg',
      scheduleTimes: ['08:00 AM', '08:00 PM'],
      startDate: '2026-01-01',
      isActive: true,
      instructions: 'Take twice daily with meal to prevent upset stomach.',
      pillColor: 'bg-emerald-500',
      category: 'Diabetes Care',
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 'med-2',
      patientId: 'p-101',
      medicineName: 'Lisinopril',
      dosage: '10 mg',
      scheduleTimes: ['09:00 AM'],
      startDate: '2026-01-01',
      isActive: true,
      instructions: 'Take once daily in morning for blood pressure control.',
      pillColor: 'bg-blue-500',
      category: 'Cardiovascular',
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 'med-3',
      patientId: 'p-101',
      medicineName: 'Atorvastatin',
      dosage: '20 mg',
      scheduleTimes: ['09:00 PM'],
      startDate: '2026-01-01',
      isActive: true,
      instructions: 'Take once daily in evening before sleep.',
      pillColor: 'bg-purple-500',
      category: 'Cholesterol Management',
      createdAt: '2026-01-01T08:00:00Z',
    },
  ]);

  const [adherenceLogs, setAdherenceLogs] = useState<AdherenceLog[]>([
    {
      id: 'log-1',
      patientId: 'p-101',
      medicationId: 'med-1',
      medicineName: 'Metformin',
      dosage: '500 mg',
      scheduledTime: '08:00 AM',
      scheduledDate: todayStr,
      status: 'TAKEN',
      takenAt: `${todayStr}T08:12:00Z`,
      createdAt: `${todayStr}T08:12:00Z`,
    },
    {
      id: 'log-2',
      patientId: 'p-101',
      medicationId: 'med-2',
      medicineName: 'Lisinopril',
      dosage: '10 mg',
      scheduledTime: '09:00 AM',
      scheduledDate: todayStr,
      status: 'MISSED',
      createdAt: `${todayStr}T09:30:00Z`,
    },
    {
      id: 'log-3',
      patientId: 'p-101',
      medicationId: 'med-1',
      medicineName: 'Metformin',
      dosage: '500 mg',
      scheduledTime: '08:00 PM',
      scheduledDate: todayStr,
      status: 'PENDING',
      createdAt: `${todayStr}T00:00:00Z`,
    },
    {
      id: 'log-4',
      patientId: 'p-101',
      medicationId: 'med-3',
      medicineName: 'Atorvastatin',
      dosage: '20 mg',
      scheduledTime: '09:00 PM',
      scheduledDate: todayStr,
      status: 'UPCOMING',
      createdAt: `${todayStr}T00:00:00Z`,
    },
  ]);

  const [summary, setSummary] = useState<AdherenceSummary>({
    todayPercentage: 50,
    weeklyPercentage: 88,
    monthlyPercentage: 88,
    totalScheduledToday: 4,
    takenToday: 1,
    missedToday: 1,
    pendingToday: 2,
    trend: 'improving',
  });

  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment>({
    patientId: 'p-101',
    riskLevel: 'MEDIUM RISK',
    score: 35,
    reasons: [
      'Recent missed dose detected (Lisinopril 10 mg at 09:00 AM).',
      'Weekly adherence rate is currently 88%.',
    ],
    recommendations: [
      'Pair morning medication intake with a daily habit like morning breakfast.',
      'Set an smartphone alarm or enable family notification alerts for missed doses.',
    ],
    calculatedAt: new Date().toISOString(),
  });

  const [symptoms, setSymptoms] = useState<Symptom[]>([
    {
      id: 'sym-1',
      patientId: 'p-101',
      symptomText: 'Slight dizziness after morning walk',
      severity: 'mild',
      notes: 'Occurred around 10:30 AM. Rested for 15 minutes and felt better.',
      date: todayStr,
      createdAt: `${todayStr}T11:00:00Z`,
    },
  ]);

  const [familyMembers, setFamilyMembers] = useState<FamilyConnection[]>([
    {
      id: 'fc-1',
      patientId: 'p-101',
      patientName: 'Sarah Johnson',
      familyMemberId: 'f-201',
      familyMemberName: 'Marcus Johnson',
      familyMemberEmail: 'marcus.j@example.com',
      relationship: 'Son / Caregiver',
      permissions: {
        medicationStatus: true,
        adherencePercentage: true,
        missedDoseAlerts: true,
        riskLevel: true,
        symptoms: true,
        healthUpdates: true,
        privateNotes: false,
        aiConversations: false,
      },
      status: 'ACTIVE',
      createdAt: '2026-02-01T14:35:00Z',
    },
  ]);

  const [notifications, setNotifications] = useState<AlertNotification[]>([
    {
      id: 'notif-1',
      patientId: 'p-101',
      targetUserId: 'f-201',
      type: 'MISSED_DOSE',
      title: 'Missed Dose Alert',
      message: 'Sarah Johnson missed morning Lisinopril 10 mg scheduled at 09:00 AM.',
      isRead: false,
      createdAt: `${todayStr}T09:30:00Z`,
    },
    {
      id: 'notif-2',
      patientId: 'p-101',
      targetUserId: 'p-101',
      type: 'MEDICATION_REMINDER',
      title: 'Medication Reminder',
      message: 'Time for evening Metformin 500 mg at 08:00 PM.',
      isRead: true,
      createdAt: `${todayStr}T08:00:00Z`,
    },
  ]);

  // Sync data with backend API when patient changes
  const targetPatientId = currentUser.role === 'PATIENT' ? currentUser.id : linkedPatient?.id || 'p-101';

  const loadData = async () => {
    try {
      const [medsData, logsData, summaryData, riskData, symptomsData, familyData, notifsData] =
        await Promise.all([
          api.getMedications(targetPatientId).catch(() => medications),
          api.getAdherenceHistory(targetPatientId).catch(() => adherenceLogs),
          api.getAdherenceSummary(targetPatientId).catch(() => summary),
          api.getAIRiskLevel(targetPatientId).catch(() => riskAssessment),
          api.getSymptoms(targetPatientId).catch(() => symptoms),
          api.getFamilyMembers(targetPatientId).catch(() => familyMembers),
          api.getNotifications(currentUser.id).catch(() => notifications),
        ]);

      if (medsData) setMedications(medsData);
      if (logsData) setAdherenceLogs(logsData);
      if (summaryData) setSummary(summaryData);
      if (riskData) setRiskAssessment(riskData);
      if (symptomsData) setSymptoms(symptomsData);
      if (familyData) setFamilyMembers(familyData);
      if (notifsData) setNotifications(notifsData);
    } catch (e) {
      console.warn('Using local client state');
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id, targetPatientId]);

  // Handlers
  const handleUpdateDoseStatus = async (logId: string, status: 'TAKEN' | 'MISSED') => {
    try {
      const res = await api.updateAdherenceStatus({
        logId,
        status,
        patientId: targetPatientId,
      });

      if (res.log) {
        setAdherenceLogs((prev) => prev.map((l) => (l.id === res.log.id ? res.log : l)));
      }
      if (res.summary) setSummary(res.summary);
      if (res.risk) setRiskAssessment(res.risk);

      // Reload notifications for live alerts
      const newNotifs = await api.getNotifications(currentUser.id).catch(() => notifications);
      setNotifications(newNotifs);
    } catch (err) {
      // Fallback local update
      setAdherenceLogs((prev) =>
        prev.map((l) => (l.id === logId ? { ...l, status, takenAt: status === 'TAKEN' ? new Date().toISOString() : undefined } : l))
      );
    }
  };

  const handleAddMedication = async (med: Partial<Medication>) => {
    const created = await api.addMedication({ ...med, patientId: targetPatientId });
    setMedications((prev) => [...prev, created]);
    await loadData();
  };

  const handleUpdateMedication = async (id: string, updates: Partial<Medication>) => {
    const updated = await api.updateMedication(id, updates);
    setMedications((prev) => prev.map((m) => (m.id === id ? updated : m)));
  };

  const handleDeleteMedication = async (id: string) => {
    await api.deleteMedication(id);
    setMedications((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddSymptom = async (data: any) => {
    const created = await api.addSymptom({ ...data, patientId: targetPatientId });
    setSymptoms((prev) => [created, ...prev]);
  };

  const handleDeleteSymptom = async (id: string) => {
    await api.deleteSymptom(id);
    setSymptoms((prev) => prev.filter((s) => s.id !== id));
  };

  const handleRegenerateInviteCode = async () => {
    const res = await api.regenerateFamilyInviteCode(currentUser.id);
    setCurrentUser((prev) => ({ ...prev, familyInviteCode: res.code }));
  };

  const handleUpdateFamilyPermissions = async (connectionId: string, perms: Partial<FamilyPermissions>) => {
    const updated = await api.updateFamilyPermissions(connectionId, perms);
    setFamilyMembers((prev) => prev.map((f) => (f.id === connectionId ? updated : f)));
  };

  const handleRemoveFamilyMember = async (connectionId: string) => {
    await api.removeFamilyMember(connectionId);
    setFamilyMembers((prev) => prev.filter((f) => f.id !== connectionId));
  };

  const handleSendAIChatMessage = async (msg: string) => {
    return api.sendAIChatMessage(targetPatientId, msg);
  };

  const handleMarkNotifRead = async (id: string) => {
    await api.markNotificationRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'PATIENT') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('family-dashboard');
    }
  };

  const handleOpenRoleModal = (mode: 'FAMILY_LOGIN' | 'SELECT' | 'REGISTER_PATIENT' | 'REGISTER_FAMILY' = 'FAMILY_LOGIN') => {
    setRoleModalMode(mode);
    setIsRoleModalOpen(true);
  };

  const handleRegisterPatient = async (data: any) => {
    const res = await api.registerPatient(data);
    setCurrentUser(res.user);
    setActiveTab('dashboard');
  };

  const handleRegisterFamily = async (data: any) => {
    const res = await api.registerFamily(data);
    setCurrentUser(res.user);
    if (res.patient) setLinkedPatient(res.patient);
    setActiveTab('family-dashboard');
  };

  const handleFamilyLoginCode = async (patientCode: string, caregiverName?: string, caregiverEmail?: string) => {
    const res = await api.familyLoginWithCode(patientCode, caregiverName, caregiverEmail);
    setCurrentUser(res.user);
    if (res.patient) setLinkedPatient(res.patient);
    setActiveTab('family-dashboard');
  };

  if (!isAuthenticated) {
    return <AuthLanding onAuthenticated={handleAuthSuccess} />;
  }

  return (
    <NavigationProvider
      initialTab={currentUser.role === 'PATIENT' ? 'dashboard' : 'family-dashboard'}
      userRole={currentUser.role}
    >
      <MainAppLayout
        currentUser={currentUser}
        linkedPatient={linkedPatient}
        notifications={notifications}
        medications={medications}
        adherenceLogs={adherenceLogs}
        summary={summary}
        riskAssessment={riskAssessment}
        symptoms={symptoms}
        familyMembers={familyMembers}
        isAddMedModalOpen={isAddMedModalOpen}
        setIsAddMedModalOpen={setIsAddMedModalOpen}
        isAddSymptomModalOpen={isAddSymptomModalOpen}
        setIsAddSymptomModalOpen={setIsAddSymptomModalOpen}
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        isRoleModalOpen={isRoleModalOpen}
        setIsRoleModalOpen={setIsRoleModalOpen}
        roleModalMode={roleModalMode}
        targetPatientId={targetPatientId}
        setCurrentUser={setCurrentUser}
        setLinkedPatient={setLinkedPatient}
        handleUpdateDoseStatus={handleUpdateDoseStatus}
        handleAddMedication={handleAddMedication}
        handleUpdateMedication={handleUpdateMedication}
        handleDeleteMedication={handleDeleteMedication}
        handleAddSymptom={handleAddSymptom}
        handleDeleteSymptom={handleDeleteSymptom}
        handleRegenerateInviteCode={handleRegenerateInviteCode}
        handleUpdateFamilyPermissions={handleUpdateFamilyPermissions}
        handleRemoveFamilyMember={handleRemoveFamilyMember}
        handleSendAIChatMessage={handleSendAIChatMessage}
        handleMarkNotifRead={handleMarkNotifRead}
        handleMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        handleLogout={handleLogout}
        handleUpdateUser={handleUpdateUser}
        handleOpenRoleModal={handleOpenRoleModal}
        handleSelectUser={handleSelectUser}
        handleRegisterPatient={handleRegisterPatient}
        handleRegisterFamily={handleRegisterFamily}
        handleFamilyLoginCode={handleFamilyLoginCode}
        loadData={loadData}
      />
    </NavigationProvider>
  );
}

interface MainAppLayoutProps {
  currentUser: User;
  linkedPatient: User | null;
  notifications: AlertNotification[];
  medications: Medication[];
  adherenceLogs: AdherenceLog[];
  summary: AdherenceSummary;
  riskAssessment: RiskAssessment;
  symptoms: Symptom[];
  familyMembers: FamilyConnection[];
  isAddMedModalOpen: boolean;
  setIsAddMedModalOpen: (val: boolean) => void;
  isAddSymptomModalOpen: boolean;
  setIsAddSymptomModalOpen: (val: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (val: boolean) => void;
  isRoleModalOpen: boolean;
  setIsRoleModalOpen: (val: boolean) => void;
  roleModalMode: 'FAMILY_LOGIN' | 'SELECT' | 'REGISTER_PATIENT' | 'REGISTER_FAMILY';
  targetPatientId: string;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  setLinkedPatient: React.Dispatch<React.SetStateAction<User | null>>;
  handleUpdateDoseStatus: (logId: string, status: 'TAKEN' | 'MISSED') => Promise<void>;
  handleAddMedication: (med: Partial<Medication>) => Promise<void>;
  handleUpdateMedication: (id: string, updates: Partial<Medication>) => Promise<void>;
  handleDeleteMedication: (id: string) => Promise<void>;
  handleAddSymptom: (data: any) => Promise<void>;
  handleDeleteSymptom: (id: string) => Promise<void>;
  handleRegenerateInviteCode: () => Promise<void>;
  handleUpdateFamilyPermissions: (connectionId: string, perms: Partial<FamilyPermissions>) => Promise<void>;
  handleRemoveFamilyMember: (connectionId: string) => Promise<void>;
  handleSendAIChatMessage: (msg: string) => Promise<any>;
  handleMarkNotifRead: (id: string) => Promise<void>;
  handleMarkAllNotificationsRead: () => void;
  handleLogout: () => Promise<void>;
  handleUpdateUser: (user: User) => void;
  handleOpenRoleModal: (mode?: 'FAMILY_LOGIN' | 'SELECT' | 'REGISTER_PATIENT' | 'REGISTER_FAMILY') => void;
  handleSelectUser: (user: User) => void;
  handleRegisterPatient: (data: any) => Promise<void>;
  handleRegisterFamily: (data: any) => Promise<void>;
  handleFamilyLoginCode: (patientCode: string, caregiverName?: string, caregiverEmail?: string) => Promise<void>;
  loadData: () => Promise<void>;
}

function MainAppLayout({
  currentUser,
  linkedPatient,
  notifications,
  medications,
  adherenceLogs,
  summary,
  riskAssessment,
  symptoms,
  familyMembers,
  isAddMedModalOpen,
  setIsAddMedModalOpen,
  isAddSymptomModalOpen,
  setIsAddSymptomModalOpen,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  isRoleModalOpen,
  setIsRoleModalOpen,
  roleModalMode,
  targetPatientId,
  setCurrentUser,
  setLinkedPatient,
  handleUpdateDoseStatus,
  handleAddMedication,
  handleUpdateMedication,
  handleDeleteMedication,
  handleAddSymptom,
  handleDeleteSymptom,
  handleRegenerateInviteCode,
  handleUpdateFamilyPermissions,
  handleRemoveFamilyMember,
  handleSendAIChatMessage,
  handleMarkNotifRead,
  handleMarkAllNotificationsRead,
  handleLogout,
  handleUpdateUser,
  handleOpenRoleModal,
  handleSelectUser,
  handleRegisterPatient,
  handleRegisterFamily,
  handleFamilyLoginCode,
  loadData,
}: MainAppLayoutProps) {
  const { activeTab, navigate } = useNavigation();

  const setActiveTab = (tab: string) => {
    navigate(tab);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col antialiased">
      {/* Clean Top Navigation Header */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={notifications.filter((n) => !n.isRead).length}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Main Container Layout: Primary Page + Persistent Right Sidebar */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          {/* Main Content View */}
          <main className="flex-1 min-w-0 w-full space-y-6">
            {currentUser.role === 'PATIENT' ? (
              <>
                {activeTab === 'dashboard' && (
                  <PatientDashboard
                    patient={currentUser}
                    medications={medications}
                    logs={adherenceLogs}
                    summary={summary}
                    riskLevel={riskAssessment}
                    symptoms={symptoms}
                    inviteCode={currentUser.familyInviteCode}
                    familyMembers={familyMembers}
                    onCodeChange={(newCode) => setCurrentUser((prev) => ({ ...prev, familyInviteCode: newCode }))}
                    onUpdateDoseStatus={handleUpdateDoseStatus}
                    onNavigate={setActiveTab}
                    onOpenAddMedication={() => setIsAddMedModalOpen(true)}
                    onOpenAddSymptom={() => setIsAddSymptomModalOpen(true)}
                    onOpenRoleModal={handleOpenRoleModal}
                  />
                )}

                {activeTab === 'medications' && (
                  <MedicationList
                    medications={medications}
                    patientId={currentUser.id}
                    onAddMedication={handleAddMedication}
                    onUpdateMedication={handleUpdateMedication}
                    onDeleteMedication={handleDeleteMedication}
                    isAddModalOpen={isAddMedModalOpen}
                    setIsAddModalOpen={setIsAddMedModalOpen}
                    onRefreshData={loadData}
                  />
                )}

                {activeTab === 'analytics' && (
                  <AdherenceAnalytics logs={adherenceLogs} summary={summary} />
                )}

                {activeTab === 'symptoms' && (
                  <SymptomTracker
                    symptoms={symptoms}
                    patientId={currentUser.id}
                    onAddSymptom={handleAddSymptom}
                    onDeleteSymptom={handleDeleteSymptom}
                    isAddModalOpen={isAddSymptomModalOpen}
                    setIsAddModalOpen={setIsAddSymptomModalOpen}
                  />
                )}

                {activeTab === 'history' && (
                  <PatientHistoryTimeline
                    patientId={currentUser.id}
                    medications={medications}
                  />
                )}

                {activeTab === 'ai-assistant' && (
                  <AIAssistantChat
                    patient={currentUser}
                    medications={medications}
                    summary={summary}
                    riskLevel={riskAssessment}
                    onSendMessage={handleSendAIChatMessage}
                  />
                )}

                {activeTab === 'family' && (
                  <FamilyConnections
                    inviteCode={currentUser.familyInviteCode}
                    onRegenerateCode={handleRegenerateInviteCode}
                    familyMembers={familyMembers}
                    onUpdatePermissions={handleUpdateFamilyPermissions}
                    onRemoveFamilyMember={handleRemoveFamilyMember}
                  />
                )}

                {activeTab === 'ocr-scanner' && (
                  <OCRMedicineScanner
                    currentUser={currentUser}
                    linkedPatient={linkedPatient}
                    medications={medications}
                    onAddMedication={handleAddMedication}
                    onNavigate={setActiveTab}
                    onRefreshData={loadData}
                  />
                )}

                {(activeTab === 'documents' || activeTab === 'medical-documents') && (
                  <MedicalDocuments
                    currentUser={currentUser}
                    linkedPatient={linkedPatient}
                    onNavigate={setActiveTab}
                  />
                )}

                {activeTab === 'profile' && (
                  <PatientProfile
                    currentUser={currentUser}
                    onLogout={handleLogout}
                    onNavigate={setActiveTab}
                  />
                )}

                {(activeTab === 'settings' || activeTab === 'control-room') && (
                  <PatientControlRoom
                    currentUser={currentUser}
                    inviteCode={currentUser.familyInviteCode}
                    onLogout={handleLogout}
                    onNavigate={setActiveTab}
                    onUpdateUser={handleUpdateUser}
                  />
                )}
              </>
            ) : (
              /* Family Member / Caregiver View */
              <>
                {(activeTab === 'family-dashboard' || activeTab === 'dashboard' || activeTab === 'patient-overview') && (
                  <FamilyDashboard
                    caregiver={currentUser}
                    linkedPatient={linkedPatient || currentUser}
                    connection={familyMembers[0]}
                    medications={medications}
                    logs={adherenceLogs}
                    summary={summary}
                    riskLevel={riskAssessment}
                    symptoms={symptoms}
                    notifications={notifications}
                  />
                )}

                {activeTab === 'history' && (
                  <PatientHistoryTimeline
                    logs={adherenceLogs}
                    symptoms={symptoms}
                    notifications={notifications}
                  />
                )}

                {activeTab === 'ocr-scanner' && (
                  <OCRMedicineScanner
                    currentUser={currentUser}
                    linkedPatient={linkedPatient}
                    medications={medications}
                    onAddMedication={handleAddMedication}
                    onNavigate={setActiveTab}
                    onRefreshData={loadData}
                  />
                )}

                {(activeTab === 'documents' || activeTab === 'medical-documents') && (
                  <MedicalDocuments
                    currentUser={currentUser}
                    linkedPatient={linkedPatient}
                    onNavigate={setActiveTab}
                  />
                )}

                {activeTab === 'profile' && (
                  <FamilyProfile
                    currentUser={currentUser}
                    onLogout={handleLogout}
                    onNavigate={setActiveTab}
                  />
                )}

                {activeTab === 'settings' && (
                  <SettingsProfile
                    currentUser={currentUser}
                    inviteCode=""
                    onLogout={handleLogout}
                    onNavigate={setActiveTab}
                  />
                )}
              </>
            )}
          </main>

          {/* Dedicated Fixed Right Sidebar (User Control Center) */}
          <RightSidebar
            currentUser={currentUser}
            linkedPatient={linkedPatient}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            notifications={notifications}
            onMarkNotificationRead={handleMarkNotifRead}
            onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
            onOpenRoleModal={handleOpenRoleModal}
            onLogout={handleLogout}
            inviteCode={currentUser.familyInviteCode}
            onRegenerateCode={handleRegenerateInviteCode}
            familyMembers={familyMembers}
            onOpenAddMedication={() => setIsAddMedModalOpen(true)}
            onOpenAddSymptom={() => setIsAddSymptomModalOpen(true)}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Role Selection & Auth Modal */}
      <RoleSelectionModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        onRegisterPatient={handleRegisterPatient}
        onRegisterFamily={handleRegisterFamily}
        onFamilyLoginCode={handleFamilyLoginCode}
        initialMode={roleModalMode}
      />
    </div>
  );
}
