import {
  User,
  Medication,
  AdherenceLog,
  AdherenceSummary,
  Symptom,
  FamilyConnection,
  FamilyPermissions,
  RiskAssessment,
  AlertNotification,
} from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errData.error || 'Network request failed');
  }

  return res.json();
}

export const api = {
  // Auth
  async firebaseAuthExchange(data: {
    idToken?: string;
    uid?: string;
    email?: string;
    password?: string;
    role?: 'PATIENT' | 'FAMILY_MEMBER' | 'CAREGIVER';
    name?: string;
    phone?: string;
    photoUrl?: string;
    familyInviteCode?: string;
    relationship?: string;
    loginMethod?: string;
  }) {
    return fetchJson<{
      user: User;
      patient?: User;
      connection?: FamilyConnection;
      token: string;
      fcmToken?: string;
      requiresConnection?: boolean;
    }>(`${API_BASE}/auth/firebase-exchange`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(email: string, passwordHash: string, role?: string) {
    return fetchJson<{ user: User; patient?: User; token: string }>(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password: passwordHash, role }),
    });
  },

  async googleAuth(data: { email: string; name?: string; role: 'PATIENT' | 'FAMILY_MEMBER'; photoUrl?: string }) {
    return fetchJson<{ user: User; patient?: User; token: string }>(`${API_BASE}/auth/google`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async verifyOtp(data: { phone: string; otp: string; role: 'PATIENT' | 'FAMILY_MEMBER'; name?: string }) {
    return fetchJson<{ user: User; patient?: User; token: string }>(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async forgotPassword(email: string) {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async connectPatient(data: { userId?: string; familyInviteCode: string; relationship?: string }) {
    return fetchJson<{ success: boolean; user: User; patient: User; connection: FamilyConnection }>(
      `${API_BASE}/auth/connect-patient`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async registerPatient(data: { name: string; email: string; phone?: string; password: string }) {
    return fetchJson<{ user: User; token: string }>(`${API_BASE}/auth/register/patient`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async registerFamily(data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    familyInviteCode: string;
    relationship?: string;
  }) {
    return fetchJson<{ user: User; patient: User; connection: FamilyConnection; token: string }>(
      `${API_BASE}/auth/register/family`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async familyLoginWithCode(familyInviteCode: string, caregiverName?: string, caregiverEmail?: string) {
    return fetchJson<{ user: User; patient: User; connection: FamilyConnection; token: string }>(
      `${API_BASE}/auth/family-login-code`,
      {
        method: 'POST',
        body: JSON.stringify({ familyInviteCode, caregiverName, caregiverEmail }),
      }
    );
  },

  // Patient
  async getPatientBaseUser(patientId: string) {
    return fetchJson<User>(`${API_BASE}/patients/me?patientId=${patientId}`);
  },

  async getPatientHistory(patientId: string) {
    return fetchJson<{
      adherenceLogs: AdherenceLog[];
      symptoms: Symptom[];
      notifications: AlertNotification[];
    }>(`${API_BASE}/patients/me/history?patientId=${patientId}`);
  },

  // Medications
  async getMedications(patientId: string) {
    return fetchJson<Medication[]>(`${API_BASE}/medications?patientId=${patientId}`);
  },

  async addMedication(med: Partial<Medication>) {
    return fetchJson<Medication>(`${API_BASE}/medications`, {
      method: 'POST',
      body: JSON.stringify(med),
    });
  },

  async updateMedication(id: string, updates: Partial<Medication>) {
    return fetchJson<Medication>(`${API_BASE}/medications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteMedication(id: string) {
    return fetchJson<{ success: boolean }>(`${API_BASE}/medications/${id}`, {
      method: 'DELETE',
    });
  },

  // Adherence
  async updateAdherenceStatus(data: {
    logId?: string;
    status: 'TAKEN' | 'MISSED' | 'PENDING';
    patientId: string;
    medicationId?: string;
    scheduledTime?: string;
    recordedAt?: string;
    idToken?: string;
  }) {
    return fetchJson<{
      log: AdherenceLog;
      summary: AdherenceSummary;
      risk: RiskAssessment;
    }>(`${API_BASE}/adherence/update`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAdherenceSummary(patientId: string) {
    return fetchJson<AdherenceSummary>(`${API_BASE}/adherence/summary?patientId=${patientId}`);
  },

  async getAdherenceHistory(patientId: string) {
    return fetchJson<AdherenceLog[]>(`${API_BASE}/adherence/history?patientId=${patientId}`);
  },

  // Symptoms
  async getSymptoms(patientId: string) {
    return fetchJson<Symptom[]>(`${API_BASE}/symptoms?patientId=${patientId}`);
  },

  async addSymptom(data: {
    patientId: string;
    symptomText: string;
    severity: 'mild' | 'moderate' | 'severe';
    notes?: string;
    date?: string;
  }) {
    return fetchJson<Symptom>(`${API_BASE}/symptoms`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteSymptom(id: string) {
    return fetchJson<{ success: boolean }>(`${API_BASE}/symptoms/${id}`, {
      method: 'DELETE',
    });
  },

  // Family
  async getFamilyInviteCode(patientId: string) {
    return fetchJson<{ code: string }>(`${API_BASE}/family/invite-code?patientId=${patientId}`);
  },

  async regenerateFamilyInviteCode(patientId: string) {
    return fetchJson<{ code: string }>(`${API_BASE}/family/regenerate-code`, {
      method: 'POST',
      body: JSON.stringify({ patientId }),
    });
  },

  async revokeFamilyInviteCode(patientId: string) {
    return fetchJson<{ success: boolean; code: string }>(`${API_BASE}/family/revoke-code`, {
      method: 'POST',
      body: JSON.stringify({ patientId }),
    });
  },

  async getFamilyMembers(patientId: string) {
    return fetchJson<FamilyConnection[]>(`${API_BASE}/family/members?patientId=${patientId}`);
  },

  async updateFamilyPermissions(connectionId: string, permissions: Partial<FamilyPermissions>) {
    return fetchJson<FamilyConnection>(`${API_BASE}/family/members/${connectionId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
  },

  async removeFamilyMember(connectionId: string) {
    return fetchJson<{ success: boolean }>(`${API_BASE}/family/members/${connectionId}`, {
      method: 'DELETE',
    });
  },

  // AI Assistant & Risk Level
  async getAIRiskLevel(patientId: string) {
    return fetchJson<RiskAssessment>(`${API_BASE}/ai/risk-level?patientId=${patientId}`);
  },

  async sendAIChatMessage(patientId: string, message: string) {
    return fetchJson<{
      reply: string;
      timestamp: string;
      patientContextUsed: any;
    }>(`${API_BASE}/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({ patientId, message }),
    });
  },

  // Notifications
  async getNotifications(userId: string) {
    return fetchJson<AlertNotification[]>(`${API_BASE}/notifications?userId=${userId}`);
  },

  async markNotificationRead(id: string) {
    return fetchJson<{ success: boolean }>(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  // Enterprise Account & Security Center APIs
  async getAccountProfile(userId: string) {
    return fetchJson<any>(`${API_BASE}/account/profile?userId=${userId}`);
  },

  async updateAccountProfile(data: { userId: string; name?: string; email?: string; phone?: string; avatarUrl?: string }) {
    return fetchJson<{ success: boolean; message: string; user: any }>(`${API_BASE}/account/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getAccountSecurity(userId: string) {
    return fetchJson<any>(`${API_BASE}/account/security?userId=${userId}`);
  },

  async getLoginHistory(userId: string) {
    return fetchJson<any[]>(`${API_BASE}/account/login-history?userId=${userId}`);
  },

  async getAccountSessions(userId: string) {
    return fetchJson<{ currentSessionId: string; sessions: any[] }>(`${API_BASE}/account/sessions?userId=${userId}`);
  },

  async terminateSession(sessionId: string, userId: string) {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/account/session/${sessionId}?userId=${userId}`, {
      method: 'DELETE',
    });
  },

  async logoutAllDevices(userId: string) {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/account/logout-all`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
  },

  async getAccountDevices(userId: string) {
    return fetchJson<any[]>(`${API_BASE}/account/devices?userId=${userId}`);
  },

  async removeDevice(deviceId: string, userId: string) {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/account/device/${deviceId}?userId=${userId}`, {
      method: 'DELETE',
    });
  },

  async getAccountStatistics(userId: string) {
    return fetchJson<any>(`${API_BASE}/account/statistics?userId=${userId}`);
  },

  async getAppInfo() {
    return fetchJson<any>(`${API_BASE}/account/app-info`);
  },

  async getDeveloperDiagnostics(userId: string) {
    return fetchJson<any>(`${API_BASE}/account/developer?userId=${userId}`);
  },

  async sendTestNotification(userId: string, title?: string, message?: string) {
    return fetchJson<{ success: boolean; message: string; notification: any }>(`${API_BASE}/account/test-notification`, {
      method: 'POST',
      body: JSON.stringify({ userId, title, message }),
    });
  },

  async exportAccountData(userId: string, format: string = 'json') {
    return fetchJson<{ success: boolean; downloadUrl: string; filename: string }>(`${API_BASE}/account/export`, {
      method: 'POST',
      body: JSON.stringify({ userId, format }),
    });
  },

  async deleteAccount(userId: string) {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/account/delete-account`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async changePassword(userId: string, currentPassword?: string, newPassword?: string) {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE}/account/change-password`, {
      method: 'POST',
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    });
  },

  async toggle2FA(userId: string, enabled: boolean) {
    return fetchJson<{ success: boolean; twoFactorEnabled: boolean; securityScore: number; message: string }>(`${API_BASE}/account/enable-2fa`, {
      method: 'POST',
      body: JSON.stringify({ userId, enabled }),
    });
  },

  async refreshToken(userId: string) {
    return fetchJson<{ success: boolean; token: string; refreshedAt: string; message: string }>(`${API_BASE}/account/refresh-token`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  // Dedicated Patient Profile APIs
  async getPatientProfile(userId: string) {
    return fetchJson<any>(`${API_BASE}/patient/profile?userId=${userId}`);
  },

  async updatePatientProfile(data: { userId: string; [key: string]: any }) {
    return fetchJson<{ success: boolean; message: string; profile: any }>(`${API_BASE}/patient/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getPatientProfileStatistics(userId: string) {
    return fetchJson<any>(`${API_BASE}/patient/profile/statistics?userId=${userId}`);
  },

  async getPatientHealthSummary(userId: string) {
    return fetchJson<any>(`${API_BASE}/patient/profile/health-summary?userId=${userId}`);
  },

  // Dedicated Family Member Profile APIs
  async getFamilyProfile(userId: string) {
    return fetchJson<any>(`${API_BASE}/family/profile?userId=${userId}`);
  },

  async updateFamilyProfile(data: { userId: string; [key: string]: any }) {
    return fetchJson<{ success: boolean; message: string; profile: any }>(`${API_BASE}/family/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getFamilyProfilePermissions(userId: string) {
    return fetchJson<any>(`${API_BASE}/family/profile/permissions?userId=${userId}`);
  },

  async getFamilyPatientSummary(userId: string) {
    return fetchJson<any>(`${API_BASE}/family/profile/patient-summary?userId=${userId}`);
  },

  // Synchronized Medication History & Audit Trail APIs
  async getHistoryEvents(
    patientId: string,
    params?: { medicationId?: string; eventType?: string; status?: string; search?: string }
  ) {
    const qp = new URLSearchParams();
    qp.append('patientId', patientId);
    if (params?.medicationId) qp.append('medicationId', params.medicationId);
    if (params?.eventType) qp.append('eventType', params.eventType);
    if (params?.status) qp.append('status', params.status);
    if (params?.search) qp.append('search', params.search);

    return fetchJson<import('../types').HistoryEvent[]>(`${API_BASE}/history?${qp.toString()}`);
  },

  async getMedicationHistory(medicationId: string) {
    return fetchJson<import('../types').HistoryEvent[]>(`${API_BASE}/medications/${medicationId}/history`);
  },

  async completeMedication(medicationId: string) {
    return fetchJson<{ success: boolean; medication: Medication; historyEvent: import('../types').HistoryEvent }>(
      `${API_BASE}/medications/${medicationId}/complete`,
      { method: 'POST' }
    );
  },

  // Dynamic Patient Medication Adherence Overview & Chart APIs
  async getAdherenceOverview(patientId: string = 'p-101') {
    return fetchJson<{
      patientId: string;
      takenCount: number;
      skippedCount: number;
      notTakenCount: number;
      totalDoses: number;
      takenPercentage: number;
      skippedPercentage: number;
      notTakenPercentage: number;
      overallAdherence: number;
      lastUpdated: string;
    }>(`${API_BASE}/patient/adherence-overview?patientId=${patientId}`);
  },

  async getAdherenceChart(patientId: string = 'p-101') {
    return fetchJson<{
      slices: { status: string; count: number; percentage: number; color: string }[];
      totalDoses: number;
      overallAdherence: number;
      lastUpdated: string;
    }>(`${API_BASE}/patient/adherence-chart?patientId=${patientId}`);
  },

  async getPatientMedicationHistory(patientId: string = 'p-101') {
    return fetchJson<import('../types').HistoryEvent[]>(`${API_BASE}/patient/medication-history?patientId=${patientId}`);
  },

  async getAdherenceStatistics(patientId: string = 'p-101') {
    return fetchJson<{
      totalMedicines: number;
      todayMedicines: number;
      activeMedicines: number;
      completedDoses: number;
      skippedDoses: number;
      missedDoses: number;
      upcomingMedicines: number;
      adherencePercentage: number;
      currentAIRisk: string;
      daysActive: number;
      symptomsLogged: number;
    }>(`${API_BASE}/patient/adherence-statistics?patientId=${patientId}`);
  },

  async postAdherenceUpdate(data: {
    patientId: string;
    medicationId: string;
    status: 'TAKEN' | 'SKIPPED' | 'MISSED' | 'DELAYED';
    scheduledTime?: string;
    notes?: string;
  }) {
    return fetchJson<any>(`${API_BASE}/adherence/update`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async postMedicationHistory(data: any) {
    return fetchJson<any>(`${API_BASE}/medication/history`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Patient Control Room Overview API
  async getControlRoomOverview(patientId: string = 'p-101') {
    return fetchJson<any>(`${API_BASE}/patient/control-room/overview?patientId=${patientId}`);
  },

  // Patient Control Room Authentication & Session APIs
  async getPatientAuthentication(patientId: string = 'p-101') {
    return fetchJson<any>(`${API_BASE}/patient/control-room/authentication?patientId=${patientId}`);
  },

  // Patient Control Room Login History APIs
  async getControlRoomLoginHistory(params?: {
    patientId?: string;
    status?: string;
    search?: string;
  }) {
    const pId = params?.patientId || 'p-101';
    const status = params?.status ? `&status=${encodeURIComponent(params.status)}` : '';
    const search = params?.search ? `&search=${encodeURIComponent(params.search)}` : '';
    return fetchJson<any>(`${API_BASE}/patient/control-room/login-history?patientId=${pId}${status}${search}`);
  },

  // Patient Control Room Active Devices APIs
  async getControlRoomActiveDevices(patientId: string = 'p-101') {
    return fetchJson<any>(`${API_BASE}/patient/control-room/active-devices?patientId=${patientId}`);
  },

  async signOutActiveDevice(deviceId: string, patientId: string = 'p-101') {
    return fetchJson<any>(`${API_BASE}/patient/control-room/active-devices/${deviceId}/signout`, {
      method: 'POST',
      body: JSON.stringify({ patientId }),
    });
  },

  // Patient Control Room Security Center APIs
  async getControlRoomSecurity(patientId: string = 'p-101') {
    return fetchJson<any>(`${API_BASE}/patient/control-room/security?patientId=${patientId}`);
  },

  // Patient Control Room Notifications APIs
  async getControlRoomNotifications(params?: {
    patientId?: string;
    type?: string;
    status?: string;
    search?: string;
  }) {
    const pId = params?.patientId || 'p-101';
    const type = params?.type ? `&type=${encodeURIComponent(params.type)}` : '';
    const status = params?.status ? `&status=${encodeURIComponent(params.status)}` : '';
    const search = params?.search ? `&search=${encodeURIComponent(params.search)}` : '';
    return fetchJson<{
      success: boolean;
      patientId: string;
      unreadCount: number;
      totalCount: number;
      filteredCount: number;
      notifications: AlertNotification[];
      preferences: import('../types').NotificationPreference;
      registeredDevices: any[];
      lastSyncTime: string;
    }>(`${API_BASE}/patient/control-room/notifications?patientId=${pId}${type}${status}${search}`);
  },

  async getControlRoomNotificationById(notificationId: string) {
    return fetchJson<{ success: boolean; notification: AlertNotification }>(
      `${API_BASE}/patient/control-room/notifications/${notificationId}`
    );
  },

  async markNotificationAsRead(notificationId: string) {
    return fetchJson<{ success: boolean; notification: AlertNotification }>(
      `${API_BASE}/patient/control-room/notifications/${notificationId}/read`,
      { method: 'PATCH' }
    );
  },

  async markNotificationAsUnread(notificationId: string) {
    return fetchJson<{ success: boolean; notification: AlertNotification }>(
      `${API_BASE}/patient/control-room/notifications/${notificationId}/unread`,
      { method: 'PATCH' }
    );
  },

  async markAllNotificationsAsRead(patientId: string = 'p-101') {
    return fetchJson<{ success: boolean; updatedCount: number; message: string }>(
      `${API_BASE}/patient/control-room/notifications/read-all`,
      {
        method: 'PATCH',
        body: JSON.stringify({ patientId }),
      }
    );
  },

  async deleteControlRoomNotification(notificationId: string) {
    return fetchJson<{ success: boolean; message: string }>(
      `${API_BASE}/patient/control-room/notifications/${notificationId}`,
      { method: 'DELETE' }
    );
  },

  async getControlRoomNotificationPreferences(patientId: string = 'p-101') {
    return fetchJson<{
      success: boolean;
      patientId: string;
      preferences: import('../types').NotificationPreference;
    }>(`${API_BASE}/patient/control-room/notification-preferences?patientId=${patientId}`);
  },

  async updateControlRoomNotificationPreferences(
    patientId: string = 'p-101',
    preferences: Partial<import('../types').NotificationPreference>
  ) {
    return fetchJson<{
      success: boolean;
      patientId: string;
      preferences: import('../types').NotificationPreference;
      message: string;
    }>(`${API_BASE}/patient/control-room/notification-preferences`, {
      method: 'PATCH',
      body: JSON.stringify({ patientId, preferences }),
    });
  },

  async getMedicationSchedulerStatus(patientId: string = 'p-101') {
    return fetchJson<{
      success: boolean;
      patientId: string;
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
      schedulerIntervalSeconds: number;
    }>(`${API_BASE}/patient/control-room/medication-scheduler-status?patientId=${patientId}`);
  },

  async triggerRealtimeNotificationEvent(params: {
    patientId?: string;
    eventType: 'MEDICATION_REMINDER' | 'MISSED_DOSE' | 'FAMILY_ALERT' | 'SECURITY_ALERT';
    medicationId?: string;
    customDetails?: any;
  }) {
    return fetchJson<{
      success: boolean;
      message: string;
      notification: AlertNotification;
      caregiverNotification?: AlertNotification;
      deliveryStatus: string;
      channel: string;
      fcmMessageId: string;
      error?: string;
    }>(`${API_BASE}/patient/control-room/notifications/trigger-event`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async registerFCMDeviceToken(data: {
    userId: string;
    token: string;
    platform?: string;
    deviceName?: string;
  }) {
    return fetchJson<{ success: boolean; registeredCount: number }>(
      `${API_BASE}/notifications/device-token`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  // Internal Slack Operational Alert APIs
  async getInternalSlackAlerts() {
    return fetchJson<{
      success: boolean;
      channel: string;
      totalAlerts: number;
      alerts: import('../types').SlackAlertRecord[];
    }>(`${API_BASE}/internal/slack-alerts`);
  },

  async triggerInternalSlackAlert(data: {
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    service: string;
    referenceId?: string;
    message: string;
    action?: string;
  }) {
    return fetchJson<{
      success: boolean;
      message: string;
      alert: import('../types').SlackAlertRecord;
    }>(`${API_BASE}/internal/slack-alerts/trigger`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Patient Control Room Family Connection APIs
  async getControlRoomFamily(patientId: string = 'p-101') {
    return fetchJson<any>(`${API_BASE}/patient/control-room/family?patientId=${patientId}`);
  },

  async inviteFamilyMember(patientId: string, name: string, emailOrPhone: string, relationship: string, permissions?: any) {
    return fetchJson<any>(`${API_BASE}/patient/control-room/family/invite`, {
      method: 'POST',
      body: JSON.stringify({ patientId, name, emailOrPhone, relationship, permissions }),
    });
  },

  async updateControlRoomFamilyPermissions(connectionId: string, permissions: any, patientId: string = 'p-101') {
    return fetchJson<any>(`${API_BASE}/patient/control-room/family/${connectionId}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ patientId, permissions }),
    });
  },

  async removeFamilyConnection(connectionId: string, patientId: string = 'p-101') {
    return fetchJson<any>(`${API_BASE}/patient/control-room/family/${connectionId}`, {
      method: 'DELETE',
      body: JSON.stringify({ patientId }),
    });
  },

  async logoutSession(userId: string = 'p-101', sessionId?: string) {
    return fetchJson<any>(`${API_BASE}/auth/session/logout`, {
      method: 'POST',
      body: JSON.stringify({ userId, sessionId }),
    });
  },

  async logoutAllOtherSessions(userId: string = 'p-101') {
    return fetchJson<any>(`${API_BASE}/auth/session/logout-all`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async revokeSession(userId: string = 'p-101', sessionId: string) {
    return fetchJson<any>(`${API_BASE}/auth/session/revoke-session`, {
      method: 'POST',
      body: JSON.stringify({ userId, sessionId }),
    });
  },

  // Account Lifecycle & Data Control APIs
  async archiveCareJourney(patientId: string = 'p-101', reason?: string) {
    return fetchJson<any>(`${API_BASE}/patient/care-journey/archive`, {
      method: 'POST',
      body: JSON.stringify({ patientId, reason }),
    });
  },

  async resumeCareJourney(patientId: string = 'p-101') {
    return fetchJson<any>(`${API_BASE}/patient/care-journey/resume`, {
      method: 'POST',
      body: JSON.stringify({ patientId }),
    });
  },

  async deactivateAccount(patientId: string = 'p-101', reason?: string) {
    return fetchJson<any>(`${API_BASE}/patient/account/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ patientId, reason }),
    });
  },

  async deleteAccountAndData(patientId: string = 'p-101', confirmationText: string, reason?: string) {
    return fetchJson<any>(`${API_BASE}/patient/account/delete`, {
      method: 'POST',
      body: JSON.stringify({ patientId, confirmationText, reason }),
    });
  },

  // ==================== MEDICAL DOCUMENTS APIS ====================
  async getMedicalDocuments(params?: { patientId?: string; category?: string; search?: string; requesterId?: string }) {
    const pId = params?.patientId || 'p-101';
    const cat = params?.category && params.category !== 'All' ? `&category=${encodeURIComponent(params.category)}` : '';
    const search = params?.search ? `&search=${encodeURIComponent(params.search)}` : '';
    const reqId = params?.requesterId ? `&requesterId=${encodeURIComponent(params.requesterId)}` : '';
    return fetchJson<{ documents: import('../types').MedicalDocument[]; total: number; patientId: string }>(
      `${API_BASE}/medical-documents?patientId=${pId}${cat}${search}${reqId}`
    );
  },

  async getMedicalDocumentById(id: string, patientId: string = 'p-101', requesterId?: string) {
    const reqParam = requesterId ? `?patientId=${patientId}&requesterId=${encodeURIComponent(requesterId)}` : `?patientId=${patientId}`;
    return fetchJson<import('../types').MedicalDocument>(`${API_BASE}/medical-documents/${id}${reqParam}`);
  },

  async uploadMedicalDocument(payload: {
    patientId: string;
    fileName: string;
    displayName: string;
    category: string;
    mimeType: string;
    fileSize: number;
    fileData: string; // base64 data URL
    uploadedBy?: string;
    uploaderRole?: string;
    notes?: string;
  }) {
    return fetchJson<{ success: boolean; document: import('../types').MedicalDocument; message: string }>(
      `${API_BASE}/medical-documents/upload`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  async deleteMedicalDocument(id: string, patientId: string = 'p-101', requesterId?: string) {
    return fetchJson<{ success: boolean; message: string; deletedId: string }>(
      `${API_BASE}/medical-documents/${id}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ patientId, requesterId }),
      }
    );
  },

  // ==================== REAL MEDICAL OCR APIS ====================
  async performOCR(payload: {
    fileData: string; // base64 Data URL or string
    fileName?: string;
    mimeType?: string;
    patientId?: string;
    documentTypeHint?: string;
    rotation?: number;
    enhanceContrast?: boolean;
    saveToVault?: boolean;
  }) {
    return fetchJson<import('../types').OCRResponse>(`${API_BASE}/ocr`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

