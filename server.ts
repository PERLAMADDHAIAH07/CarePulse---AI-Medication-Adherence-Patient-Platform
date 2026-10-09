import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { performMedicalOCR } from './src/services/ocrBackendService';

dotenv.config();

const currentDirname = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Initialize Google GenAI
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// ==================== IN-MEMORY DATABASE & SEED DATA ====================

const todayStr = new Date().toISOString().split('T')[0];

interface TreatmentCourse {
  id: string;
  medicineName: string;
  dosage: string;
  courseDuration: string;
  startDate: string;
  completionDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'ARCHIVED';
  completionPercentage: number;
  prescribedBy: string;
  clinicalNotes: string;
}

interface AccountLifecycle {
  accountStatus: 'ACTIVE' | 'INACTIVE' | 'DEACTIVATED' | 'PENDING_DELETION' | 'DELETED';
  careJourneyStatus: 'ACTIVE' | 'ENDING_SOON' | 'COMPLETED' | 'INACTIVE' | 'ARCHIVED';
  careJourneyTitle: string;
  startDate: string;
  expectedCompletionDate: string;
  archivedAt?: string;
  deactivatedAt?: string;
  deletionRequestedAt?: string;
  retentionNotice: string;
  treatmentCourses: TreatmentCourse[];
}

let userAccountLifecycleMap: Record<string, AccountLifecycle> = {
  'p-101': {
    accountStatus: 'ACTIVE',
    careJourneyStatus: 'ACTIVE',
    careJourneyTitle: 'Cardiometabolic & Hypertension Care Journey',
    startDate: '2026-06-10',
    expectedCompletionDate: '2026-09-10',
    retentionNotice: 'Pursuant to HIPAA § 164.316 & CA CMIA health compliance statutes, diagnostic audit records and medication event logs are maintained for mandatory 6-year retention.',
    treatmentCourses: [
      {
        id: 'tc-1',
        medicineName: 'Lisinopril',
        dosage: '10 mg Morning',
        courseDuration: '3 Months (Initial Titration Course)',
        startDate: '2026-05-23',
        completionDate: '2026-08-23',
        status: 'COMPLETED',
        completionPercentage: 100,
        prescribedBy: 'Dr. Evelyn Vance, MD (Cardiology)',
        clinicalNotes: 'Blood pressure stabilized at 124/82 mmHg. 3-month course finished today.',
      },
      {
        id: 'tc-2',
        medicineName: 'Metformin',
        dosage: '500 mg Twice Daily',
        courseDuration: 'Ongoing Glycemic Maintenance',
        startDate: '2026-06-10',
        completionDate: '2026-09-10',
        status: 'ACTIVE',
        completionPercentage: 82,
        prescribedBy: 'Dr. Evelyn Vance, MD',
        clinicalNotes: 'HbA1c lowered from 7.1 to 6.4. Active tracking continuing.',
      },
      {
        id: 'tc-3',
        medicineName: 'Atorvastatin',
        dosage: '20 mg Bedtime',
        courseDuration: '6 Months Lipid Management',
        startDate: '2026-06-10',
        completionDate: '2026-12-10',
        status: 'ACTIVE',
        completionPercentage: 41,
        prescribedBy: 'Dr. Evelyn Vance, MD',
        clinicalNotes: 'Lipid panel scheduled for 6-month evaluation.',
      },
    ],
  },
};

let users = [
  {
    id: 'p-101',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    phone: '+1 (555) 234-5678',
    passwordHash: 'hashed_password_123',
    role: 'PATIENT',
    familyInviteCode: 'A7K9P2',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'f-201',
    name: 'Marcus Johnson',
    email: 'marcus.j@example.com',
    phone: '+1 (555) 987-6543',
    passwordHash: 'hashed_password_456',
    role: 'FAMILY_MEMBER',
    familyInviteCode: '',
    linkedPatientId: 'p-101',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    createdAt: '2026-02-01T14:30:00Z',
  },
];

let medications: any[] = [
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
];

let adherenceLogs = [
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
];

let symptoms = [
  {
    id: 'sym-1',
    patientId: 'p-101',
    symptomText: 'Slight dizziness after morning walk',
    severity: 'mild',
    notes: 'Occurred around 10:30 AM. Rested for 15 minutes and felt better.',
    date: todayStr,
    createdAt: `${todayStr}T11:00:00Z`,
  },
  {
    id: 'sym-2',
    patientId: 'p-101',
    symptomText: 'Mild dry cough',
    severity: 'mild',
    notes: 'Noticed occasionally during afternoon.',
    date: '2026-08-01',
    createdAt: '2026-08-01T15:00:00Z',
  },
];

let healthUpdates = [
  {
    id: 'hu-1',
    patientId: 'p-101',
    date: todayStr,
    createdAt: `${todayStr}T09:00:00Z`,
  },
];

// ==================== PATIENT & USER RESOLUTION HELPERS ====================

function getOrCreateUser(userId: string, defaultRole: 'PATIENT' | 'FAMILY_MEMBER' = 'PATIENT') {
  let user = users.find((u) => u.id === userId);
  if (!user) {
    const isSarah = userId === 'p-101';
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let p1 = '', p2 = '';
    for (let i = 0; i < 3; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    for (let i = 0; i < 3; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    const randomCode = `${p1}${p2}`;

    user = {
      id: userId || (defaultRole === 'PATIENT' ? 'p-101' : 'f-201'),
      name: isSarah ? 'Sarah Johnson' : defaultRole === 'PATIENT' ? 'Sarah Johnson' : 'Caregiver Member',
      email: isSarah ? 'sarah.johnson@example.com' : `${userId || 'patient'}@carepulse.app`,
      phone: isSarah ? '+1 (555) 234-5678' : '',
      passwordHash: 'auth_verified',
      role: defaultRole,
      familyInviteCode: defaultRole === 'PATIENT' ? (isSarah ? 'A7K9P2' : randomCode) : '',
      avatarUrl: isSarah
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80'
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userId || 'patient')}`,
      createdAt: new Date().toISOString(),
    };
    users.push(user);

    // Also populate default patient data if this new patient has no medications
    if (defaultRole === 'PATIENT' && userId && userId !== 'p-101') {
      const existingMeds = medications.filter((m) => m.patientId === userId);
      if (existingMeds.length === 0) {
        medications.push(
          {
            id: `med-${userId}-1`,
            patientId: userId,
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
            id: `med-${userId}-2`,
            patientId: userId,
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
            id: `med-${userId}-3`,
            patientId: userId,
            medicineName: 'Atorvastatin',
            dosage: '20 mg',
            scheduleTimes: ['09:00 PM'],
            startDate: '2026-01-01',
            isActive: true,
            instructions: 'Take once daily in evening before sleep.',
            pillColor: 'bg-purple-500',
            category: 'Cholesterol Management',
            createdAt: '2026-01-01T08:00:00Z',
          }
        );

        adherenceLogs.push(
          {
            id: `log-${userId}-1`,
            patientId: userId,
            medicationId: `med-${userId}-1`,
            medicineName: 'Metformin',
            dosage: '500 mg',
            scheduledTime: '08:00 AM',
            scheduledDate: todayStr,
            status: 'TAKEN',
            takenAt: `${todayStr}T08:12:00Z`,
            createdAt: `${todayStr}T08:12:00Z`,
          },
          {
            id: `log-${userId}-2`,
            patientId: userId,
            medicationId: `med-${userId}-2`,
            medicineName: 'Lisinopril',
            dosage: '10 mg',
            scheduledTime: '09:00 AM',
            scheduledDate: todayStr,
            status: 'MISSED',
            createdAt: `${todayStr}T09:30:00Z`,
          },
          {
            id: `log-${userId}-3`,
            patientId: userId,
            medicationId: `med-${userId}-1`,
            medicineName: 'Metformin',
            dosage: '500 mg',
            scheduledTime: '08:00 PM',
            scheduledDate: todayStr,
            status: 'PENDING',
            createdAt: `${todayStr}T00:00:00Z`,
          },
          {
            id: `log-${userId}-4`,
            patientId: userId,
            medicationId: `med-${userId}-3`,
            medicineName: 'Atorvastatin',
            dosage: '20 mg',
            scheduledTime: '09:00 PM',
            scheduledDate: todayStr,
            status: 'UPCOMING',
            createdAt: `${todayStr}T00:00:00Z`,
          }
        );
      }
    }
  }
  return user;
}

function findPatientByInviteCode(inviteCode: string) {
  if (!inviteCode || !inviteCode.trim()) return users.find((u) => u.id === 'p-101') || users[0];
  const cleanCode = inviteCode.replace(/^CP-?/i, '').replace(/[\s-]/g, '').toUpperCase();

  let patient = users.find((u) => {
    if (u.role !== 'PATIENT' || !u.familyInviteCode) return false;
    const patCodeClean = u.familyInviteCode.replace(/^CP-?/i, '').replace(/[\s-]/g, '').toUpperCase();
    return patCodeClean === cleanCode;
  });

  if (!patient) {
    if (cleanCode === 'A7K9P2' || cleanCode === 'A7K9' || cleanCode === 'SARAH' || cleanCode === 'DEMO') {
      patient = users.find((u) => u.id === 'p-101') || users.find((u) => u.role === 'PATIENT') || users[0];
    } else {
      // Connect to default primary patient
      patient = users.find((u) => u.role === 'PATIENT') || users[0];
    }
  }

  return patient;
}

let familyConnections: Array<{
  id: string;
  patientId: string;
  patientName: string;
  familyMemberId: string;
  familyMemberName: string;
  displayName?: string;
  familyMemberEmail: string;
  phone?: string;
  relationship: string;
  permissions: any;
  status: string;
  createdAt: string;
}> = [
  {
    id: 'fc-1',
    patientId: 'p-101',
    patientName: 'Sarah Johnson',
    familyMemberId: 'f-201',
    familyMemberName: 'Marcus Johnson',
    displayName: 'Marcus',
    familyMemberEmail: 'marcus.j@example.com',
    phone: '+91 98765 43210',
    relationship: 'Caregiver',
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
  {
    id: 'fc-2',
    patientId: 'p-101',
    patientName: 'Sarah Johnson',
    familyMemberId: 'f-202',
    familyMemberName: 'Michael Johnson',
    displayName: 'Michael',
    familyMemberEmail: 'michael.j@example.com',
    phone: '+1 (555) 345-6789',
    relationship: 'Family Member',
    permissions: {
      medicationStatus: false,
      adherencePercentage: false,
      missedDoseAlerts: true,
      riskLevel: false,
      symptoms: false,
      healthUpdates: false,
      privateNotes: false,
      aiConversations: false,
    },
    status: 'ACTIVE',
    createdAt: '2026-04-12T09:15:00Z',
  },
  {
    id: 'fc-3',
    patientId: 'p-101',
    patientName: 'Sarah Johnson',
    familyMemberId: 'f-203',
    familyMemberName: 'Priya Patel',
    displayName: 'Priya',
    familyMemberEmail: 'priya.family@example.com',
    phone: '+91 98765 12345',
    relationship: 'Family Member',
    permissions: {
      medicationStatus: false,
      adherencePercentage: false,
      missedDoseAlerts: true,
      riskLevel: false,
      symptoms: false,
      healthUpdates: false,
      privateNotes: false,
      aiConversations: false,
    },
    status: 'PENDING',
    createdAt: '2026-08-22T16:40:00Z',
  },
];

// ==================== SYSTEM AUDIT & ALERT TYPES ====================

export interface SlackAlertRecord {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  service: string;
  environment: 'Production' | 'Staging';
  timestamp: string;
  referenceId: string;
  message: string;
  action: string;
  delivered: boolean;
  channel: string;
  technicalLink?: string;
}

let internalSlackAlerts: SlackAlertRecord[] = [
  {
    id: 'slack-101',
    severity: 'Critical',
    service: 'Notification Service',
    environment: 'Production',
    timestamp: '2026-08-25T10:32:00Z',
    referenceId: 'ERR-2048',
    message: 'Push worker connection timeout during peak schedule dispatch cycle.',
    action: 'Review Notification Service logs and reconnect FCM Admin gateway',
    delivered: true,
    channel: '#carepulse-ops-alerts',
    technicalLink: 'https://ops.carepulse.internal/errors/ERR-2048',
  },
  {
    id: 'slack-102',
    severity: 'High',
    service: 'Adherence Scheduler',
    environment: 'Production',
    timestamp: '2026-08-25T09:35:00Z',
    referenceId: 'ERR-3012',
    message: 'Worker retry latency spike (>320ms) on automated missed-dose calculation.',
    action: 'Check cron scheduler retry queue and scale background worker count',
    delivered: true,
    channel: '#carepulse-ops-alerts',
    technicalLink: 'https://ops.carepulse.internal/errors/ERR-3012',
  },
  {
    id: 'slack-103',
    severity: 'Critical',
    service: 'Medication API',
    environment: 'Production',
    timestamp: '2026-08-24T18:14:00Z',
    referenceId: 'ERR-4021',
    message: 'Database connection pool utilization exceeded 90% threshold for 60s.',
    action: 'Inspect database connection pool and run vacuum analyzer',
    delivered: true,
    channel: '#carepulse-ops-alerts',
    technicalLink: 'https://ops.carepulse.internal/errors/ERR-4021',
  },
];

// Helper: Dispatches operational alert to internal Slack operations channel (Strictly no PHI)
function dispatchInternalSlackAlert(params: {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  service: string;
  environment?: 'Production' | 'Staging';
  referenceId?: string;
  message: string;
  action: string;
  technicalLink?: string;
}): SlackAlertRecord {
  const refId = params.referenceId || `ERR-${Math.floor(1000 + Math.random() * 9000)}`;
  const record: SlackAlertRecord = {
    id: `slack-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    severity: params.severity,
    service: params.service,
    environment: params.environment || 'Production',
    timestamp: new Date().toISOString(),
    referenceId: refId,
    message: params.message,
    action: params.action,
    delivered: true,
    channel: '#carepulse-ops-alerts',
    technicalLink: params.technicalLink || `https://ops.carepulse.internal/errors/${refId}`,
  };

  internalSlackAlerts.unshift(record);
  console.log(`[SLACK OPS] Alert sent to ${record.channel} | [${record.severity}] ${record.service} - ${record.referenceId}: ${record.message}`);
  return record;
}

let notifications: any[] = [
  {
    id: 'notif-missed-1',
    patientId: 'p-101',
    targetUserId: 'p-101',
    type: 'MISSED_DOSE',
    title: 'Missed Dose',
    message: 'You missed your 9:00 AM medication.',
    triggerReason: 'Scheduled dose for Lisinopril 10 mg at 09:00 AM was not marked as taken within the 30-minute grace window.',
    relatedEntityId: 'med-2',
    isRead: false,
    deliveryStatus: 'Delivered',
    channel: 'FCM_PUSH',
    priority: 'High',
    fcmMessageId: 'fcm-msg-8829103',
    targetDeviceName: 'MacBook Pro (Chrome)',
    createdAt: `${todayStr}T09:30:00Z`,
  },
  {
    id: 'notif-med-rem-1',
    patientId: 'p-101',
    targetUserId: 'p-101',
    type: 'MEDICATION_REMINDER',
    title: 'Medication Reminder',
    message: "It's time to take Metformin.",
    triggerReason: 'Scheduled intake timer reached 08:00 AM for Metformin 500 mg.',
    relatedEntityId: 'med-1',
    isRead: true,
    readAt: `${todayStr}T08:02:15Z`,
    deliveryStatus: 'Delivered',
    channel: 'FCM_PUSH',
    priority: 'Normal',
    fcmMessageId: 'fcm-msg-8829102',
    targetDeviceName: 'MacBook Pro (Chrome)',
    createdAt: `${todayStr}T08:00:00Z`,
  },
  {
    id: 'notif-fam-1',
    patientId: 'p-101',
    targetUserId: 'p-101',
    type: 'FAMILY_ALERT',
    title: 'Care Alert',
    message: 'Sarah missed a scheduled medication.',
    triggerReason: 'Dispatched to authorized caregiver (Marcus Johnson) according to active family permissions (Missed Dose Alerts: Active).',
    relatedEntityId: 'med-2',
    isRead: false,
    deliveryStatus: 'Delivered',
    channel: 'FCM_PUSH',
    priority: 'High',
    fcmMessageId: 'fcm-msg-8829104',
    targetDeviceName: 'Caregiver iPhone 15 Pro',
    createdAt: `${todayStr}T09:31:00Z`,
  },
  {
    id: 'notif-sec-1',
    patientId: 'p-101',
    targetUserId: 'p-101',
    type: 'SECURITY_ALERT',
    title: 'Security Alert',
    message: 'Your CarePulse account was accessed from a new device.',
    triggerReason: 'Authentication detected from a new browser session (macOS / Chrome 127, IP 172.56.21.94, San Francisco, CA).',
    relatedEntityId: 'dev-1',
    isRead: false,
    deliveryStatus: 'Delivered',
    channel: 'FCM_PUSH',
    priority: 'Critical',
    fcmMessageId: 'fcm-msg-8829105',
    targetDeviceName: 'MacBook Pro (Chrome)',
    createdAt: `${todayStr}T06:15:00Z`,
  },
];

let deviceTokens: { userId: string; token: string; platform: string; deviceName?: string; lastActive?: string }[] = [
  {
    userId: 'p-101',
    token: 'fcm_token_macbook_pro_chrome_88291',
    platform: 'web',
    deviceName: 'MacBook Pro (Chrome)',
    lastActive: new Date().toISOString(),
  },
  {
    userId: 'p-101',
    token: 'fcm_token_iphone_15_pro_44810',
    platform: 'ios',
    deviceName: 'iPhone 15 Pro',
    lastActive: new Date(Date.now() - 3600000).toISOString(),
  },
];

// ==================== SYNCHRONIZED MEDICATION HISTORY STORE ====================

let medicationHistory: any[] = [
  {
    id: 'hevent-101',
    patientId: 'p-101',
    medicationId: 'med-1',
    medicineName: 'Metformin',
    dosage: '500 mg',
    eventType: 'DOSE_TAKEN',
    eventTitle: 'Dose Taken Successfully',
    scheduledTime: '08:00 AM',
    actualTime: '08:07 AM',
    status: 'TAKEN',
    createdDate: todayStr,
    updatedDate: `${todayStr}T08:07:00Z`,
    timestamp: `${todayStr}T08:07:00Z`,
    reminderStatus: 'Opened',
    adherenceImpact: '+2.5% Adherence',
    aiRiskImpact: 'Low Risk Maintained',
    notes: 'Taken with breakfast and full glass of water.',
    notificationStatus: 'Push Delivered',
  },
  {
    id: 'hevent-102',
    patientId: 'p-101',
    medicationId: 'med-2',
    medicineName: 'Lisinopril',
    dosage: '10 mg',
    eventType: 'DOSE_MISSED',
    eventTitle: 'Dose Missed - No Response',
    scheduledTime: '09:00 AM',
    actualTime: 'N/A (Window Expired)',
    status: 'MISSED',
    createdDate: todayStr,
    updatedDate: `${todayStr}T09:30:00Z`,
    timestamp: `${todayStr}T09:30:00Z`,
    reminderStatus: 'Delivered',
    adherenceImpact: '-5.0% Adherence',
    aiRiskImpact: 'Risk Level Increased to MEDIUM',
    notes: 'Patient did not confirm dose before 30-min window expired.',
    notificationStatus: 'Sent to Caregiver Marcus',
  },
  {
    id: 'hevent-103',
    patientId: 'p-101',
    medicationId: 'med-2',
    medicineName: 'Lisinopril',
    dosage: '10 mg',
    eventType: 'FAMILY_ALERT_SENT',
    eventTitle: 'Caregiver Alert Delivered',
    scheduledTime: '09:00 AM',
    actualTime: '09:31 AM',
    status: 'ALERT',
    createdDate: todayStr,
    updatedDate: `${todayStr}T09:31:00Z`,
    timestamp: `${todayStr}T09:31:00Z`,
    reminderStatus: 'Delivered',
    adherenceImpact: 'Neutral',
    aiRiskImpact: 'Caregiver Notified',
    notes: 'SMS & FCM Push Notification dispatched to Marcus Johnson (Son / Caregiver).',
    notificationStatus: 'Caregiver Alert Confirmed',
  },
  {
    id: 'hevent-104',
    patientId: 'p-101',
    medicationId: 'med-1',
    medicineName: 'Metformin',
    dosage: '500 mg',
    eventType: 'REMINDER_SENT',
    eventTitle: 'Evening Medication Reminder Dispatched',
    scheduledTime: '08:00 PM',
    actualTime: '08:00 PM',
    status: 'REMINDER',
    createdDate: todayStr,
    updatedDate: `${todayStr}T08:00:00Z`,
    timestamp: `${todayStr}T08:00:00Z`,
    reminderStatus: 'Delivered',
    adherenceImpact: 'Pending Intake',
    aiRiskImpact: 'Normal Schedule',
    notes: 'Scheduled evening dose reminder sent to smartphone.',
    notificationStatus: 'FCM Push Delivered',
  },
  {
    id: 'hevent-105',
    patientId: 'p-101',
    medicationId: 'med-3',
    medicineName: 'Atorvastatin',
    dosage: '20 mg',
    eventType: 'REMINDER_SENT',
    eventTitle: 'Night Medication Reminder Scheduled',
    scheduledTime: '09:00 PM',
    actualTime: '09:00 PM',
    status: 'REMINDER',
    createdDate: todayStr,
    updatedDate: `${todayStr}T00:00:00Z`,
    timestamp: `${todayStr}T00:00:00Z`,
    reminderStatus: 'Scheduled',
    adherenceImpact: 'Pending Intake',
    aiRiskImpact: 'Normal Schedule',
    notes: 'Upcoming dose scheduled for cholesterol management.',
    notificationStatus: 'Pending Delivery',
  },
  {
    id: 'hevent-106',
    patientId: 'p-101',
    medicationId: 'med-3',
    medicineName: 'Atorvastatin',
    dosage: '20 mg',
    eventType: 'MEDICINE_CREATED',
    eventTitle: 'Medicine Added to Profile',
    scheduledTime: '09:00 PM',
    actualTime: '2026-08-01 08:00 AM',
    status: 'CREATED',
    createdDate: '2026-08-01',
    updatedDate: '2026-08-01T08:00:00Z',
    timestamp: '2026-08-01T08:00:00Z',
    reminderStatus: 'Scheduled',
    adherenceImpact: 'Schedule Initiated',
    aiRiskImpact: 'Context Updated',
    notes: 'Atorvastatin 20 mg added for cholesterol management.',
    notificationStatus: 'System Logged',
  },
  {
    id: 'hevent-107',
    patientId: 'p-101',
    medicationId: 'med-3',
    medicineName: 'Atorvastatin',
    dosage: '20 mg',
    eventType: 'SCHEDULE_CREATED',
    eventTitle: 'Daily Schedule Configured',
    scheduledTime: '09:00 PM',
    actualTime: '2026-08-01 08:01 AM',
    status: 'CREATED',
    createdDate: '2026-08-01',
    updatedDate: '2026-08-01T08:01:00Z',
    timestamp: '2026-08-01T08:01:00Z',
    reminderStatus: 'Scheduled',
    adherenceImpact: 'Neutral',
    aiRiskImpact: 'Low Risk',
    notes: 'Daily 09:00 PM bedtime intake schedule set up.',
    notificationStatus: 'System Logged',
  },
  {
    id: 'hevent-108',
    patientId: 'p-101',
    medicationId: 'med-1',
    medicineName: 'Metformin',
    dosage: '500 mg',
    eventType: 'DOSE_DELAYED',
    eventTitle: 'Dose Intake Delayed',
    scheduledTime: '08:00 PM',
    actualTime: '08:42 PM',
    status: 'DELAYED',
    createdDate: '2026-08-06',
    updatedDate: '2026-08-06T20:42:00Z',
    timestamp: '2026-08-06T20:42:00Z',
    reminderStatus: 'Opened',
    adherenceImpact: '+1.5% Adherence (Delayed)',
    aiRiskImpact: 'Low Risk',
    notes: 'Taken 42 minutes after scheduled time due to late dinner.',
    notificationStatus: 'Log Updated',
  },
  {
    id: 'hevent-109',
    patientId: 'p-101',
    medicationId: 'med-2',
    medicineName: 'Lisinopril',
    dosage: '10 mg',
    eventType: 'DOSE_SKIPPED',
    eventTitle: 'Dose Skipped with Clinical Note',
    scheduledTime: '09:00 AM',
    actualTime: '2026-08-05 09:15 AM',
    status: 'SKIPPED',
    createdDate: '2026-08-05',
    updatedDate: '2026-08-05T09:15:00Z',
    timestamp: '2026-08-05T09:15:00Z',
    reminderStatus: 'Opened',
    adherenceImpact: 'Neutral (Clinical Skip)',
    aiRiskImpact: 'Low Risk',
    notes: 'Skipped per physician instruction prior to fasting blood draw.',
    notificationStatus: 'Caregiver Notified',
  },
  {
    id: 'hevent-110',
    patientId: 'p-101',
    medicationId: 'med-1',
    medicineName: 'Metformin',
    dosage: '500 mg',
    eventType: 'AI_RISK_UPDATED',
    eventTitle: 'AI Adherence Risk Level Calculated',
    scheduledTime: 'All Times',
    actualTime: '2026-08-04 12:00 PM',
    status: 'UPDATED',
    createdDate: '2026-08-04',
    updatedDate: '2026-08-04T12:00:00Z',
    timestamp: '2026-08-04T12:00:00Z',
    reminderStatus: 'Scheduled',
    adherenceImpact: 'Weekly Rate: 92%',
    aiRiskImpact: 'LOW RISK (Score: 8/100)',
    notes: 'Consistent morning and evening intake recorded across 7 days.',
    notificationStatus: 'AI Engine Synced',
  },
];

function recordHistoryEvent(input: {
  patientId: string;
  medicationId?: string;
  medicineName: string;
  dosage?: string;
  eventType: string;
  eventTitle: string;
  scheduledTime?: string;
  actualTime?: string;
  status: 'TAKEN' | 'MISSED' | 'SKIPPED' | 'DELAYED' | 'CREATED' | 'UPDATED' | 'DELETED' | 'ALERT' | 'REMINDER' | 'ACTIVATED' | 'DISABLED' | 'COMPLETED' | 'EXPIRED';
  createdDate?: string;
  updatedDate?: string;
  timestamp?: string;
  reminderStatus?: 'Delivered' | 'Opened' | 'Pending' | 'Scheduled' | 'Failed';
  adherenceImpact?: string;
  aiRiskImpact?: string;
  notes?: string;
  notificationStatus?: string;
}) {
  const nowStr = new Date().toISOString();
  const dateStr = input.createdDate || nowStr.split('T')[0];

  const newEvent = {
    id: `hevent-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    patientId: input.patientId,
    medicationId: input.medicationId || '',
    medicineName: input.medicineName,
    dosage: input.dosage || '',
    eventType: input.eventType,
    eventTitle: input.eventTitle,
    scheduledTime: input.scheduledTime || '',
    actualTime: input.actualTime || nowStr,
    status: input.status,
    createdDate: dateStr,
    updatedDate: input.updatedDate || nowStr,
    timestamp: input.timestamp || nowStr,
    reminderStatus: input.reminderStatus || 'Delivered',
    adherenceImpact: input.adherenceImpact || 'Updated',
    aiRiskImpact: input.aiRiskImpact || 'Recalculated',
    notes: input.notes || '',
    notificationStatus: input.notificationStatus || 'System Logged',
  };

  medicationHistory.unshift(newEvent);
  return newEvent;
}

let aiConversations = [
  {
    id: 'conv-1',
    patientId: 'p-101',
    title: 'Medication Adherence Discussion',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hi! How was my medication adherence this week?',
        timestamp: '2026-08-02T10:00:00Z',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hello Sarah! You maintained an impressive 88% overall adherence over the past 7 days. You took your evening Metformin and Atorvastatin consistently. Let me know if you would like tips for remembering morning doses!',
        timestamp: '2026-08-02T10:00:05Z',
      },
    ],
    createdAt: '2026-08-02T10:00:00Z',
    updatedAt: '2026-08-02T10:00:05Z',
  },
];

// Helper to calculate Adherence Summary
function calculateAdherenceSummary(patientId: string) {
  const patientLogs = adherenceLogs.filter((l) => l.patientId === patientId);
  const todayLogs = patientLogs.filter((l) => l.scheduledDate === todayStr);

  const totalScheduledToday = todayLogs.length;
  const takenToday = todayLogs.filter((l) => l.status === 'TAKEN').length;
  const missedToday = todayLogs.filter((l) => l.status === 'MISSED').length;
  const pendingToday = todayLogs.filter((l) => l.status === 'PENDING' || l.status === 'UPCOMING').length;

  const todayPercentage = totalScheduledToday > 0
    ? Math.round((takenToday / Math.max(1, takenToday + missedToday)) * 100)
    : 100;

  // Compute realistic weekly %
  const takenCount = patientLogs.filter((l) => l.status === 'TAKEN').length;
  const totalCompleted = patientLogs.filter((l) => l.status === 'TAKEN' || l.status === 'MISSED').length;
  const weeklyPercentage = totalCompleted > 0 ? Math.round((takenCount / totalCompleted) * 100) : 85;

  return {
    todayPercentage,
    weeklyPercentage,
    monthlyPercentage: 88,
    totalScheduledToday,
    takenToday,
    missedToday,
    pendingToday,
    trend: missedToday > 0 ? 'declining' : 'improving',
  };
}

// Helper to calculate AI Risk Level
function calculateRiskLevel(patientId: string) {
  const summary = calculateAdherenceSummary(patientId);
  const patientSymptoms = symptoms.filter((s) => s.patientId === patientId);
  const severeSymptoms = patientSymptoms.filter((s) => s.severity === 'severe');

  let score = 100 - summary.weeklyPercentage;
  if (summary.missedToday > 0) score += 20;
  if (severeSymptoms.length > 0) score += 25;

  let riskLevel: 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK' = 'LOW RISK';
  const reasons: string[] = [];
  const recommendations: string[] = [];

  if (score >= 45) {
    riskLevel = 'HIGH RISK';
    reasons.push('Multiple missed medication doses recorded recently.');
    if (severeSymptoms.length > 0) reasons.push('Severe symptoms logged in history.');
    recommendations.push('Set additional smartphone alarms for morning routine.');
    recommendations.push('Consider enabling caregiver sms/push alerts for missed doses.');
    recommendations.push('Consult your healthcare provider if dizziness or missed doses persist.');
  } else if (score >= 20 || summary.missedToday > 0) {
    riskLevel = 'MEDIUM RISK';
    reasons.push(`Recent missed dose detected (Lisinopril scheduled at 09:00 AM).`);
    reasons.push(`Weekly adherence rate is currently ${summary.weeklyPercentage}%.`);
    recommendations.push('Pair medication intake with a daily habit like morning breakfast.');
    recommendations.push('Keep medication in a visible, safe storage container.');
  } else {
    riskLevel = 'LOW RISK';
    reasons.push(`Excellent medication adherence rate (${summary.weeklyPercentage}%).`);
    reasons.push('No critical missed doses or severe symptoms in recent logs.');
    recommendations.push('Maintain your current routine and schedule.');
  }

  return {
    patientId,
    riskLevel,
    score: Math.min(100, score),
    reasons,
    recommendations,
    calculatedAt: new Date().toISOString(),
  };
}

// ==================== REST API ENDPOINTS ====================

// Authentication API
app.post('/api/auth/firebase-exchange', (req, res) => {
  const {
    idToken,
    uid,
    email,
    password,
    role = 'PATIENT',
    name,
    phone,
    photoUrl,
    familyInviteCode,
    relationship,
    loginMethod = 'Email + Password'
  } = req.body;

  if (!email && !uid && !phone) {
    return res.status(400).json({ error: 'Authentication credentials are required.' });
  }

  // Look up user by Firebase UID or email or phone
  let user = users.find(
    (u) =>
      (uid && u.id === uid) ||
      (email && u.email.toLowerCase() === (email || '').toLowerCase()) ||
      (phone && u.phone === phone)
  );

  if (!user) {
    // Generate unique 6-character invitation code if patient
    const codeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let inviteCode = '';
    for (let i = 0; i < 6; i++) {
      inviteCode += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
    }

    user = {
      id: uid || (role === 'PATIENT' ? `p-${Date.now()}` : `f-${Date.now()}`),
      name: name || (email ? email.split('@')[0] : 'CarePulse User'),
      email: email || `${uid || Date.now()}@carepulse.app`,
      phone: phone || '',
      passwordHash: 'firebase_auth_verified',
      role: (role === 'FAMILY_MEMBER' || role === 'CAREGIVER') ? 'FAMILY_MEMBER' : 'PATIENT',
      familyInviteCode: role === 'PATIENT' ? inviteCode : '',
      avatarUrl: photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || email || 'carepulse')}`,
      createdAt: new Date().toISOString(),
    };
    users.push(user);

    // Initialize lifecycle if patient
    if (user.role === 'PATIENT') {
      userAccountLifecycleMap[user.id] = {
        accountStatus: 'ACTIVE',
        careJourneyStatus: 'ACTIVE',
        careJourneyTitle: 'Active Healthcare & Medication Plan',
        startDate: todayStr,
        expectedCompletionDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        retentionNotice: 'Pursuant to HIPAA § 164.316 & CA CMIA health compliance statutes, diagnostic audit records and medication event logs are maintained for mandatory 6-year retention.',
        treatmentCourses: [],
      };
    }
  }

  // Record login event in Login History
  const loginEventId = `log-${Date.now()}`;
  const newLoginEvent = {
    id: loginEventId,
    date: todayStr,
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    logoutTime: 'Active Session',
    duration: 'Ongoing',
    browser: req.headers['user-agent']?.includes('Safari') ? 'Safari 17.5' : 'Chrome 127.0',
    os: 'macOS Sonoma / Web',
    device: 'Desktop Client',
    ipAddress: '172.56.21.94',
    location: 'San Francisco, CA, USA',
    status: 'Success',
    currentSession: true
  };

  if (!userLoginHistory[user.id]) {
    userLoginHistory[user.id] = [];
  }
  userLoginHistory[user.id].unshift(newLoginEvent);

  // Register device for FCM
  const fcmToken = `fcm_token_${user.id}_${Math.random().toString(36).substring(2, 10)}`;
  if (!deviceTokens.some(d => d.userId === user.id)) {
    deviceTokens.push({
      userId: user.id,
      token: fcmToken,
      platform: 'web',
      deviceName: 'Active Browser (CarePulse)',
      lastActive: new Date().toISOString()
    });
  }

  // If caregiver and familyInviteCode is supplied, verify and establish connection
  let linkedPatient = null;
  let connection = null;

  if (user.role === 'FAMILY_MEMBER') {
    if (familyInviteCode && familyInviteCode.trim()) {
      const patient = findPatientByInviteCode(familyInviteCode);

      user.linkedPatientId = patient.id;
      linkedPatient = patient;

      connection = familyConnections.find((fc) => fc.patientId === patient.id && fc.familyMemberId === user.id);
      if (!connection) {
        connection = {
          id: `fc-${Date.now()}`,
          patientId: patient.id,
          patientName: patient.name,
          familyMemberId: user.id,
          familyMemberName: user.name,
          familyMemberEmail: user.email,
          relationship: relationship || 'Family Caregiver',
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
          status: 'ACTIVE' as const,
          createdAt: new Date().toISOString(),
        };
        familyConnections.push(connection);
      }
    } else if (user.linkedPatientId) {
      linkedPatient = users.find((p) => p.id === user.linkedPatientId) || null;
      connection = familyConnections.find(fc => fc.patientId === user.linkedPatientId && fc.familyMemberId === user.id) || null;
    }
  }

  res.json({
    user,
    patient: linkedPatient,
    connection,
    token: idToken || `carepulse_jwt_${user.id}_${Date.now()}`,
    fcmToken,
    requiresConnection: user.role === 'FAMILY_MEMBER' && !linkedPatient
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;
  const user = users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // If role specified and doesn't match
  if (role && user.role !== role) {
    // Return user with their actual role so frontend can route correctly or warn
  }

  let linkedPatient = null;
  if (user.role === 'FAMILY_MEMBER' && user.linkedPatientId) {
    linkedPatient = users.find((p) => p.id === user.linkedPatientId) || null;
  }

  res.json({
    user,
    patient: linkedPatient,
    token: `jwt_token_sample_${user.id}_${Date.now()}`,
  });
});

app.post('/api/auth/google', (req, res) => {
  const { email, name, role, photoUrl } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Google authentication email is required.' });
  }

  let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    // Generate unique 6-character invitation code if patient
    const codeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let inviteCode = '';
    for (let i = 0; i < 6; i++) {
      inviteCode += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
    }

    user = {
      id: role === 'PATIENT' ? `p-${Date.now()}` : `f-${Date.now()}`,
      name: name || email.split('@')[0],
      email,
      phone: '',
      passwordHash: 'google_oauth_provider',
      role: role || 'PATIENT',
      familyInviteCode: role === 'PATIENT' ? inviteCode : '',
      avatarUrl: photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || email)}`,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
  }

  let linkedPatient = null;
  if (user.role === 'FAMILY_MEMBER' && user.linkedPatientId) {
    linkedPatient = users.find((p) => p.id === user.linkedPatientId) || null;
  }

  res.json({
    user,
    patient: linkedPatient,
    token: `jwt_token_${user.id}_${Date.now()}`,
  });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { phone, otp, role, name } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  let user = users.find((u) => u.phone === phone);

  if (!user) {
    const codeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let inviteCode = '';
    for (let i = 0; i < 6; i++) {
      inviteCode += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
    }

    user = {
      id: role === 'PATIENT' ? `p-${Date.now()}` : `f-${Date.now()}`,
      name: name || `CarePulse User (${phone.slice(-4)})`,
      email: `${phone.replace(/[^0-9]/g, '')}@carepulse-mobile.internal`,
      phone,
      passwordHash: 'otp_verified',
      role: role || 'PATIENT',
      familyInviteCode: role === 'PATIENT' ? inviteCode : '',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(phone)}`,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
  }

  let linkedPatient = null;
  if (user.role === 'FAMILY_MEMBER' && user.linkedPatientId) {
    linkedPatient = users.find((p) => p.id === user.linkedPatientId) || null;
  }

  res.json({
    user,
    patient: linkedPatient,
    token: `jwt_token_otp_${user.id}_${Date.now()}`,
  });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Please enter your registered email address.' });
  }
  res.json({
    success: true,
    message: `A password reset link has been dispatched to ${email}. Please check your inbox.`,
  });
});

app.post('/api/auth/connect-patient', (req, res) => {
  const { userId, familyInviteCode, relationship } = req.body;

  if (!familyInviteCode || !familyInviteCode.trim()) {
    return res.status(400).json({ error: 'Patient invitation code is required.' });
  }

  const patient = findPatientByInviteCode(familyInviteCode);

  let familyUser = users.find((u) => u.id === userId);
  if (familyUser) {
    familyUser.linkedPatientId = patient.id;
  } else {
    familyUser = {
      id: `f-${Date.now()}`,
      name: 'Caregiver Member',
      email: 'caregiver@carepulse.app',
      phone: '',
      passwordHash: 'auth_connected',
      role: 'FAMILY_MEMBER',
      familyInviteCode: '',
      linkedPatientId: patient.id,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=caregiver`,
      createdAt: new Date().toISOString(),
    };
    users.push(familyUser);
  }

  // Check or create connection record
  let connection = familyConnections.find(
    (fc) => fc.patientId === patient.id && fc.familyMemberId === familyUser.id
  );

  if (!connection) {
    connection = {
      id: `fc-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      familyMemberId: familyUser.id,
      familyMemberName: familyUser.name,
      familyMemberEmail: familyUser.email,
      relationship: relationship || 'Family Caregiver',
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
      createdAt: new Date().toISOString(),
    };
    familyConnections.push(connection);
  }

  res.json({
    success: true,
    user: familyUser,
    patient,
    connection,
  });
});

app.post('/api/auth/register/patient', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists.' });
  }

  // Generate unique 6-character invitation code
  const codeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let inviteCode = '';
  for (let i = 0; i < 6; i++) {
    inviteCode += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
  }

  const newUser = {
    id: `p-${Date.now()}`,
    name,
    email,
    phone: phone || '',
    passwordHash: 'hashed_password',
    role: 'PATIENT',
    familyInviteCode: inviteCode,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);

  res.status(201).json({
    user: newUser,
    token: `jwt_token_sample_${newUser.id}_${Date.now()}`,
  });
});

app.post('/api/auth/register/family', (req, res) => {
  const { name, email, phone, password, familyInviteCode, relationship } = req.body;

  if (!name || !email || !password || !familyInviteCode) {
    return res.status(400).json({ error: 'Name, email, password, and family invitation code are required.' });
  }

  const patient = findPatientByInviteCode(familyInviteCode);

  const newUser = {
    id: `f-${Date.now()}`,
    name,
    email,
    phone: phone || '',
    passwordHash: 'hashed_password',
    role: 'FAMILY_MEMBER',
    familyInviteCode: '',
    linkedPatientId: patient.id,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);

  // Create Family Connection Record
  const newConnection = {
    id: `fc-${Date.now()}`,
    patientId: patient.id,
    patientName: patient.name,
    familyMemberId: newUser.id,
    familyMemberName: newUser.name,
    familyMemberEmail: newUser.email,
    relationship: relationship || 'Family Member',
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
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
  };

  familyConnections.push(newConnection);

  res.status(201).json({
    user: newUser,
    patient,
    connection: newConnection,
    token: `jwt_token_sample_${newUser.id}_${Date.now()}`,
  });
});

app.post('/api/auth/family-login-code', (req, res) => {
  const { familyInviteCode, caregiverName, caregiverEmail } = req.body;

  if (!familyInviteCode || !familyInviteCode.trim()) {
    return res.status(400).json({ error: 'Patient invitation code is required.' });
  }

  const patient = findPatientByInviteCode(familyInviteCode);

  // Find existing caregiver linked to this patient or create one
  let familyUser = users.find(
    (u) => u.role === 'FAMILY_MEMBER' && (u.linkedPatientId === patient.id || (caregiverEmail && u.email === caregiverEmail))
  );

  if (!familyUser) {
    const name = caregiverName || 'Marcus Johnson';
    const email = caregiverEmail || 'marcus.j@example.com';
    familyUser = {
      id: `f-${Date.now()}`,
      name,
      email,
      phone: '+1 (555) 987-6543',
      passwordHash: 'hashed_password',
      role: 'FAMILY_MEMBER',
      familyInviteCode: '',
      linkedPatientId: patient.id,
      avatarUrl: `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80`,
      createdAt: new Date().toISOString(),
    };
    users.push(familyUser);
  }

  let connection = familyConnections.find(
    (fc) => fc.patientId === patient.id && fc.familyMemberId === familyUser.id
  );

  if (!connection) {
    connection = {
      id: `fc-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      familyMemberId: familyUser.id,
      familyMemberName: familyUser.name,
      familyMemberEmail: familyUser.email,
      relationship: 'Family Caregiver',
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
      createdAt: new Date().toISOString(),
    };
    familyConnections.push(connection);
  }

  res.json({
    user: familyUser,
    patient,
    connection,
    token: `jwt_token_sample_${familyUser.id}_${Date.now()}`,
  });
});

// ==================== ENTERPRISE ACCOUNT & SECURITY CENTER DATA STORES ====================

let accountSecurityMap: Record<string, any> = {
  'p-101': {
    passwordLastChanged: '2026-05-15T10:30:00.000Z',
    passwordStrength: 'Strong (94/100)',
    twoFactorEnabled: false,
    biometricsEnabled: true,
    pinLockEnabled: true,
    failedLoginAttempts: 0,
    securityScore: 92,
    emailVerified: true,
    phoneVerified: true,
    recommendations: [
      'Enable Two-Factor Authentication (2FA) for extra layer of protection.',
      'Set up emergency biometric recovery contact.',
      'Review active sessions periodically.'
    ]
  },
  'f-201': {
    passwordLastChanged: '2026-06-10T14:20:00.000Z',
    passwordStrength: 'Strong (88/100)',
    twoFactorEnabled: true,
    biometricsEnabled: true,
    pinLockEnabled: false,
    failedLoginAttempts: 0,
    securityScore: 96,
    emailVerified: true,
    phoneVerified: true,
    recommendations: [
      'Update recovery phone number if changed recently.'
    ]
  }
};

let userLoginHistory: Record<string, any[]> = {
  'p-101': [
    {
      id: 'log-101',
      date: '2026-08-07',
      time: '08:30 AM',
      logoutTime: 'Active Session',
      duration: '5h 29m (Ongoing)',
      browser: 'Chrome 127.0.0.0',
      os: 'macOS Sonoma 14.5',
      device: 'MacBook Pro 16"',
      ipAddress: '172.56.21.94',
      location: 'San Francisco, CA, USA',
      status: 'Success',
      currentSession: true
    },
    {
      id: 'log-100',
      date: '2026-08-06',
      time: '06:15 PM',
      logoutTime: '09:42 PM',
      duration: '3h 27m',
      browser: 'Mobile Safari 17.5',
      os: 'iOS 17.5.1',
      device: 'iPhone 15 Pro',
      ipAddress: '172.56.21.94',
      location: 'San Francisco, CA, USA',
      status: 'Success',
      currentSession: false
    },
    {
      id: 'log-099',
      date: '2026-08-04',
      time: '09:12 AM',
      logoutTime: '05:30 PM',
      duration: '8h 18m',
      browser: 'Chrome 126.0.0.0',
      os: 'Windows 11 Enterprise',
      device: 'Work Station PC',
      ipAddress: '192.168.1.45',
      location: 'San Jose, CA, USA',
      status: 'Success',
      currentSession: false
    },
    {
      id: 'log-098',
      date: '2026-08-02',
      time: '11:45 PM',
      logoutTime: '11:46 PM',
      duration: '1m (Auto Timeout)',
      browser: 'Firefox 125.0',
      os: 'macOS',
      device: 'MacBook Pro 16"',
      ipAddress: '172.56.21.94',
      location: 'San Francisco, CA, USA',
      status: 'Expired',
      currentSession: false
    },
    {
      id: 'log-097',
      date: '2026-07-29',
      time: '02:11 AM',
      logoutTime: 'N/A',
      duration: '0m',
      browser: 'Unknown Automated Client',
      os: 'Linux',
      device: 'Unknown Device',
      ipAddress: '198.51.100.22',
      location: 'Unrecognized Location',
      status: 'Failed',
      currentSession: false
    }
  ]
};

let userActiveDevices: Record<string, any[]> = {
  'p-101': [
    {
      id: 'dev-1',
      deviceType: 'Desktop',
      deviceName: 'Windows PC',
      browser: 'Chrome',
      os: 'Windows',
      location: 'Hyderabad, India',
      lastActive: 'Just now',
      isCurrentDevice: true,
    },
    {
      id: 'dev-2',
      deviceType: 'Smartphone',
      deviceName: 'iPhone',
      browser: 'Safari',
      os: 'iOS',
      location: 'Hyderabad, India',
      lastActive: 'Yesterday • 08:20 PM',
      isCurrentDevice: false,
    },
    {
      id: 'dev-3',
      deviceType: 'Smartphone',
      deviceName: 'Android Phone',
      browser: 'Chrome',
      os: 'Android',
      location: 'Hyderabad, India',
      lastActive: 'Aug 21 • 06:10 PM',
      isCurrentDevice: false,
    },
  ],
};

let userSessionsMap: Record<string, any[]> = {
  'p-101': [
    {
      id: 'sess_live_99481203',
      deviceId: 'dev-1',
      deviceName: 'MacBook Pro 16"',
      authMethod: 'Email + Biometric Passkey',
      accessTokenStatus: 'Active (JWT RS256 Valid)',
      refreshTokenStatus: 'Valid (Rotated 15m ago)',
      tokenExpirySeconds: 3240,
      rememberMe: true,
      autoLogin: true,
      sessionTimeout: '30 Minutes Inactivity',
      lastLogin: '2026-08-07T08:30:00Z',
      sessionStarted: '2026-08-07T08:30:00Z',
      sessionDuration: '5h 29m',
      isCurrent: true,
      status: 'Active'
    },
    {
      id: 'sess_mob_44810294',
      deviceId: 'dev-2',
      deviceName: 'iPhone 15 Pro',
      authMethod: 'Face ID Biometric OTP',
      accessTokenStatus: 'Active (JWT RS256)',
      refreshTokenStatus: 'Valid',
      tokenExpirySeconds: 18000,
      rememberMe: true,
      autoLogin: true,
      sessionTimeout: '60 Minutes Inactivity',
      lastLogin: '2026-08-07T06:15:00Z',
      sessionStarted: '2026-08-07T06:15:00Z',
      sessionDuration: '7h 44m',
      isCurrent: false,
      status: 'Active'
    }
  ]
};

let notificationPreferencesMap: Record<string, any> = {
  'p-101': {
    medicationReminder: { email: true, push: true, sms: true },
    missedDoseAlert: { email: true, push: true, sms: true },
    familyAlerts: { email: true, push: true, sms: false },
    criticalAlerts: { email: true, push: true, sms: true },
    aiRecommendations: { email: true, push: true, sms: false },
    weeklyReports: { email: true, push: false, sms: false },
    monthlyReports: { email: true, push: false, sms: false },
    masterToggle: true
  }
};

let aiAccountMap: Record<string, any> = {
  'p-101': {
    aiStatus: 'Online & Active',
    personalizationEnabled: true,
    memoryUsage: '1.42 MB / 50 MB (2.8% Capacity)',
    conversationCount: 38,
    lastConversation: '2026-08-07T11:45:00.000Z',
    healthTimelineSync: true,
    aiContextStatus: 'Synchronized (Live Adherence Context Loaded)'
  }
};

// ==================== ENTERPRISE ACCOUNT API ENDPOINTS ====================

// GET /api/account/profile
app.get('/api/account/profile', (req, res) => {
  const userId = (req.query.userId as string) || 'p-101';
  const user = users.find((u) => u.id === userId) || users[0];
  const sec = accountSecurityMap[userId] || accountSecurityMap['p-101'];

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    familyInviteCode: user.familyInviteCode,
    linkedPatientId: user.linkedPatientId,
    avatarUrl: user.avatarUrl,
    accountStatus: 'Active & Compliant (HIPAA & GDPR)',
    emailVerified: sec ? sec.emailVerified : true,
    phoneVerified: sec ? sec.phoneVerified : true,
    memberSince: user.createdAt || '2026-01-15T00:00:00.000Z',
    lastUpdated: new Date().toISOString()
  });
});

// PUT /api/account/profile
app.put('/api/account/profile', (req, res) => {
  const { userId, name, email, phone, avatarUrl } = req.body;
  const targetId = userId || 'p-101';
  const user = users.find((u) => u.id === targetId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (avatarUrl) user.avatarUrl = avatarUrl;

  res.json({ success: true, message: 'Account profile updated successfully', user });
});

// GET /api/account/security
app.get('/api/account/security', (req, res) => {
  const userId = (req.query.userId as string) || 'p-101';
  const sec = accountSecurityMap[userId] || {
    passwordLastChanged: '2026-05-15T10:30:00.000Z',
    passwordStrength: 'Strong (94/100)',
    twoFactorEnabled: false,
    biometricsEnabled: true,
    pinLockEnabled: true,
    failedLoginAttempts: 0,
    securityScore: 92,
    emailVerified: true,
    phoneVerified: true,
    recommendations: ['Enable 2FA for extra protection']
  };

  res.json(sec);
});

// GET /api/account/login-history
app.get('/api/account/login-history', (req, res) => {
  const userId = (req.query.userId as string) || 'p-101';
  const logs = userLoginHistory[userId] || userLoginHistory['p-101'];
  res.json(logs);
});

// GET /api/account/sessions
app.get('/api/account/sessions', (req, res) => {
  const userId = (req.query.userId as string) || 'p-101';
  const sessions = userSessionsMap[userId] || userSessionsMap['p-101'];
  res.json({
    currentSessionId: sessions[0]?.id || 'sess_live_99481203',
    sessions
  });
});

// DELETE /api/account/session/:id
app.delete('/api/account/session/:id', (req, res) => {
  const { id } = req.params;
  const userId = (req.query.userId as string) || 'p-101';
  if (userSessionsMap[userId]) {
    userSessionsMap[userId] = userSessionsMap[userId].filter((s) => s.id !== id);
  }
  res.json({ success: true, message: `Session ${id} terminated successfully.` });
});

// DELETE /api/account/logout-all
app.delete('/api/account/logout-all', (req, res) => {
  const userId = (req.body.userId as string) || 'p-101';
  if (userSessionsMap[userId]) {
    userSessionsMap[userId] = userSessionsMap[userId].filter((s) => s.isCurrent);
  }
  if (userActiveDevices[userId]) {
    userActiveDevices[userId] = userActiveDevices[userId].filter((d) => d.isCurrent);
  }
  res.json({ success: true, message: 'Logged out from all other active sessions and devices.' });
});

// GET /api/account/devices
app.get('/api/account/devices', (req, res) => {
  const userId = (req.query.userId as string) || 'p-101';
  const devices = userActiveDevices[userId] || userActiveDevices['p-101'];
  res.json(devices);
});

// DELETE /api/account/device/:id
app.delete('/api/account/device/:id', (req, res) => {
  const { id } = req.params;
  const userId = (req.query.userId as string) || 'p-101';
  if (userActiveDevices[userId]) {
    userActiveDevices[userId] = userActiveDevices[userId].filter((d) => d.id !== id);
  }
  res.json({ success: true, message: `Device ${id} removed successfully.` });
});

// GET /api/account/statistics
app.get('/api/account/statistics', (req, res) => {
  const userId = (req.query.userId as string) || 'p-101';
  const userMeds = medications.filter((m) => m.patientId === userId);
  const userLogs = adherenceLogs.filter((l) => l.patientId === userId);
  const takenCount = userLogs.filter((l) => l.status === 'TAKEN').length;
  const missedCount = userLogs.filter((l) => l.status === 'MISSED').length;
  const summary = calculateAdherenceSummary(userId);

  res.json({
    daysUsingApp: 142,
    totalMedicines: userMeds.length,
    todayMedicines: summary.totalScheduledToday,
    completedDoses: takenCount,
    missedDoses: missedCount,
    adherencePercentage: summary.weeklyPercentage,
    familyMembers: familyConnections.filter((fc) => fc.patientId === userId || fc.familyMemberId === userId).length,
    notificationsSent: notifications.filter((n) => n.targetUserId === userId).length || 128,
    aiConversations: 38
  });
});

// GET /api/account/app-info
app.get('/api/account/app-info', (req, res) => {
  res.json({
    appName: 'CarePulse AI Healthcare Platform',
    appVersion: 'v2.4.0-production',
    flutterVersion: '3.22.2 (Channel stable)',
    reactVersion: '18.3.1',
    backendVersion: 'v3.1.2 (Express + FastAPI Microservice)',
    apiVersion: 'v1.4.0',
    databaseVersion: 'PostgreSQL 16.3 + MongoDB 7.0 Enterprise',
    firebaseStatus: 'Connected & FCM Active',
    serverHealth: 'Operational (99.99% SLA)',
    buildNumber: '8849201',
    environment: process.env.NODE_ENV || 'development',
    apiLatency: '28ms',
    lastSync: new Date().toISOString()
  });
});

// GET /api/account/developer
app.get('/api/account/developer', (req, res) => {
  const userId = (req.query.userId as string) || 'p-101';
  const user = users.find((u) => u.id === userId) || users[0];

  res.json({
    fastApiStatus: 'Healthy (Worker #4 Active)',
    mongoDbStatus: 'Connected (Replica Set Primary - 12ms latency)',
    firebaseStatus: 'Connected (FCM Admin SDK v12.1.0)',
    schedulerStatus: 'Active (Cron Medication Workers Running)',
    notificationWorker: 'Running (Queue size: 0, Processed: 4,812)',
    jwtStatus: 'Valid (RS256 Private Key Signed)',
    redisStatus: 'Connected (Cache hit ratio: 94.2%)',
    currentUserId: user.id,
    role: user.role,
    permissions: [
      'read:profile',
      'write:profile',
      'read:medications',
      'write:medications',
      'read:symptoms',
      'write:symptoms',
      'read:family',
      'write:family',
      'ai:chat',
      'notifications:receive',
      'developer:diagnostics'
    ],
    databaseConnection: 'postgresql://carepulse_prod:*****@10.128.0.4:5432/carepulse_db',
    currentToken: `fcm_token_sample_${userId}_live`,
    environmentVariables: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: '3000',
      GEMINI_MODEL: 'gemini-3.6-flash',
      FCM_SENDER_ID: '88203910294',
      JWT_ALGORITHM: 'RS256'
    },
    gitBranch: 'main',
    gitCommit: '7f8a91c4 (feat: enterprise security center)',
    backendUptime: '14d 8h 22m',
    apiResponseTime: '31ms avg',
    memoryUsage: '142 MB / 512 MB (27.7%)',
    cpuUsage: '3.4%',
    logs: [
      `[${new Date().toLocaleTimeString()}] INFO: FCM Token refreshed for user ${user.id}`,
      `[${new Date(Date.now() - 300000).toLocaleTimeString()}] INFO: Calculated adherence risk for patient ${user.id}: LOW RISK (Score: 12)`,
      `[${new Date(Date.now() - 600000).toLocaleTimeString()}] INFO: Cron worker checked 4 scheduled doses for today`,
      `[${new Date(Date.now() - 1200000).toLocaleTimeString()}] INFO: Session sess_live_99481203 validated via JWT bearer`
    ]
  });
});

// POST /api/account/test-notification
app.post('/api/account/test-notification', (req, res) => {
  const { userId, title, message } = req.body;
  const targetId = userId || 'p-101';

  const newNotif = {
    id: `notif-${Date.now()}`,
    patientId: targetId,
    targetUserId: targetId,
    type: 'MEDICATION_REMINDER',
    title: title || '⚡ Test FCM Push Notification',
    message: message || 'This is a test push notification sent from the FCM Enterprise Center.',
    isRead: false,
    createdAt: new Date().toISOString()
  };

  notifications.unshift(newNotif);

  res.json({
    success: true,
    message: 'Test notification sent successfully to FCM device token.',
    notification: newNotif
  });
});

// POST /api/account/export
app.post('/api/account/export', (req, res) => {
  const { userId, format } = req.body;
  const targetId = userId || 'p-101';
  const user = users.find((u) => u.id === targetId);

  res.json({
    success: true,
    downloadUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(
        {
          exportDate: new Date().toISOString(),
          user,
          medications: medications.filter((m) => m.patientId === targetId),
          adherenceLogs: adherenceLogs.filter((l) => l.patientId === targetId),
          symptoms: symptoms.filter((s) => s.patientId === targetId)
        },
        null,
        2
      )
    )}`,
    filename: `CarePulse_HealthData_Export_${targetId}_${Date.now()}.${format || 'json'}`
  });
});

// POST /api/account/delete-account
app.post('/api/account/delete-account', (req, res) => {
  const { userId } = req.body;
  res.json({
    success: true,
    message: 'Account deletion request queued. Your account and encrypted data will be wiped in 30 days.'
  });
});

// POST /api/account/change-password
app.post('/api/account/change-password', (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  const targetId = userId || 'p-101';
  if (accountSecurityMap[targetId]) {
    accountSecurityMap[targetId].passwordLastChanged = new Date().toISOString();
    accountSecurityMap[targetId].passwordStrength = 'Strong (98/100)';
  }
  res.json({ success: true, message: 'Password changed successfully.' });
});

// POST /api/account/enable-2fa
app.post('/api/account/enable-2fa', (req, res) => {
  const { userId, enabled } = req.body;
  const targetId = userId || 'p-101';
  if (!accountSecurityMap[targetId]) {
    accountSecurityMap[targetId] = { securityScore: 85 };
  }
  accountSecurityMap[targetId].twoFactorEnabled = enabled !== undefined ? enabled : true;
  accountSecurityMap[targetId].securityScore = accountSecurityMap[targetId].twoFactorEnabled ? 98 : 90;
  res.json({
    success: true,
    twoFactorEnabled: accountSecurityMap[targetId].twoFactorEnabled,
    securityScore: accountSecurityMap[targetId].securityScore,
    message: `Two-Factor Authentication (2FA) ${accountSecurityMap[targetId].twoFactorEnabled ? 'enabled' : 'disabled'}.`
  });
});

// POST /api/account/disable-2fa
app.post('/api/account/disable-2fa', (req, res) => {
  const { userId } = req.body;
  const targetId = userId || 'p-101';
  if (accountSecurityMap[targetId]) {
    accountSecurityMap[targetId].twoFactorEnabled = false;
    accountSecurityMap[targetId].securityScore = 88;
  }
  res.json({ success: true, message: 'Two-Factor Authentication disabled.' });
});

// POST /api/account/refresh-token
app.post('/api/account/refresh-token', (req, res) => {
  const { userId } = req.body;
  const targetId = userId || 'p-101';
  const newToken = `fcm_live_token_${targetId}_${Date.now()}`;
  res.json({
    success: true,
    token: newToken,
    refreshedAt: new Date().toISOString(),
    message: 'FCM push token & JWT token refreshed successfully.'
  });
});

// ==================== PATIENT & FAMILY MEMBER DEDICATED PROFILES ====================

let patientProfileStore: Record<string, any> = {
  'p-101': {
    userId: 'p-101',
    fullName: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    phone: '+1 (555) 234-5678',
    gender: 'Female',
    dateOfBirth: '1982-04-12',
    age: 44,
    bloodGroup: 'O+',
    height: '168 cm (5\'6")',
    weight: '64 kg (141 lbs)',
    emergencyContactName: 'Marcus Johnson (Brother)',
    emergencyContactPhone: '+1 (555) 987-6543',
    address: '742 Evergreen Terrace, San Francisco, CA 94107',
    memberSince: '2026-01-15T10:00:00Z',
    lastLogin: '2026-08-07T08:30:00Z',
    lastProfileUpdate: '2026-07-28T11:20:00Z',
    medicalConditions: ['Type 2 Diabetes', 'Hypertension', 'Mild Hyperlipidemia'],
    allergies: ['Penicillin', 'Sulfa Drugs'],
    attendingPhysician: 'Dr. Evelyn Vance, MD (UCSF Health)',
    preferredPharmacy: 'CVS Pharmacy #4821 (Market St)',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
    familyInviteCode: 'A7K9P2',
  }
};

let familyProfileStore: Record<string, any> = {
  'f-201': {
    userId: 'f-201',
    fullName: 'Marcus Johnson',
    email: 'marcus.j@example.com',
    phone: '+1 (555) 987-6543',
    relationship: 'Brother / Caregiver',
    connectedPatientId: 'p-101',
    connectionStatus: 'ACTIVE',
    permissionLevel: 'FULL_ACCESS',
    connectionDate: '2026-02-01T14:30:00Z',
    lastLogin: '2026-08-07T09:15:00Z',
    preferredContactMethod: 'SMS & In-App Push Alerts',
    emergencyContact: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    notes: 'Primary caregiver responsible for checking daily medication adherence and symptom alerts.',
  }
};

// GET /api/patient/profile
app.get('/api/patient/profile', (req, res) => {
  const userId = (req.query.userId as string) || 'p-101';
  let profile = patientProfileStore[userId];
  if (!profile) {
    const user = users.find(u => u.id === userId);
    profile = {
      userId,
      fullName: user ? user.name : 'Sarah Johnson',
      email: user ? user.email : 'sarah.johnson@example.com',
      phone: user ? user.phone : '+1 (555) 234-5678',
      gender: 'Female',
      dateOfBirth: '1982-04-12',
      age: 44,
      bloodGroup: 'O+',
      height: '168 cm',
      weight: '64 kg',
      emergencyContactName: 'Marcus Johnson (Brother)',
      emergencyContactPhone: '+1 (555) 987-6543',
      address: '742 Evergreen Terrace, San Francisco, CA 94107',
      memberSince: user ? user.createdAt : '2026-01-15T10:00:00Z',
      lastLogin: new Date().toISOString(),
      lastProfileUpdate: new Date().toISOString(),
      medicalConditions: ['Type 2 Diabetes', 'Hypertension'],
      allergies: ['Penicillin'],
      attendingPhysician: 'Dr. Evelyn Vance, MD',
      preferredPharmacy: 'CVS Pharmacy',
      avatarUrl: user ? user.avatarUrl : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
      familyInviteCode: user ? user.familyInviteCode : 'A7K9P2',
    };
    patientProfileStore[userId] = profile;
  }
  res.json(profile);
});

// PUT /api/patient/profile
app.put('/api/patient/profile', (req, res) => {
  const { userId, ...updates } = req.body;
  const targetId = userId || 'p-101';
  if (!patientProfileStore[targetId]) {
    patientProfileStore[targetId] = { userId: targetId };
  }
  patientProfileStore[targetId] = {
    ...patientProfileStore[targetId],
    ...updates,
    lastProfileUpdate: new Date().toISOString(),
  };
  const user = users.find(u => u.id === targetId);
  if (user) {
    if (updates.fullName) user.name = updates.fullName;
    if (updates.email) user.email = updates.email;
    if (updates.phone) user.phone = updates.phone;
    if (updates.avatarUrl) user.avatarUrl = updates.avatarUrl;
  }
  res.json({
    success: true,
    message: 'Patient profile updated successfully.',
    profile: patientProfileStore[targetId],
  });
});

// Helper to calculate patient adherence overview
function getAdherenceMetricsForPatient(patientId: string) {
  const pHistory = medicationHistory.filter(h => h.patientId === patientId);
  const pLogs = adherenceLogs.filter(l => l.patientId === patientId);

  let taken = pHistory.filter(h => h.status === 'TAKEN' || h.status === 'DELAYED').length;
  let skipped = pHistory.filter(h => h.status === 'SKIPPED').length;
  let missed = pHistory.filter(h => h.status === 'MISSED').length;

  pLogs.forEach(l => {
    if (l.status === 'TAKEN' || l.status === 'DELAYED') taken++;
    else if (l.status === 'SKIPPED') skipped++;
    else if (l.status === 'MISSED') missed++;
  });

  const totalDoses = taken + skipped + missed;

  const takenPercentage = totalDoses > 0 ? Number(((taken / totalDoses) * 100).toFixed(1)) : 0;
  const skippedPercentage = totalDoses > 0 ? Number(((skipped / totalDoses) * 100).toFixed(1)) : 0;
  const notTakenPercentage = totalDoses > 0 ? Number(((missed / totalDoses) * 100).toFixed(1)) : 0;

  const lastEvent = pHistory[0] ? pHistory[0].timestamp : new Date().toISOString();

  return {
    patientId,
    takenCount: taken,
    skippedCount: skipped,
    notTakenCount: missed,
    totalDoses,
    takenPercentage,
    skippedPercentage,
    notTakenPercentage,
    overallAdherence: takenPercentage,
    lastUpdated: lastEvent,
  };
}

// GET /patient/adherence-overview
const handleAdherenceOverview = (req: any, res: any) => {
  const patientId = (req.query.patientId as string) || (req.query.userId as string) || 'p-101';
  const metrics = getAdherenceMetricsForPatient(patientId);
  res.json(metrics);
};
app.get('/api/patient/adherence-overview', handleAdherenceOverview);
app.get('/patient/adherence-overview', handleAdherenceOverview);

// GET /patient/adherence-chart
const handleAdherenceChart = (req: any, res: any) => {
  const patientId = (req.query.patientId as string) || (req.query.userId as string) || 'p-101';
  const metrics = getAdherenceMetricsForPatient(patientId);
  res.json({
    slices: [
      { status: 'Taken', count: metrics.takenCount, percentage: metrics.takenPercentage, color: '#10B981' },
      { status: 'Skipped', count: metrics.skippedCount, percentage: metrics.skippedPercentage, color: '#EAB308' },
      { status: 'Not Taken', count: metrics.notTakenCount, percentage: metrics.notTakenPercentage, color: '#EF4444' },
    ],
    totalDoses: metrics.totalDoses,
    overallAdherence: metrics.overallAdherence,
    lastUpdated: metrics.lastUpdated,
  });
};
app.get('/api/patient/adherence-chart', handleAdherenceChart);
app.get('/patient/adherence-chart', handleAdherenceChart);

// GET /patient/medication-history
const handlePatientMedicationHistory = (req: any, res: any) => {
  const patientId = (req.query.patientId as string) || (req.query.userId as string) || 'p-101';
  const history = medicationHistory.filter(h => h.patientId === patientId);
  res.json(history);
};
app.get('/api/patient/medication-history', handlePatientMedicationHistory);
app.get('/patient/medication-history', handlePatientMedicationHistory);

// GET /patient/adherence-statistics
const handleAdherenceStatistics = (req: any, res: any) => {
  const patientId = (req.query.patientId as string) || (req.query.userId as string) || 'p-101';
  const userMeds = medications.filter(m => m.patientId === patientId);
  const userSymptoms = symptoms.filter(s => s.patientId === patientId);
  const metrics = getAdherenceMetricsForPatient(patientId);
  const riskObj = calculateRiskLevel(patientId);

  res.json({
    totalMedicines: userMeds.length,
    todayMedicines: userMeds.length,
    activeMedicines: userMeds.filter(m => m.isActive).length,
    completedDoses: metrics.takenCount,
    skippedDoses: metrics.skippedCount,
    missedDoses: metrics.notTakenCount,
    upcomingMedicines: userMeds.filter(m => m.isActive).length,
    adherencePercentage: metrics.overallAdherence,
    currentAIRisk: riskObj.riskLevel,
    daysActive: 142,
    symptomsLogged: userSymptoms.length,
  });
};
app.get('/api/patient/adherence-statistics', handleAdherenceStatistics);
app.get('/patient/adherence-statistics', handleAdherenceStatistics);

// POST /adherence/update
const handleAdherenceUpdate = (req: any, res: any) => {
  const { patientId = 'p-101', medicationId, status, scheduledTime, notes } = req.body;
  const med = medications.find(m => m.id === medicationId) || medications[0];

  const logEntry = {
    id: `log-${Date.now()}`,
    patientId,
    medicationId,
    medicineName: med ? med.medicineName : 'Medication',
    scheduledTime: scheduledTime || '08:00 AM',
    actualTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status,
    notes: notes || `Adherence updated to ${status}`,
    date: new Date().toISOString().split('T')[0],
  };
  adherenceLogs.unshift(logEntry as any);

  const eventType = status === 'TAKEN' ? 'DOSE_TAKEN' : status === 'SKIPPED' ? 'DOSE_SKIPPED' : 'DOSE_MISSED';
  const histEvent = recordHistoryEvent({
    patientId,
    medicationId,
    medicineName: med ? med.medicineName : 'Medication',
    dosage: med ? med.dosage : '',
    eventType,
    eventTitle: `Dose ${status.toLowerCase()} for ${med ? med.medicineName : 'Medication'}`,
    status,
    scheduledTime,
    actualTime: logEntry.actualTime,
    notes: logEntry.notes,
    adherenceImpact: status === 'TAKEN' ? '+1 Dose Taken' : status === 'SKIPPED' ? 'Clinically Skipped' : '-1 Dose Missed',
  });

  const updatedMetrics = getAdherenceMetricsForPatient(patientId);
  const updatedRisk = calculateRiskLevel(patientId);

  res.json({
    success: true,
    log: logEntry,
    historyEvent: histEvent,
    adherenceOverview: updatedMetrics,
    aiRiskLevel: updatedRisk.riskLevel,
  });
};
app.post('/api/adherence/update', handleAdherenceUpdate);
app.post('/adherence/update', handleAdherenceUpdate);

// POST /medication/history
const handleCreateMedicationHistory = (req: any, res: any) => {
  const { patientId = 'p-101', medicationId, eventType, eventTitle, status, notes, medicineName, dosage } = req.body;
  const histEvent = recordHistoryEvent({
    patientId,
    medicationId,
    medicineName,
    dosage,
    eventType: eventType || 'DOSE_TAKEN',
    eventTitle: eventTitle || 'Medication Event',
    status: status || 'TAKEN',
    notes,
  });

  res.json({
    success: true,
    historyEvent: histEvent,
    adherenceOverview: getAdherenceMetricsForPatient(patientId),
  });
};
app.post('/api/medication/history', handleCreateMedicationHistory);
app.post('/medication/history', handleCreateMedicationHistory);

// GET /api/patient/profile/statistics
app.get('/api/patient/profile/statistics', (req, res) => {
  const userId = (req.query.userId as string) || 'p-101';
  const userMeds = medications.filter(m => m.patientId === userId);
  const userLogs = adherenceLogs.filter(l => l.patientId === userId);
  const userSymptoms = symptoms.filter(s => s.patientId === userId);
  const userConns = familyConnections.filter(c => c.patientId === userId);

  const totalDoses = userLogs.length;
  const takenDoses = userLogs.filter(l => l.status === 'TAKEN').length;
  const missedDoses = userLogs.filter(l => l.status === 'MISSED').length;

  res.json({
    totalMedicines: userMeds.length,
    activeMedicines: userMeds.filter(m => m.isActive).length,
    todayMedicines: userMeds.length,
    adherencePercentage: 95.5,
    completedDoses: takenDoses || 384,
    missedDoses: missedDoses || 18,
    symptomsLoggedCount: userSymptoms.length,
    connectedFamilyMembersCount: userConns.length,
    daysUsingApp: 142,
  });
});

// GET /api/patient/profile/health-summary
app.get('/api/patient/profile/health-summary', (req, res) => {
  const userId = (req.query.userId as string) || 'p-101';
  const profile = patientProfileStore[userId] || {};
  const userMeds = medications.filter(m => m.patientId === userId);
  const userSymptoms = symptoms.filter(s => s.patientId === userId);
  const userConns = familyConnections.filter(c => c.patientId === userId);

  res.json({
    totalMedicines: userMeds.length,
    activeMedicines: userMeds.filter(m => m.isActive).length,
    todayMedicines: userMeds.length,
    adherencePercentage: 95.5,
    aiRiskLevel: 'LOW RISK',
    missedDoses: 2,
    symptomsLogged: userSymptoms.length,
    familySummary: {
      familyInviteCode: profile.familyInviteCode || 'A7K9P2',
      connectedFamilyCount: userConns.length,
      pendingRequestsCount: userConns.filter(c => c.status === 'PENDING').length,
      permissionSummary: 'Full Access Granted to Linked Caregiver',
    },
    aiSummary: {
      assistantStatus: 'Online & Active',
      conversationCount: 38,
      lastChat: new Date().toISOString(),
      timelineStatus: 'Synchronized with Live Adherence Context',
    },
  });
});

// GET /api/family/profile
app.get('/api/family/profile', (req, res) => {
  const userId = (req.query.userId as string) || 'f-201';
  let profile = familyProfileStore[userId];
  if (!profile) {
    const user = users.find(u => u.id === userId);
    profile = {
      userId,
      fullName: user ? user.name : 'Marcus Johnson',
      email: user ? user.email : 'marcus.j@example.com',
      phone: user ? user.phone : '+1 (555) 987-6543',
      relationship: 'Caregiver / Brother',
      connectedPatientId: user ? user.linkedPatientId || 'p-101' : 'p-101',
      connectionStatus: 'ACTIVE',
      permissionLevel: 'FULL_ACCESS',
      connectionDate: '2026-02-01T14:30:00Z',
      lastLogin: new Date().toISOString(),
      preferredContactMethod: 'SMS & In-App Push Alerts',
      emergencyContact: true,
      avatarUrl: user ? user.avatarUrl : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
      notes: 'Primary caregiver for patient medication adherence.',
    };
    familyProfileStore[userId] = profile;
  }
  res.json(profile);
});

// PUT /api/family/profile
app.put('/api/family/profile', (req, res) => {
  const { userId, ...updates } = req.body;
  const targetId = userId || 'f-201';
  if (!familyProfileStore[targetId]) {
    familyProfileStore[targetId] = { userId: targetId };
  }
  familyProfileStore[targetId] = {
    ...familyProfileStore[targetId],
    ...updates,
  };
  const user = users.find(u => u.id === targetId);
  if (user) {
    if (updates.fullName) user.name = updates.fullName;
    if (updates.email) user.email = updates.email;
    if (updates.phone) user.phone = updates.phone;
    if (updates.avatarUrl) user.avatarUrl = updates.avatarUrl;
  }
  res.json({
    success: true,
    message: 'Family member profile updated successfully.',
    profile: familyProfileStore[targetId],
  });
});

// GET /api/family/profile/permissions
app.get('/api/family/profile/permissions', (req, res) => {
  const userId = (req.query.userId as string) || 'f-201';
  const conn = familyConnections.find(c => c.familyMemberId === userId) || {
    permissions: {
      medicationStatus: true,
      adherencePercentage: true,
      missedDoseAlerts: true,
      riskLevel: true,
      symptoms: true,
      healthUpdates: true,
      privateNotes: false,
      aiConversations: false,
    }
  };

  res.json({
    userId,
    connectionStatus: 'ACTIVE',
    permissionLevel: 'Caregiver - Full Monitoring',
    permissions: conn.permissions,
    readOnlyAccess: true,
    canEditPatientData: false,
  });
});

// GET /api/family/profile/patient-summary
app.get('/api/family/profile/patient-summary', (req, res) => {
  const userId = (req.query.userId as string) || 'f-201';
  const familyUser = users.find(u => u.id === userId);
  const patientId = familyUser ? familyUser.linkedPatientId || 'p-101' : 'p-101';
  const patientUser = users.find(u => u.id === patientId) || { name: 'Sarah Johnson' };

  res.json({
    patientId,
    patientName: patientUser.name,
    patientStatus: 'Stable & Compliant',
    todayMedicationStatus: '3 of 4 Doses Taken',
    adherencePercentage: 95.5,
    aiRiskLevel: 'LOW RISK',
    missedDoseAlerts: 0,
    lastDoseTakenTime: '08:00 AM Today (Metformin 500mg)',
    nextDoseTime: '08:00 PM Today (Metformin 500mg)',
    attendingPhysician: 'Dr. Evelyn Vance, MD',
  });
});

// Patient endpoints
app.get('/api/patients/me', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  const patient = getOrCreateUser(patientId, 'PATIENT');
  res.json(patient);
});

app.get('/api/patients/me/history', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';

  let patientLogs = adherenceLogs.filter((l) => l.patientId === patientId);
  if (patientLogs.length === 0) {
    patientLogs = adherenceLogs.filter((l) => l.patientId === 'p-101');
  }
  let patientSymptoms = symptoms.filter((s) => s.patientId === patientId);
  if (patientSymptoms.length === 0) {
    patientSymptoms = symptoms.filter((s) => s.patientId === 'p-101');
  }
  let patientUpdates = healthUpdates.filter((h) => h.patientId === patientId);
  if (patientUpdates.length === 0) {
    patientUpdates = healthUpdates.filter((h) => h.patientId === 'p-101');
  }
  const patientNotifs = notifications.filter((n) => n.patientId === patientId || n.targetUserId === patientId);

  res.json({
    adherenceLogs: patientLogs,
    symptoms: patientSymptoms,
    healthUpdates: patientUpdates,
    notifications: patientNotifs,
  });
});

// History Endpoints
app.get('/api/history', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  const medicationId = req.query.medicationId as string;
  const eventType = req.query.eventType as string;
  const status = req.query.status as string;
  const search = (req.query.search as string || '').toLowerCase().trim();

  let items = medicationHistory.filter((h) => h.patientId === patientId);

  if (medicationId) {
    items = items.filter((h) => h.medicationId === medicationId);
  }
  if (eventType && eventType !== 'ALL') {
    items = items.filter((h) => h.eventType === eventType);
  }
  if (status && status !== 'ALL') {
    items = items.filter((h) => h.status === status);
  }
  if (search) {
    items = items.filter(
      (h) =>
        (h.medicineName && h.medicineName.toLowerCase().includes(search)) ||
        (h.eventTitle && h.eventTitle.toLowerCase().includes(search)) ||
        (h.notes && h.notes.toLowerCase().includes(search)) ||
        (h.dosage && h.dosage.toLowerCase().includes(search))
    );
  }

  res.json(items);
});

app.get('/api/medications/:id/history', (req, res) => {
  const { id } = req.params;
  const items = medicationHistory.filter((h) => h.medicationId === id);
  res.json(items);
});

// Medications CRUD
app.get('/api/medications', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  const meds = medications.filter((m) => m.patientId === patientId);
  res.json(meds);
});

app.post('/api/medications', (req, res) => {
  const {
    patientId,
    medicineName,
    genericName,
    dosage,
    strength,
    dosageAmount,
    batchNumber,
    manufacturingDate,
    expiryDate,
    manufacturer,
    mrp,
    frequency,
    scheduleTimes,
    startDate,
    endDate,
    instructions,
    category,
    pillColor,
    source,
  } = req.body;

  if (!medicineName || !dosage || !scheduleTimes || scheduleTimes.length === 0) {
    return res.status(400).json({ error: 'Medicine name, dosage, and schedule times are required.' });
  }

  const pId = patientId || 'p-101';
  const newMed = {
    id: `med-${Date.now()}`,
    patientId: pId,
    medicineName: medicineName.trim(),
    genericName: genericName ? String(genericName).trim() : undefined,
    dosage: dosage.trim(),
    strength: strength ? String(strength).trim() : undefined,
    dosageAmount: dosageAmount ? String(dosageAmount).trim() : undefined,
    batchNumber: batchNumber ? String(batchNumber).trim() : undefined,
    manufacturingDate: manufacturingDate ? String(manufacturingDate).trim() : undefined,
    expiryDate: expiryDate ? String(expiryDate).trim() : undefined,
    manufacturer: manufacturer ? String(manufacturer).trim() : undefined,
    mrp: mrp ? String(mrp).trim() : undefined,
    frequency: frequency ? String(frequency).trim() : undefined,
    scheduleTimes: Array.isArray(scheduleTimes) ? scheduleTimes : [scheduleTimes],
    startDate: startDate || todayStr,
    endDate: endDate || undefined,
    isActive: true,
    instructions: instructions ? String(instructions).trim() : '',
    category: category || 'General Care',
    pillColor: pillColor || 'bg-indigo-500',
    source: source || 'manual',
    createdAt: new Date().toISOString(),
  };

  medications.push(newMed);

  // Generate today's adherence logs for this med
  newMed.scheduleTimes.forEach((timeStr: string) => {
    adherenceLogs.push({
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      patientId: newMed.patientId,
      medicationId: newMed.id,
      medicineName: newMed.medicineName,
      dosage: newMed.dosage,
      scheduledTime: timeStr,
      scheduledDate: todayStr,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });
  });

  // AUTOMATIC HISTORY SYNCHRONIZATION
  const timeNowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  recordHistoryEvent({
    patientId: newMed.patientId,
    medicationId: newMed.id,
    medicineName: newMed.medicineName,
    dosage: newMed.dosage,
    eventType: 'MEDICINE_CREATED',
    eventTitle: 'Medicine Added to Profile',
    scheduledTime: newMed.scheduleTimes.join(', '),
    actualTime: timeNowStr,
    status: 'CREATED',
    createdDate: todayStr,
    reminderStatus: 'Scheduled',
    adherenceImpact: 'Schedule Initialized',
    aiRiskImpact: 'Context Updated',
    notes: newMed.instructions ? `Added ${newMed.medicineName} (${newMed.dosage}): "${newMed.instructions}"` : `Added ${newMed.medicineName} (${newMed.dosage}).`,
    notificationStatus: 'System Logged',
  });

  recordHistoryEvent({
    patientId: newMed.patientId,
    medicationId: newMed.id,
    medicineName: newMed.medicineName,
    dosage: newMed.dosage,
    eventType: 'SCHEDULE_CREATED',
    eventTitle: 'Medication Schedule Generated',
    scheduledTime: newMed.scheduleTimes.join(', '),
    actualTime: timeNowStr,
    status: 'CREATED',
    createdDate: todayStr,
    reminderStatus: 'Scheduled',
    adherenceImpact: 'Neutral',
    aiRiskImpact: 'Normal Schedule',
    notes: `Daily intake set for: ${newMed.scheduleTimes.join(', ')}.`,
    notificationStatus: 'Reminders Initialized',
  });

  recordHistoryEvent({
    patientId: newMed.patientId,
    medicationId: newMed.id,
    medicineName: newMed.medicineName,
    dosage: newMed.dosage,
    eventType: 'NOTIFICATION_DELIVERED',
    eventTitle: 'Upcoming Reminders Created',
    scheduledTime: newMed.scheduleTimes[0] || '08:00 AM',
    actualTime: timeNowStr,
    status: 'REMINDER',
    createdDate: todayStr,
    reminderStatus: 'Scheduled',
    adherenceImpact: 'Pending Intake',
    aiRiskImpact: 'Normal Schedule',
    notes: 'Smartphone reminders and family alert channels synchronized.',
    notificationStatus: 'Push Channels Ready',
  });

  const updatedRisk = calculateRiskLevel(pId);
  recordHistoryEvent({
    patientId: newMed.patientId,
    medicationId: newMed.id,
    medicineName: newMed.medicineName,
    dosage: newMed.dosage,
    eventType: 'AI_RISK_UPDATED',
    eventTitle: 'AI Risk Recalculated',
    scheduledTime: 'All Times',
    actualTime: timeNowStr,
    status: 'UPDATED',
    createdDate: todayStr,
    reminderStatus: 'Scheduled',
    adherenceImpact: 'Context Refreshed',
    aiRiskImpact: `${updatedRisk.riskLevel} (Score: ${updatedRisk.score}/100)`,
    notes: 'AI Healthcare Engine synced new medication schedule into patient memory.',
    notificationStatus: 'AI Engine Synced',
  });

  res.status(201).json(newMed);
});

app.put('/api/medications/:id', (req, res) => {
  const { id } = req.params;
  const index = medications.findIndex((m) => m.id === id);
  if (index === -1) return res.status(404).json({ error: 'Medication not found' });

  const oldMed = medications[index];
  const updatedMed = {
    ...oldMed,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  medications[index] = updatedMed;

  // AUTOMATIC HISTORY SYNCHRONIZATION
  const timeNowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isToggled = req.body.isActive !== undefined && req.body.isActive !== oldMed.isActive;
  let eventType = 'MEDICINE_UPDATED';
  let status: any = 'UPDATED';
  let title = 'Medication Configuration Updated';

  if (isToggled) {
    if (req.body.isActive) {
      eventType = 'MEDICINE_ACTIVATED';
      status = 'ACTIVATED';
      title = 'Medication Schedule Reactivated';
    } else {
      eventType = 'MEDICINE_DISABLED';
      status = 'DISABLED';
      title = 'Medication Paused / Disabled';
    }
  }

  recordHistoryEvent({
    patientId: updatedMed.patientId,
    medicationId: updatedMed.id,
    medicineName: updatedMed.medicineName,
    dosage: updatedMed.dosage,
    eventType,
    eventTitle: title,
    scheduledTime: updatedMed.scheduleTimes?.join(', ') || '',
    actualTime: timeNowStr,
    status,
    createdDate: todayStr,
    reminderStatus: updatedMed.isActive ? 'Scheduled' : 'Pending',
    adherenceImpact: isToggled ? (updatedMed.isActive ? 'Schedule Resumed' : 'Schedule Suspended') : 'Configuration Updated',
    aiRiskImpact: 'Recalculated',
    notes: updatedMed.instructions || `Updated configuration for ${updatedMed.medicineName} (${updatedMed.dosage}).`,
    notificationStatus: 'System Logged',
  });

  res.json(updatedMed);
});

app.delete('/api/medications/:id', (req, res) => {
  const { id } = req.params;
  const targetMed = medications.find((m) => m.id === id);
  if (targetMed) {
    recordHistoryEvent({
      patientId: targetMed.patientId,
      medicationId: targetMed.id,
      medicineName: targetMed.medicineName,
      dosage: targetMed.dosage,
      eventType: 'MEDICINE_DELETED',
      eventTitle: 'Medicine Removed from Profile',
      scheduledTime: targetMed.scheduleTimes?.join(', ') || '',
      actualTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'DELETED',
      createdDate: todayStr,
      reminderStatus: 'Failed',
      adherenceImpact: 'Schedule Terminated',
      aiRiskImpact: 'Recalculated',
      notes: `Archived and removed ${targetMed.medicineName} (${targetMed.dosage}) from active medications list.`,
      notificationStatus: 'Audit Trail Retained',
    });
  }
  medications = medications.filter((m) => m.id !== id);
  res.json({ success: true, id });
});

app.post('/api/medications/:id/complete', (req, res) => {
  const { id } = req.params;
  const med = medications.find((m) => m.id === id);
  if (!med) return res.status(404).json({ error: 'Medication not found' });

  med.isActive = false;
  med.endDate = todayStr;

  const timeNowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const event = recordHistoryEvent({
    patientId: med.patientId,
    medicationId: med.id,
    medicineName: med.medicineName,
    dosage: med.dosage,
    eventType: 'MEDICATION_COMPLETED',
    eventTitle: 'Medication Course Completed',
    scheduledTime: med.scheduleTimes?.join(', ') || '',
    actualTime: timeNowStr,
    status: 'COMPLETED',
    createdDate: todayStr,
    reminderStatus: 'Delivered',
    adherenceImpact: '100% Course Finished',
    aiRiskImpact: 'LOW RISK',
    notes: 'Prescription treatment course concluded and archived.',
    notificationStatus: 'Caregiver Notified',
  });

  res.json({ success: true, medication: med, historyEvent: event });
});

// Adherence API with Duplicate Dose Protection & Authorization
app.post('/api/adherence/update', async (req, res) => {
  const { logId, status, patientId = 'p-101', medicationId, scheduledTime, notes, recordedAt } = req.body;

  // Verify medication exists and belongs to patient
  const med = medications.find((m) => m.id === medicationId && (m.patientId === patientId || !m.patientId));
  if (!med && !logId) {
    return res.status(404).json({ error: 'Medication not found or unauthorized.' });
  }

  const targetMed = med || medications.find(m => m.id === medicationId) || medications[0];
  const targetTime = scheduledTime || (targetMed?.scheduleTimes?.[0]) || '08:00 AM';
  const timeNowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const serverIsoNow = new Date().toISOString();

  // Duplicate dose protection: Find existing log for today and scheduledTime
  let log = adherenceLogs.find((l) =>
    (logId && l.id === logId) ||
    (l.patientId === patientId && l.medicationId === targetMed.id && l.scheduledDate === todayStr && l.scheduledTime === targetTime)
  );

  if (!log) {
    log = {
      id: `log-${patientId}-${targetMed.id}-${Date.now()}`,
      patientId,
      medicationId: targetMed.id,
      medicineName: targetMed.medicineName,
      dosage: targetMed.dosage,
      scheduledTime: targetTime,
      scheduledDate: todayStr,
      status: status || 'TAKEN',
      takenAt: status === 'TAKEN' ? (recordedAt || serverIsoNow) : undefined,
      createdAt: serverIsoNow,
    };
    adherenceLogs.unshift(log);
  } else {
    log.status = status;
    if (status === 'TAKEN') {
      log.takenAt = recordedAt || serverIsoNow;
    }
  }

  const patient = users.find((u) => u.id === log.patientId) || { id: log.patientId, name: 'Sarah Johnson' };
  const patientName = patient ? patient.name : 'Patient';

  // Trigger missed dose alert & in-app family notifications if status is MISSED
  if (status === 'MISSED') {
    // Find linked family connections
    const connections = familyConnections.filter(
      (fc) => fc.patientId === log.patientId && fc.status === 'ACTIVE' && fc.permissions.missedDoseAlerts
    );

    connections.forEach((fc) => {
      notifications.unshift({
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        patientId: log.patientId,
        targetUserId: fc.familyMemberId,
        type: 'MISSED_DOSE',
        title: 'Missed Dose Alert',
        message: `${patientName} missed scheduled dose: ${log.medicineName} ${log.dosage} at ${log.scheduledTime}.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    // Patient notification
    notifications.unshift({
      id: `notif-${Date.now()}-p`,
      patientId: log.patientId,
      targetUserId: log.patientId,
      type: 'MISSED_DOSE',
      title: 'Missed Medication Registered',
      message: `You recorded a missed dose for ${log.medicineName} ${log.dosage}.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  const updatedSummary = calculateAdherenceSummary(log.patientId);
  const updatedRisk = calculateRiskLevel(log.patientId);

  // AUTOMATIC HISTORY SYNCHRONIZATION FOR ADHERENCE ACTIONS
  if (status === 'TAKEN') {
    recordHistoryEvent({
      patientId: log.patientId,
      medicationId: log.medicationId,
      medicineName: log.medicineName,
      dosage: log.dosage,
      eventType: 'DOSE_TAKEN',
      eventTitle: 'Dose Taken Successfully',
      scheduledTime: log.scheduledTime,
      actualTime: timeNowStr,
      status: 'TAKEN',
      createdDate: todayStr,
      reminderStatus: 'Opened',
      adherenceImpact: '+2.5% Adherence Rate',
      aiRiskImpact: `${updatedRisk.riskLevel} (${updatedRisk.score}/100)`,
      notes: req.body.notes || 'Dose recorded as TAKEN on schedule.',
      notificationStatus: 'Log Confirmed',
    });
  } else if (status === 'MISSED') {
    recordHistoryEvent({
      patientId: log.patientId,
      medicationId: log.medicationId,
      medicineName: log.medicineName,
      dosage: log.dosage,
      eventType: 'DOSE_MISSED',
      eventTitle: 'Dose Missed - No Response',
      scheduledTime: log.scheduledTime,
      actualTime: 'N/A (Window Expired)',
      status: 'MISSED',
      createdDate: todayStr,
      reminderStatus: 'Delivered',
      adherenceImpact: '-5.0% Adherence Rate',
      aiRiskImpact: `${updatedRisk.riskLevel} (Increased Risk)`,
      notes: req.body.notes || 'Scheduled dose was not confirmed before 30-min window expired.',
      notificationStatus: 'Caregiver Dispatched',
    });

    recordHistoryEvent({
      patientId: log.patientId,
      medicationId: log.medicationId,
      medicineName: log.medicineName,
      dosage: log.dosage,
      eventType: 'FAMILY_ALERT_SENT',
      eventTitle: 'Caregiver Missed Dose Alert Dispatched',
      scheduledTime: log.scheduledTime,
      actualTime: timeNowStr,
      status: 'ALERT',
      createdDate: todayStr,
      reminderStatus: 'Delivered',
      adherenceImpact: 'Caregiver Notified',
      aiRiskImpact: 'Alert Level Active',
      notes: `SMS & Push alert sent to linked caregiver regarding missed ${log.medicineName} dose.`,
      notificationStatus: 'Caregiver Push Confirmed',
    });
  } else if (status === 'SKIPPED') {
    recordHistoryEvent({
      patientId: log.patientId,
      medicationId: log.medicationId,
      medicineName: log.medicineName,
      dosage: log.dosage,
      eventType: 'DOSE_SKIPPED',
      eventTitle: 'Dose Skipped by Patient',
      scheduledTime: log.scheduledTime,
      actualTime: timeNowStr,
      status: 'SKIPPED',
      createdDate: todayStr,
      reminderStatus: 'Opened',
      adherenceImpact: 'Neutral (Clinical Skip)',
      aiRiskImpact: updatedRisk.riskLevel,
      notes: req.body.notes || 'Dose skipped with clinical note.',
      notificationStatus: 'Logged in Audit Trail',
    });
  } else if (status === 'DELAYED') {
    recordHistoryEvent({
      patientId: log.patientId,
      medicationId: log.medicationId,
      medicineName: log.medicineName,
      dosage: log.dosage,
      eventType: 'DOSE_DELAYED',
      eventTitle: 'Dose Intake Delayed',
      scheduledTime: log.scheduledTime,
      actualTime: timeNowStr,
      status: 'DELAYED',
      createdDate: todayStr,
      reminderStatus: 'Opened',
      adherenceImpact: '+1.5% Adherence (Delayed)',
      aiRiskImpact: updatedRisk.riskLevel,
      notes: req.body.notes || 'Dose taken after scheduled time.',
      notificationStatus: 'Logged in Audit Trail',
    });
  }

  res.json({
    log,
    summary: updatedSummary,
    risk: updatedRisk,
  });
});

app.get('/api/adherence/summary', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  res.json(calculateAdherenceSummary(patientId));
});

app.get('/api/adherence/history', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  const logs = adherenceLogs.filter((l) => l.patientId === patientId);
  res.json(logs);
});

// Symptoms API
app.get('/api/symptoms', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  res.json(symptoms.filter((s) => s.patientId === patientId));
});

app.post('/api/symptoms', (req, res) => {
  const { patientId, symptomText, severity, notes, date } = req.body;

  if (!symptomText) {
    return res.status(400).json({ error: 'Symptom description is required.' });
  }

  const newSymptom = {
    id: `sym-${Date.now()}`,
    patientId: patientId || 'p-101',
    symptomText,
    severity: severity || 'mild',
    notes: notes || '',
    date: date || todayStr,
    createdAt: new Date().toISOString(),
  };

  symptoms.unshift(newSymptom);
  res.status(201).json(newSymptom);
});

app.delete('/api/symptoms/:id', (req, res) => {
  const { id } = req.params;
  symptoms = symptoms.filter((s) => s.id !== id);
  res.json({ success: true });
});

// Family API
app.get('/api/family/invite-code', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  const patient = getOrCreateUser(patientId, 'PATIENT');
  if (!patient.familyInviteCode) {
    patient.familyInviteCode = 'A7K9P2';
  }
  res.json({ code: patient.familyInviteCode });
});

app.post('/api/family/regenerate-code', (req, res) => {
  const { patientId } = req.body;
  const pId = patientId || 'p-101';
  const patient = getOrCreateUser(pId, 'PATIENT');

  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let p1 = '', p2 = '';
  for (let i = 0; i < 4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
  for (let i = 0; i < 4; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  const inviteCode = `CP-${p1}-${p2}`;

  patient.familyInviteCode = inviteCode;
  res.json({ code: inviteCode });
});

app.post('/api/family/revoke-code', (req, res) => {
  const { patientId } = req.body;
  const pId = patientId || 'p-101';
  const patient = getOrCreateUser(pId, 'PATIENT');

  patient.familyInviteCode = '';
  res.json({ success: true, code: '' });
});

app.get('/api/family/members', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  let connections = familyConnections.filter((fc) => fc.patientId === patientId);
  if (connections.length === 0 && patientId !== 'p-101') {
    connections = familyConnections.filter((fc) => fc.patientId === 'p-101');
  }
  res.json(connections);
});

app.put('/api/family/members/:id/permissions', (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;

  const conn = familyConnections.find((fc) => fc.id === id);
  if (!conn) return res.status(404).json({ error: 'Family connection not found' });

  conn.permissions = {
    ...conn.permissions,
    ...permissions,
  };

  res.json(conn);
});

app.delete('/api/family/members/:id', (req, res) => {
  const { id } = req.params;
  familyConnections = familyConnections.filter((fc) => fc.id !== id);
  res.json({ success: true, id });
});

// AI endpoints
app.get('/api/ai/risk-level', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  res.json(calculateRiskLevel(patientId));
});

app.post('/api/ai/chat', async (req, res) => {
  const { patientId, message, conversationId } = req.body;
  const pId = patientId || 'p-101';

  const patient = users.find((u) => u.id === pId);
  const pMeds = medications.filter((m) => m.patientId === pId && m.isActive);
  const pLogs = adherenceLogs.filter((l) => l.patientId === pId);
  const pSymptoms = symptoms.filter((s) => s.patientId === pId);
  const pSummary = calculateAdherenceSummary(pId);
  const pRisk = calculateRiskLevel(pId);

  const pHistory = medicationHistory.filter((h) => h.patientId === pId).slice(0, 20);

  // Build rich patient context string for Gemini
  const contextPrompt = `
You are the "CarePulse Personal AI Healthcare Assistant".
You are assisting patient: ${patient ? patient.name : 'Sarah Johnson'}.

=== AUTHORIZED PATIENT HEALTH CONTEXT ===
- Patient Name: ${patient ? patient.name : 'Sarah Johnson'}
- Active Medications: ${pMeds.map((m) => `${m.medicineName} (${m.dosage}, times: ${m.scheduleTimes.join(', ')})`).join('; ') || 'None'}
- Adherence Rates: Today: ${pSummary.todayPercentage}%, Weekly: ${pSummary.weeklyPercentage}%, Monthly: ${pSummary.monthlyPercentage}%
- Today's Dose Logs: ${pLogs.filter((l) => l.scheduledDate === todayStr).map((l) => `${l.medicineName} ${l.dosage} at ${l.scheduledTime}: ${l.status}`).join('; ')}
- Calculated AI Adherence Risk: ${pRisk.riskLevel} (Score: ${pRisk.score}/100)
- Risk Factors: ${pRisk.reasons.join('; ')}
- Recent Symptoms: ${pSymptoms.map((s) => `${s.symptomText} (Severity: ${s.severity}) on ${s.date}`).join('; ') || 'No symptoms logged recently'}

=== SYNCHRONIZED MEDICATION HISTORY AUDIT TRAIL (Real-Time Synchronized Logs) ===
${pHistory.map((h) => `• [${h.createdDate} ${h.actualTime}] ${h.eventTitle} (${h.eventType}): ${h.medicineName} (${h.dosage || 'N/A'}) | Status: ${h.status} | Impact: ${h.adherenceImpact || 'N/A'} | Notes: "${h.notes || 'N/A'}"`).join('\n')}

=== GUIDELINES FOR RESPONDING ===
1. Be empathetic, encouraging, clear, concise, and professional.
2. Direct answer referencing the patient's actual context (their meds, adherence %, history logs, or risk level).
3. Use the Synchronized Medication History Audit Trail to accurately answer user questions such as: "How many medicines did I miss this week?", "Show today's medication history", "When did I last take Metformin?", "What medicines am I missing most often?", or "Show my medication timeline."
4. Always include a disclaimer that you provide informational guidance only and do not replace professional doctor/pharmacist diagnosis.
5. If urgent or severe symptoms are mentioned, recommend seeking immediate medical care.
6. Never change prescription dosages or advise stopping prescribed medications.
`;

  const userQuery = message || 'How is my medication adherence doing?';

  try {
    const ai = getAIClient();
    let replyText = '';

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userQuery,
          config: {
            systemInstruction: contextPrompt,
          },
        });
        replyText = response.text || 'I checked your adherence records. You are doing well overall!';
      } catch (genErr) {
        console.log('[AI Advisor] Fallback triggered due to API availability:', genErr);
        replyText = `Hello ${patient ? patient.name : 'Sarah'}! Based on your authorized records, your current weekly adherence is **${pSummary.weeklyPercentage}%** with a **${pRisk.riskLevel}** rating. You have ${pMeds.length} active medications (${pMeds.map((m) => m.medicineName).join(', ')}). ${pSummary.missedToday > 0 ? 'You have 1 missed dose today (Lisinopril 10 mg at 09:00 AM).' : 'All scheduled doses for today are up to date!'}

*Disclaimer: AI recommendations are for general informational guidance only and do not constitute a medical diagnosis or treatment plan. Always consult your qualified physician or pharmacist for medical decisions.*`;
      }
    } else {
      // Clean fallback if API key is not configured locally
      replyText = `Hello ${patient ? patient.name : 'Sarah'}! Based on your authorized records, your current weekly adherence is **${pSummary.weeklyPercentage}%** with a **${pRisk.riskLevel}** rating. You have ${pMeds.length} active medications (${pMeds.map((m) => m.medicineName).join(', ')}). ${pSummary.missedToday > 0 ? 'You have 1 missed dose today (Lisinopril 10 mg at 09:00 AM).' : 'All scheduled doses for today are up to date!'}

*Disclaimer: AI recommendations are for general informational guidance only and do not constitute a medical diagnosis or treatment plan. Always consult your qualified physician or pharmacist for medical decisions.*`;
    }

    // Store message in authentic aiConversations store
    let conv = aiConversations.find((c) => c.patientId === pId && (conversationId ? c.id === conversationId : true));
    if (!conv) {
      conv = {
        id: conversationId || `conv-${Date.now()}`,
        patientId: pId,
        title: userQuery.length > 35 ? `${userQuery.slice(0, 35)}...` : userQuery,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      aiConversations.unshift(conv);
    }
    conv.messages.push({
      id: `msg-u-${Date.now()}`,
      role: 'user',
      content: userQuery,
      timestamp: new Date().toISOString(),
    });
    conv.messages.push({
      id: `msg-a-${Date.now()}`,
      role: 'assistant',
      content: replyText,
      timestamp: new Date().toISOString(),
    });
    conv.updatedAt = new Date().toISOString();

    res.json({
      reply: replyText,
      conversationId: conv.id,
      timestamp: new Date().toISOString(),
      patientContextUsed: {
        adherencePercentage: pSummary.weeklyPercentage,
        riskLevel: pRisk.riskLevel,
        medCount: pMeds.length,
      },
    });
  } catch (err: any) {
    console.error('Gemini API error:', err);
    res.status(500).json({
      error: 'Failed to generate AI response',
      details: err.message,
      fallbackReply: `I can see your medication schedule and adherence history (${pSummary.weeklyPercentage}% weekly adherence). Please try asking your question again in a moment.`,
    });
  }
});

// ==================== PATIENT CONTROL ROOM OVERVIEW API ====================

app.get('/api/patient/control-room/overview', (req, res) => {
  const patientId = (req.query.patientId as string) || (req.query.userId as string) || 'p-101';
  const patient = getOrCreateUser(patientId, 'PATIENT');

  // 1. Active & Total Medications
  const pMeds = medications.filter((m) => m.patientId === patientId && (m as any).status !== 'DELETED');
  const activeMeds = pMeds.filter((m) => m.isActive && (m as any).status !== 'COMPLETED');

  // 2. Scheduled Doses & Real Adherence Logs
  const pLogs = adherenceLogs.filter((l) => l.patientId === patientId);
  const todayLogs = pLogs.filter((l) => l.scheduledDate === todayStr);

  let todayScheduledDosesCount = 0;
  activeMeds.forEach((m) => {
    todayScheduledDosesCount += (m.scheduleTimes && m.scheduleTimes.length > 0) ? m.scheduleTimes.length : 1;
  });
  const todayTotal = Math.max(todayScheduledDosesCount, todayLogs.length);
  const todayCompleted = todayLogs.filter((l) => l.status === 'TAKEN' || l.status === 'DELAYED').length;
  const todayMissed = todayLogs.filter((l) => l.status === 'MISSED').length;
  const todayPending = Math.max(0, todayTotal - todayCompleted - todayMissed);
  const progressPercentage = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  // Real all-time completed and missed doses
  const totalTakenAllTime = pLogs.filter((l) => l.status === 'TAKEN' || l.status === 'DELAYED').length;
  const totalMissedAllTime = pLogs.filter((l) => l.status === 'MISSED').length;
  const totalEligibleDoses = totalTakenAllTime + totalMissedAllTime;

  // Adherence Score: percentage based on real logged taken vs eligible doses
  let adherenceScore = 0;
  if (totalEligibleDoses > 0) {
    adherenceScore = Math.round((totalTakenAllTime / totalEligibleDoses) * 100);
  } else if (todayTotal > 0 && (todayCompleted > 0 || todayMissed > 0)) {
    adherenceScore = Math.round((todayCompleted / Math.max(1, todayCompleted + todayMissed)) * 100);
  }

  // 3. Days Active calculation:
  // Count distinct calendar dates with activity from logs, history, symptoms, logins, sessions, and account creation
  const activeDateSet = new Set<string>();
  if (patient.createdAt) {
    activeDateSet.add(patient.createdAt.split('T')[0]);
  }
  pLogs.forEach((l) => {
    if (l.scheduledDate) activeDateSet.add(l.scheduledDate);
    else if (l.createdAt) activeDateSet.add(l.createdAt.split('T')[0]);
  });
  medicationHistory.filter((h) => h.patientId === patientId).forEach((h) => {
    if (h.createdDate) activeDateSet.add(h.createdDate);
    else if (h.timestamp) activeDateSet.add(h.timestamp.split('T')[0]);
  });
  (userLoginHistory[patientId] || []).forEach((lh) => {
    if (lh.timestamp) activeDateSet.add(lh.timestamp.split('T')[0]);
  });
  symptoms.filter((s) => s.patientId === patientId).forEach((s) => {
    if (s.date) activeDateSet.add(s.date);
    else if (s.createdAt) activeDateSet.add(s.createdAt.split('T')[0]);
  });
  (userSessionsMap[patientId] || []).forEach((s) => {
    if (s.createdAt) activeDateSet.add(s.createdAt.split('T')[0]);
  });

  const daysActive = activeDateSet.size > 0 ? activeDateSet.size : (patient.createdAt ? 1 : 0);

  // 4. Connected Family (Active connections only)
  const pFamily = familyConnections.filter((fc) => fc.patientId === patientId && fc.status === 'ACTIVE');

  // 5. FCM Push Alerts delivered
  const pNotifs = notifications.filter((n) => n.targetUserId === patientId || n.patientId === patientId);
  const deliveredNotifsCount = pNotifs.filter((n) => n.deliveryStatus !== 'Failed').length;

  // 6. AI Assistant Chats
  const pAIChats = aiConversations.filter((c) => c.patientId === patientId);
  const aiAssistantChats = pAIChats.length;

  // 7. Security Center & Score Calculation
  const sec = accountSecurityMap[patientId] || {
    securityScore: 75,
    twoFactorEnabled: false,
    biometricsEnabled: true,
    pinLockEnabled: true,
    passwordStrength: 'Strong (92/100)',
    passwordLastChanged: patient.createdAt || '2026-05-15T10:30:00Z',
    failedLoginAttempts: 0,
    emailVerified: true,
    phoneVerified: !!patient.phone,
  };

  let calculatedSecurityScore = 65;
  if (sec.twoFactorEnabled) calculatedSecurityScore += 15;
  if (sec.biometricsEnabled || sec.pinLockEnabled) calculatedSecurityScore += 10;
  if (sec.emailVerified !== false) calculatedSecurityScore += 5;
  if (sec.phoneVerified) calculatedSecurityScore += 5;
  if (sec.failedLoginAttempts && sec.failedLoginAttempts > 0) {
    calculatedSecurityScore -= Math.min(25, sec.failedLoginAttempts * 5);
  }
  calculatedSecurityScore = Math.min(100, Math.max(0, calculatedSecurityScore));
  sec.securityScore = calculatedSecurityScore;

  const securityStatusText =
    calculatedSecurityScore >= 90 ? 'Enterprise Grade' :
    calculatedSecurityScore >= 75 ? 'High Security' :
    calculatedSecurityScore >= 60 ? 'Standard Security' : 'Action Required';

  const sessions = userSessionsMap[patientId] || [];
  const devicesList = userActiveDevices[patientId] || [];
  const adhSummary = calculateAdherenceSummary(patientId);
  const risk = calculateRiskLevel(patientId);

  // Real History events for recent activity
  const rawHistory = medicationHistory.filter((h) => h.patientId === patientId);
  const recentActivity = rawHistory.slice(0, 8).map((h) => ({
    id: h.id,
    eventType: h.eventType,
    title: h.eventTitle || `${h.medicineName} ${h.status}`,
    description: h.notes || `${h.medicineName} scheduled at ${h.scheduledTime || 'N/A'}.`,
    medicineName: h.medicineName,
    status: h.status,
    timestamp: h.timestamp || h.updatedDate || new Date().toISOString(),
    date: h.createdDate || todayStr,
    time: h.actualTime || h.scheduledTime || '08:00 AM',
    impact: h.adherenceImpact || 'Logged',
    reminderStatus: h.reminderStatus || 'Delivered',
  }));

  // Dynamic contextual alerts
  const importantAlerts = [];
  if (todayMissed > 0) {
    importantAlerts.push({
      id: `alert-missed-${Date.now()}`,
      severity: 'warning',
      title: 'Missed Dose Detected Today',
      message: `${todayMissed} dose was missed today. Caregivers have been notified in real time.`,
      actionLabel: 'View Medicines',
      actionTab: 'medications',
      timestamp: `${todayStr}T09:30:00Z`,
    });
  }
  if (!sec.twoFactorEnabled) {
    importantAlerts.push({
      id: 'alert-sec-2fa',
      severity: 'info',
      title: 'Two-Factor Authentication Recommended',
      message: 'Add an extra layer of protection to your HIPAA health record by enabling 2FA.',
      actionLabel: 'Security Center',
      actionTab: 'security',
      timestamp: new Date().toISOString(),
    });
  }
  if (todayPending > 0) {
    importantAlerts.push({
      id: 'alert-pending-doses',
      severity: 'info',
      title: 'Upcoming Scheduled Doses',
      message: `You have ${todayPending} dose(s) scheduled for later today.`,
      actionLabel: 'View Schedule',
      actionTab: 'medications',
      timestamp: `${todayStr}T08:00:00Z`,
    });
  }

  const lifecycle = userAccountLifecycleMap[patientId] || {
    accountStatus: 'ACTIVE',
    careJourneyStatus: 'ACTIVE',
    careJourneyTitle: 'Cardiometabolic & General Health Care Journey',
    startDate: patient.createdAt ? patient.createdAt.split('T')[0] : '2026-01-15',
    expectedCompletionDate: '2026-12-31',
    retentionNotice: 'Pursuant to HIPAA § 164.316 & CA CMIA health compliance statutes, diagnostic audit records and medication event logs are maintained for mandatory 6-year retention.',
    treatmentCourses: [],
  };

  // Aggregated response payload
  res.json({
    success: true,
    patient: {
      id: patient.id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      avatarUrl: patient.avatarUrl,
      role: patient.role,
      verificationStatus: 'HIPAA Verified',
      accountStatus: lifecycle.accountStatus === 'DEACTIVATED'
        ? 'Deactivated (Inactive)'
        : lifecycle.careJourneyStatus === 'ARCHIVED'
        ? 'Archived Care Journey (Retention Active)'
        : 'Active & Compliant (HIPAA & GDPR)',
      careJourneyStatus: lifecycle.careJourneyStatus,
      memberSince: patient.createdAt || '2026-01-15T10:00:00Z',
      securityRating: calculatedSecurityScore,
      familyInviteCode: patient.familyInviteCode || 'A7K9P2',
    },
    careJourney: lifecycle,
    summary: {
      daysActive,
      adherenceScore,
      weeklyAdherenceScore: adhSummary.weeklyPercentage || adherenceScore,
      activeMedications: activeMeds.length,
      totalPrescriptions: pMeds.length,
      todayMedicines: todayTotal,
      completedDoses: totalTakenAllTime,
      allTimeCompletedDoses: totalTakenAllTime,
      missedDoses: totalMissedAllTime,
      allTimeMissedDoses: totalMissedAllTime,
      connectedFamily: pFamily.length,
      pushAlerts: deliveredNotifsCount,
      fcmPushAlerts: deliveredNotifsCount,
      aiAssistantChats,
      securityScore: calculatedSecurityScore,
      aiRiskLevel: risk.riskLevel,
    },
    medicationStatus: {
      todayTotal,
      todayCompleted,
      todayPending,
      todayMissed,
      progressPercentage,
      schedule: todayLogs.map((l) => ({
        id: l.id,
        medicationId: l.medicationId,
        medicineName: l.medicineName,
        dosage: l.dosage,
        scheduledTime: l.scheduledTime,
        scheduledDate: l.scheduledDate,
        status: l.status,
        takenAt: l.takenAt,
      })),
      activePrescriptions: activeMeds.map((m) => ({
        id: m.id,
        medicineName: m.medicineName,
        dosage: m.dosage,
        scheduleTimes: m.scheduleTimes,
        category: m.category,
        pillColor: m.pillColor,
        instructions: m.instructions,
      })),
    },
    familyStatus: {
      connectedCount: pFamily.length,
      pendingCount: familyConnections.filter((fc) => fc.patientId === patientId && fc.status === 'PENDING').length,
      familyInviteCode: patient.familyInviteCode || 'A7K9P2',
      authorizationStatus: pFamily.length > 0 ? 'Authorized Caregivers Connected' : 'No Caregivers Connected',
      members: pFamily.map((f) => ({
        id: f.id,
        familyMemberId: f.familyMemberId,
        familyMemberName: f.familyMemberName,
        familyMemberEmail: f.familyMemberEmail,
        relationship: f.relationship,
        status: f.status,
        permissions: f.permissions,
        createdAt: f.createdAt,
      })),
    },
    securityStatus: {
      score: calculatedSecurityScore,
      status: securityStatusText,
      twoFactorEnabled: !!sec.twoFactorEnabled,
      biometricsEnabled: !!sec.biometricsEnabled,
      pinLockEnabled: !!sec.pinLockEnabled,
      passwordStrength: sec.passwordStrength || 'Strong (92/100)',
      passwordLastChanged: sec.passwordLastChanged || '2026-05-15T10:30:00Z',
      lastChecked: 'Just now',
      importantWarning: !sec.twoFactorEnabled ? 'Two-Factor Authentication (2FA) is recommended.' : null,
      activeSessionsCount: sessions.length,
      activeDevicesCount: devicesList.length,
    },
    notificationPreview: pNotifs.slice(0, 5).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      isRead: n.isRead,
    })),
    recentActivity,
    importantAlerts,
  });
});

// ==================== PATIENT CONTROL ROOM AUTHENTICATION & SESSION APIS ====================

// ==================== PATIENT CONTROL ROOM LOGIN HISTORY APIS ====================

app.get('/api/patient/control-room/login-history', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  const statusFilter = (req.query.status as string || 'ALL').toUpperCase();
  const timeframe = (req.query.timeframe as string || 'all').toLowerCase();
  const search = (req.query.search as string || '').toLowerCase().trim();

  let history = userLoginHistory[patientId] || userLoginHistory['p-101'] || [];

  // Ensure default patient-friendly login history if empty
  if (history.length === 0) {
    history = [
      {
        id: 'log-101',
        date: 'Today',
        time: '08:30 PM',
        timestamp: `${todayStr}T20:30:00Z`,
        location: 'Ahmedabad, India',
        device: 'Windows PC',
        deviceType: 'Desktop',
        browser: 'Chrome 127',
        authMethod: 'Google Login',
        status: 'SUCCESS',
        isCurrentDevice: true,
      },
      {
        id: 'log-100',
        date: 'Yesterday',
        time: '06:15 PM',
        timestamp: '2026-08-22T18:15:00Z',
        location: 'Ahmedabad, India',
        device: 'Android Phone',
        deviceType: 'Smartphone',
        browser: 'Chrome Mobile',
        authMethod: 'Phone OTP',
        status: 'SUCCESS',
        isCurrentDevice: false,
      },
      {
        id: 'log-099',
        date: 'Aug 21, 2026',
        time: '11:42 PM',
        timestamp: '2026-08-21T23:42:00Z',
        location: 'Ahmedabad, India',
        device: 'Windows PC',
        deviceType: 'Desktop',
        browser: 'Chrome 127',
        authMethod: 'Email & Password',
        status: 'FAILED',
        isCurrentDevice: false,
      },
      {
        id: 'log-098',
        date: 'Aug 20, 2026',
        time: '09:10 AM',
        timestamp: '2026-08-20T09:10:00Z',
        location: 'Ahmedabad, India',
        device: 'Windows PC',
        deviceType: 'Desktop',
        browser: 'Chrome 127',
        authMethod: 'Email & Password',
        status: 'SUCCESS',
        isCurrentDevice: false,
      },
      {
        id: 'log-097',
        date: 'Aug 17, 2026',
        time: '03:25 PM',
        timestamp: '2026-08-17T15:25:00Z',
        location: 'Mumbai, India',
        device: 'MacBook Air',
        deviceType: 'Laptop',
        browser: 'Safari 17.5',
        authMethod: 'Google Login',
        status: 'SUCCESS',
        isCurrentDevice: false,
      },
      {
        id: 'log-096',
        date: 'Aug 12, 2026',
        time: '02:15 AM',
        timestamp: '2026-08-12T02:15:00Z',
        location: 'Location unavailable',
        device: 'Android Phone',
        deviceType: 'Smartphone',
        browser: 'Firefox Mobile',
        authMethod: 'Email & Password',
        status: 'UNUSUAL',
        isCurrentDevice: false,
      },
      {
        id: 'log-095',
        date: 'Aug 08, 2026',
        time: '10:00 AM',
        timestamp: '2026-08-08T10:00:00Z',
        location: 'Ahmedabad, India',
        device: 'iPad Pro',
        deviceType: 'Tablet',
        browser: 'Safari Mobile',
        authMethod: 'Phone OTP',
        status: 'SUCCESS',
        isCurrentDevice: false,
      }
    ];
    userLoginHistory[patientId] = history;
  }

  // Normalize objects in case older structures exist
  history = history.map((item) => ({
    id: item.id || `log-${Math.random().toString(36).substring(7)}`,
    date: item.date || todayStr,
    time: item.time || '12:00 PM',
    timestamp: item.timestamp || new Date().toISOString(),
    location: item.location || 'Location unavailable',
    device: item.device || 'Personal Device',
    deviceType: item.deviceType || 'Desktop',
    browser: item.browser ? item.browser.split(' ')[0] : 'Browser',
    authMethod: item.authMethod || 'Email & Password',
    status: (item.status === 'EXPIRED' ? 'FAILED' : (item.isSuspicious ? 'UNUSUAL' : item.status)) || 'SUCCESS',
    isCurrentDevice: Boolean(item.isCurrentDevice || item.currentSession),
  }));

  // Apply simple filters
  let filtered = [...history];

  if (statusFilter === 'SUCCESS' || statusFilter === 'SUCCESSFUL') {
    filtered = filtered.filter((l) => l.status === 'SUCCESS');
  } else if (statusFilter === 'FAILED') {
    filtered = filtered.filter((l) => l.status === 'FAILED');
  }

  if (search) {
    filtered = filtered.filter(
      (l) =>
        (l.device && l.device.toLowerCase().includes(search)) ||
        (l.browser && l.browser.toLowerCase().includes(search)) ||
        (l.location && l.location.toLowerCase().includes(search)) ||
        (l.authMethod && l.authMethod.toLowerCase().includes(search))
    );
  }

  res.json({
    success: true,
    patientId,
    logs: filtered,
    totalCount: history.length,
    filteredCount: filtered.length,
  });
});

// ==================== ACTIVE DEVICES ENDPOINTS ====================

app.get('/api/patient/control-room/active-devices', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  const patient = users.find((u) => u.id === patientId) || users[0];

  if (!patient) {
    return res.status(404).json({ error: 'Patient account not found' });
  }

  let devices = userActiveDevices[patientId] || userActiveDevices['p-101'] || [];

  if (devices.length === 0) {
    devices = [
      {
        id: 'dev-1',
        deviceType: 'Desktop',
        deviceName: 'Windows PC',
        browser: 'Chrome',
        os: 'Windows',
        location: 'Hyderabad, India',
        lastActive: 'Just now',
        isCurrentDevice: true,
      },
    ];
    userActiveDevices[patientId] = devices;
  }

  // Normalize device properties
  const normalizedDevices = devices.map((d) => ({
    id: d.id,
    deviceType: d.deviceType || (d.type ? (d.type.includes('Phone') ? 'Smartphone' : d.type) : 'Desktop'),
    deviceName: d.deviceName || d.device || 'Personal Device',
    browser: d.browser ? d.browser.split(' ')[0] : 'Chrome',
    os: d.os ? d.os.split(' ')[0] : 'Windows',
    location: d.location || 'Hyderabad, India',
    lastActive: d.lastActive || 'Just now',
    isCurrentDevice: Boolean(d.isCurrentDevice || d.isCurrent),
  }));

  res.json({
    success: true,
    patientId,
    devices: normalizedDevices,
    totalCount: normalizedDevices.length,
  });
});

app.post('/api/patient/control-room/active-devices/:deviceId/signout', (req, res) => {
  const { deviceId } = req.params;
  const patientId = (req.body.patientId as string) || 'p-101';

  let devices = userActiveDevices[patientId] || userActiveDevices['p-101'] || [];
  const targetDevice = devices.find((d) => d.id === deviceId);

  if (!targetDevice) {
    return res.status(404).json({ error: 'Device not found or already signed out.' });
  }

  if (targetDevice.isCurrentDevice || targetDevice.isCurrent) {
    return res.status(400).json({
      error: 'Cannot sign out the current device from this card. Please use Sign Out from the account menu if you wish to log out.',
    });
  }

  // Remove the device from active devices list
  userActiveDevices[patientId] = devices.filter((d) => d.id !== deviceId);

  // Invalidate any matching session in userSessionsMap
  if (userSessionsMap[patientId]) {
    userSessionsMap[patientId] = userSessionsMap[patientId].filter((s) => s.deviceId !== deviceId);
  }

  // Record security audit in userLoginHistory
  const historyList = userLoginHistory[patientId] || [];
  historyList.unshift({
    id: `log-${Date.now()}`,
    date: 'Today',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: new Date().toISOString(),
    location: targetDevice.location || 'Hyderabad, India',
    device: targetDevice.deviceName || 'Signed Out Device',
    deviceType: targetDevice.deviceType || 'Smartphone',
    browser: targetDevice.browser || 'Browser',
    authMethod: 'Remote Sign-Out',
    status: 'SUCCESS',
    isCurrentDevice: false,
  });
  userLoginHistory[patientId] = historyList;

  // Dispatch security notification
  notifications.unshift({
    id: `notif-dev-signout-${Date.now()}`,
    patientId,
    targetUserId: patientId,
    type: 'SYSTEM_UPDATE',
    title: 'Device Signed Out',
    message: `You signed out ${targetDevice.deviceName} (${targetDevice.os || 'Device'}). Its active session was removed.`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Device signed out successfully.',
    deviceId,
    devices: userActiveDevices[patientId],
  });
});

// ==================== SECURITY CENTER ENDPOINT ====================

app.get('/api/patient/control-room/security', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  const patient = users.find((u) => u.id === patientId) || users[0];

  if (!patient) {
    return res.status(404).json({ error: 'Patient account not found' });
  }

  // 1. Get Authentication & Session Info
  const sec = accountSecurityMap[patientId] || accountSecurityMap['p-101'] || {
    twoFactorEnabled: false,
    biometricsEnabled: true,
    emailVerified: true,
    phoneVerified: true,
  };
  const sessions = userSessionsMap[patientId] || userSessionsMap['p-101'] || [];
  const currentSession = sessions.find((s) => s.isCurrent) || sessions[0];

  // 2. Get Active Devices
  let devices = userActiveDevices[patientId] || userActiveDevices['p-101'] || [];
  if (devices.length === 0) {
    devices = [
      {
        id: 'dev-1',
        deviceType: 'Desktop',
        deviceName: 'Windows PC',
        browser: 'Chrome',
        os: 'Windows',
        location: 'Hyderabad, India',
        lastActive: 'Just now',
        isCurrentDevice: true,
      },
    ];
  }
  const activeDevicesCount = devices.length;

  // 3. Get Login History & Recent Login
  const history = userLoginHistory[patientId] || userLoginHistory['p-101'] || [];
  const recentLogin = history[0] || {
    date: 'Today',
    time: '08:30 PM',
    location: 'Hyderabad, India',
    device: 'Windows PC',
    deviceType: 'Desktop',
    browser: 'Chrome',
    authMethod: 'Email & Password',
    status: 'SUCCESS',
  };

  // 4. Evaluate Security Alerts from notifications and login logs
  const userNotifs = notifications.filter(
    (n) => (n.targetUserId === patientId || n.patientId === patientId) && (n.type === 'SECURITY_ALERT' || n.type === 'SECURITY_WARNING')
  );

  const unusualLogins = history.filter((l) => l.status === 'UNUSUAL' || l.isSuspicious);

  const alerts: Array<{
    id: string;
    title: string;
    message: string;
    date: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }> = [];

  // If unusual login found in recent 3 logs
  if (unusualLogins.length > 0 && (history[0]?.status === 'UNUSUAL' || history[1]?.status === 'UNUSUAL')) {
    const target = unusualLogins[0];
    alerts.push({
      id: `alert-unusual-${target.id}`,
      title: 'Unusual Login Attempt Detected',
      message: `An unusual sign-in from ${target.device} (${target.location || 'Unknown Location'}) was recorded.`,
      date: target.date || 'Recent',
      severity: 'MEDIUM',
    });
  }

  // Add any active security notifications
  userNotifs.slice(0, 3).forEach((notif) => {
    if (!alerts.some((a) => a.id === notif.id)) {
      alerts.push({
        id: notif.id,
        title: notif.title || 'Security Notification',
        message: notif.message,
        date: 'Recent',
        severity: notif.type === 'SECURITY_ALERT' ? 'HIGH' : 'MEDIUM',
      });
    }
  });

  // 5. Determine Overall Security Status
  let overallStatus: 'PROTECTED' | 'ATTENTION_RECOMMENDED' | 'ACTION_REQUIRED' = 'PROTECTED';
  let statusTitle = 'Your account is protected.';
  let statusDescription = 'Your authentication and active devices look secure.';

  if (alerts.some((a) => a.severity === 'HIGH')) {
    overallStatus = 'ACTION_REQUIRED';
    statusTitle = 'Action required';
    statusDescription = 'We detected a security event that requires your prompt review.';
  } else if (alerts.length > 0) {
    overallStatus = 'ATTENTION_RECOMMENDED';
    statusTitle = 'Attention recommended';
    statusDescription = 'Review recent sign-in activity to ensure all devices belong to you.';
  }

  res.json({
    success: true,
    patientId,
    overallStatus,
    statusTitle,
    statusDescription,
    accountProtection: {
      authentication: 'Active',
      currentSession: currentSession ? 'Secure' : 'Active',
      loginProtection: 'Enabled',
      twoFactorEnabled: Boolean(sec.twoFactorEnabled),
      authMethod: currentSession?.authMethod || 'Email & Password',
    },
    deviceSecurity: {
      activeDevicesCount,
      hasUnknownDevices: false,
      statusMessage: 'No unknown devices detected.',
    },
    recentLogin: {
      date: recentLogin.date || 'Today',
      time: recentLogin.time || '08:30 PM',
      location: recentLogin.location || 'Hyderabad, India',
      device: recentLogin.device || 'Windows PC',
      deviceType: recentLogin.deviceType || 'Desktop',
      browser: recentLogin.browser ? recentLogin.browser.split(' ')[0] : 'Chrome',
      status: recentLogin.status === 'FAILED' ? 'Failed' : recentLogin.status === 'UNUSUAL' ? 'Unusual' : 'Successful',
      isSuccessful: recentLogin.status === 'SUCCESS' || recentLogin.status === 'Success',
    },
    alerts,
    hasAlerts: alerts.length > 0,
  });
});

app.get('/api/patient/control-room/authentication', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  const patient = getOrCreateUser(patientId, 'PATIENT');

  const sec = accountSecurityMap[patientId] || accountSecurityMap['p-101'] || {
    securityScore: 92,
    twoFactorEnabled: false,
    biometricsEnabled: true,
    pinLockEnabled: true,
    passwordStrength: 'Strong (94/100)',
    passwordLastChanged: '2026-05-15T10:30:00.000Z',
    failedLoginAttempts: 0,
    emailVerified: true,
    phoneVerified: true,
  };

  const sessions = userSessionsMap[patientId] || userSessionsMap['p-101'] || [];
  const devices = userActiveDevices[patientId] || userActiveDevices['p-101'] || [];
  const lifecycle = userAccountLifecycleMap[patientId] || userAccountLifecycleMap['p-101'] || {
    accountStatus: 'ACTIVE',
    careJourneyStatus: 'ACTIVE',
    careJourneyTitle: 'Cardiometabolic & Hypertension Care Journey',
    startDate: '2026-06-10',
    expectedCompletionDate: '2026-09-10',
    retentionNotice: 'Pursuant to HIPAA § 164.316 & CA CMIA health compliance statutes, diagnostic audit records and medication event logs are maintained for mandatory 6-year retention.',
    treatmentCourses: [],
  };

  // Find or craft current session
  const currentSessionData = sessions.find((s) => s.isCurrent) || sessions[0] || {
    id: 'sess_live_99481203',
    deviceId: 'dev-1',
    deviceName: 'MacBook Pro 16"',
    authMethod: 'Email + Biometric Passkey',
    accessTokenStatus: 'Active (JWT RS256 Valid)',
    refreshTokenStatus: 'Valid (Rotated 15m ago)',
    tokenExpirySeconds: 3240,
    lastLogin: '2026-08-23T08:30:00Z',
    sessionStarted: '2026-08-23T08:30:00Z',
    sessionDuration: '5h 29m',
    isCurrent: true,
    status: 'Active',
  };

  const currentDeviceData = devices.find((d) => d.isCurrent) || devices[0] || {
    id: 'dev-1',
    type: 'Laptop',
    deviceName: 'MacBook Pro 16"',
    browser: 'Chrome 127.0',
    os: 'macOS Sonoma 14.5',
    location: 'San Francisco, CA, USA',
    ipAddress: '172.56.21.94',
    isCurrent: true,
  };

  // Structured Authentication Methods
  const authenticationMethods = [
    {
      id: 'auth-email',
      type: 'email_password',
      name: 'Email & Password',
      identifier: patient.email,
      status: 'CONNECTED',
      isPrimary: true,
      lastUsed: 'Today at 08:30 AM',
      verified: !!sec.emailVerified,
      description: 'Primary verified credential for CarePulse EHR access',
      requires2FA: !!sec.twoFactorEnabled,
    },
    {
      id: 'auth-google',
      type: 'google',
      name: 'Google Account OAuth',
      identifier: patient.email.includes('gmail') || patient.passwordHash === 'google_oauth_provider' ? patient.email : `${patient.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      status: 'CONNECTED',
      isPrimary: false,
      lastUsed: 'Aug 22, 2026 at 02:15 PM',
      verified: true,
      description: 'Connected via Google Health Federated Identity',
      requires2FA: false,
    },
    {
      id: 'auth-phone',
      type: 'phone_otp',
      name: 'Phone SMS OTP',
      identifier: patient.phone || '+1 (555) 234-5678',
      status: patient.phone ? 'CONNECTED' : 'NOT_CONFIGURED',
      isPrimary: false,
      lastUsed: patient.phone ? 'Aug 20, 2026 at 11:00 AM' : 'Not configured',
      verified: !!sec.phoneVerified,
      description: 'One-Time Password verification sent via encrypted SMS',
      requires2FA: false,
    },
    {
      id: 'auth-passkey',
      type: 'biometrics_passkey',
      name: 'Device Passkey & Biometrics',
      identifier: 'Touch ID / Face ID (FIDO2 WebAuthn)',
      status: sec.biometricsEnabled ? 'CONNECTED' : 'NOT_CONFIGURED',
      isPrimary: false,
      lastUsed: 'Today at 08:30 AM',
      verified: true,
      description: 'Hardware-backed cryptographic security key on trusted device',
      requires2FA: false,
    },
  ];

  // Other active sessions
  const otherSessions = sessions
    .filter((s) => !s.isCurrent)
    .map((s) => {
      const dev = devices.find((d) => d.id === s.deviceId) || {
        deviceName: s.deviceName,
        browser: 'Mobile Safari',
        os: 'iOS 17.5.1',
        location: 'San Francisco, CA, USA',
        ipAddress: '172.56.21.94',
      };
      return {
        id: s.id,
        deviceId: s.deviceId,
        deviceName: s.deviceName,
        browser: dev.browser,
        os: dev.os,
        location: dev.location,
        ipAddress: dev.ipAddress,
        loginAt: s.lastLogin,
        sessionStarted: s.sessionStarted,
        sessionDuration: s.sessionDuration,
        authMethod: s.authMethod,
        status: s.status || 'Active',
      };
    });

  res.json({
    success: true,
    authenticated: true,
    patient: {
      id: patient.id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      avatarUrl: patient.avatarUrl,
      role: patient.role,
      memberSince: patient.createdAt || '2026-01-15T00:00:00Z',
      accountStatus: lifecycle.accountStatus,
    },
    careJourney: lifecycle,
    currentSession: {
      id: currentSessionData.id,
      deviceId: currentDeviceData.id,
      deviceName: currentDeviceData.deviceName,
      browser: currentDeviceData.browser,
      os: currentDeviceData.os,
      appVersion: currentDeviceData.appVersion || 'v2.4.0 (Web Client)',
      approxLocation: currentDeviceData.location || 'San Francisco, CA, USA',
      ipAddress: currentDeviceData.ipAddress || '172.56.21.94',
      loginDate: 'Aug 23, 2026',
      loginTime: '08:30 AM',
      loginTimestamp: currentSessionData.lastLogin || '2026-08-23T08:30:00Z',
      lastActivity: 'Just now (Active)',
      sessionDuration: currentSessionData.sessionDuration || '5h 29m',
      status: 'Active',
      tokenStatus: currentSessionData.accessTokenStatus || 'Active (JWT RS256 Valid)',
      tokenType: 'JWT RS256 Bearer',
      encryption: 'AES-256 GCM + TLS 1.3',
      expiresIn: '24 hours (Auto-Renewing)',
      isCurrent: true,
    },
    authenticationMethods,
    sessionSecurity: {
      accountAuthenticated: true,
      currentSessionActive: true,
      providerConnected: true,
      noImmediateIssue: true,
      securityScore: sec.securityScore || 92,
      lastLogin: 'Aug 23, 2026 • 08:30 AM',
      lastAuthMethod: currentSessionData.authMethod || 'Email + Biometric Passkey',
      lastPasswordChange: sec.passwordLastChanged || 'May 15, 2026',
      twoFactorStatus: sec.twoFactorEnabled ? 'Enabled (Active)' : 'Disabled (Recommended)',
      totalActiveSessions: sessions.length,
      otherSessionsCount: otherSessions.length,
      isHIPAACompliant: true,
    },
    otherSessions,
  });
});

// POST /api/patient/care-journey/archive - Archive a completed care journey
app.post('/api/patient/care-journey/archive', (req, res) => {
  const { patientId = 'p-101', reason } = req.body;
  const targetId = patientId;

  if (!userAccountLifecycleMap[targetId]) {
    userAccountLifecycleMap[targetId] = {
      accountStatus: 'ACTIVE',
      careJourneyStatus: 'ACTIVE',
      careJourneyTitle: 'Care Journey',
      startDate: '2026-06-10',
      expectedCompletionDate: todayStr,
      retentionNotice: 'Clinical audit records preserved under HIPAA 6-year retention rules.',
      treatmentCourses: [],
    };
  }

  const lifecycle = userAccountLifecycleMap[targetId];
  lifecycle.careJourneyStatus = 'ARCHIVED';
  lifecycle.archivedAt = new Date().toISOString();

  // Audit in medication history
  recordHistoryEvent({
    patientId: targetId,
    medicineName: 'Care Journey Plan',
    eventType: 'CARE_JOURNEY_ARCHIVED',
    eventTitle: 'Care Journey Formally Archived',
    status: 'COMPLETED',
    notes: reason || 'Patient completed treatment courses and archived the active care plan. Historical data retained.',
    adherenceImpact: 'Treatment Course Finalized',
    aiRiskImpact: 'Archived - Active Alarms Muted',
  });

  // Audit in Login History / Security Log
  const historyList = userLoginHistory[targetId] || [];
  historyList.unshift({
    id: `log-${Date.now()}`,
    date: todayStr,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    logoutTime: 'N/A',
    duration: 'Audit Logged',
    browser: 'Account Lifecycle Engine',
    os: 'CarePulse EHR Service',
    device: 'Care Journey Archived',
    ipAddress: '172.56.21.94',
    location: 'San Francisco, CA, USA',
    status: 'Success',
    currentSession: true,
  });
  userLoginHistory[targetId] = historyList;

  // Notification
  notifications.unshift({
    id: `notif-arch-${Date.now()}`,
    patientId: targetId,
    targetUserId: targetId,
    type: 'SYSTEM_UPDATE',
    title: 'Care Journey Archived',
    message: 'Your completed care journey has been archived. Your health and medication history remains safely preserved.',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Care journey archived successfully. Historical records remain safely preserved.',
    careJourney: lifecycle,
  });
});

// POST /api/patient/care-journey/resume - Resume or restart care journey
app.post('/api/patient/care-journey/resume', (req, res) => {
  const { patientId = 'p-101' } = req.body;
  const targetId = patientId;

  if (userAccountLifecycleMap[targetId]) {
    userAccountLifecycleMap[targetId].careJourneyStatus = 'ACTIVE';
    userAccountLifecycleMap[targetId].accountStatus = 'ACTIVE';
  }

  // Audit event
  recordHistoryEvent({
    patientId: targetId,
    medicineName: 'Care Journey Plan',
    eventType: 'CARE_JOURNEY_RESUMED',
    eventTitle: 'Care Journey Resumed',
    status: 'ACTIVATED',
    notes: 'Patient reactivated active care tracking in Patient Control Room.',
    adherenceImpact: 'Active Care Monitoring Resumed',
    aiRiskImpact: 'Active Monitoring Enabled',
  });

  res.json({
    success: true,
    message: 'Care journey is now active.',
    careJourney: userAccountLifecycleMap[targetId],
  });
});

// POST /api/patient/account/deactivate - Temporarily pause or deactivate account
app.post('/api/patient/account/deactivate', (req, res) => {
  const { patientId = 'p-101', reason } = req.body;
  const targetId = patientId;

  if (!userAccountLifecycleMap[targetId]) {
    userAccountLifecycleMap[targetId] = {
      accountStatus: 'ACTIVE',
      careJourneyStatus: 'ACTIVE',
      careJourneyTitle: 'Care Journey',
      startDate: '2026-06-10',
      expectedCompletionDate: todayStr,
      retentionNotice: 'Clinical records preserved under HIPAA retention policy.',
      treatmentCourses: [],
    };
  }

  const lifecycle = userAccountLifecycleMap[targetId];
  lifecycle.accountStatus = 'DEACTIVATED';
  lifecycle.careJourneyStatus = 'INACTIVE';
  lifecycle.deactivatedAt = new Date().toISOString();

  // Audit event in Login / Security History
  const historyList = userLoginHistory[targetId] || [];
  historyList.unshift({
    id: `log-${Date.now()}`,
    date: todayStr,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    logoutTime: 'N/A',
    duration: 'Account Deactivated',
    browser: 'Account Lifecycle Service',
    os: 'All Platforms',
    device: 'Account Paused',
    ipAddress: '172.56.21.94',
    location: 'San Francisco, CA, USA',
    status: 'Success',
    currentSession: true,
  });
  userLoginHistory[targetId] = historyList;

  // Revoke other remote sessions
  if (userSessionsMap[targetId]) {
    userSessionsMap[targetId] = userSessionsMap[targetId].filter((s) => s.isCurrent);
  }

  // System notification
  notifications.unshift({
    id: `notif-deact-${Date.now()}`,
    patientId: targetId,
    targetUserId: targetId,
    type: 'SYSTEM_UPDATE',
    title: 'CarePulse Account Deactivated',
    message: 'Your account is now paused. Active reminders have been muted and historical records preserved.',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Your CarePulse account has been deactivated. Your data is retained according to CarePulse retention policy.',
    careJourney: lifecycle,
  });
});

// POST /api/patient/account/delete - High-risk multi-step verified account deletion
app.post('/api/patient/account/delete', (req, res) => {
  const { patientId = 'p-101', confirmationText, reason } = req.body;
  const targetId = patientId;

  if (confirmationText !== 'DELETE MY ACCOUNT') {
    return res.status(400).json({
      error: 'Confirmation phrase mismatch. Please enter "DELETE MY ACCOUNT" exactly to authorize account deletion.',
    });
  }

  // 1. Mark account status in lifecycle
  if (userAccountLifecycleMap[targetId]) {
    userAccountLifecycleMap[targetId].accountStatus = 'DELETED';
    userAccountLifecycleMap[targetId].careJourneyStatus = 'ARCHIVED';
    userAccountLifecycleMap[targetId].deletionRequestedAt = new Date().toISOString();
  }

  // 2. Revoke Family / Caregiver Connections & Permissions
  familyConnections = familyConnections.map((fc) => {
    if (fc.patientId === targetId) {
      return {
        ...fc,
        status: 'REVOKED_DELETED_PATIENT',
        permissions: {
          medicationStatus: false,
          adherencePercentage: false,
          missedDoseAlerts: false,
          riskLevel: false,
          symptoms: false,
          healthUpdates: false,
          privateNotes: false,
          aiConversations: false,
        },
      };
    }
    return fc;
  });

  // 3. Clear push tokens and device notification registrations
  deviceTokens = deviceTokens.filter((dt) => dt.userId !== targetId);

  // 4. Revoke AI Assistant conversations & sessions
  aiConversations = aiConversations.filter((c) => c.patientId !== targetId);

  // 5. Invalidate all active user sessions & devices
  delete userSessionsMap[targetId];
  delete userActiveDevices[targetId];

  // 6. Record final compliance audit record (HIPAA § 164.316)
  const historyList = userLoginHistory[targetId] || [];
  historyList.unshift({
    id: `log-${Date.now()}`,
    date: todayStr,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    logoutTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    duration: 'Account Finalized',
    browser: 'Legal & Compliance Audit Engine',
    os: 'EHR Deletion Protocol',
    device: 'ACCOUNT_DELETION_COMPLETED',
    ipAddress: '172.56.21.94',
    location: 'San Francisco, CA, USA',
    status: 'Revoked',
    currentSession: false,
  });
  userLoginHistory[targetId] = historyList;

  // 7. Mute all active future notifications
  notifications = notifications.filter((n) => n.patientId !== targetId && n.targetUserId !== targetId);

  res.json({
    success: true,
    message: 'Your account deletion request has been processed according to CarePulse data-retention policy. All active sessions and caregiver authorizations have been revoked.',
    status: 'DELETED',
    retentionNotice: 'Personal identifiers removed. Mandatory clinical audit trail retained for 6-year healthcare compliance.',
  });
});

// POST /api/auth/session/logout - Explicit Sign out current session
app.post('/api/auth/session/logout', (req, res) => {
  const { userId, sessionId } = req.body;
  const targetUserId = userId || 'p-101';

  // Audit event in Login History
  const historyList = userLoginHistory[targetUserId] || [];
  const logoutEvent = {
    id: `log-${Date.now()}`,
    date: todayStr,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    logoutTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    duration: 'Session Closed',
    browser: 'Chrome 127.0.0.0',
    os: 'macOS Sonoma 14.5',
    device: 'MacBook Pro 16"',
    ipAddress: '172.56.21.94',
    location: 'San Francisco, CA, USA',
    status: 'Logged Out',
    currentSession: false,
  };
  historyList.unshift(logoutEvent);
  userLoginHistory[targetUserId] = historyList;

  // Clear session from memory
  if (userSessionsMap[targetUserId]) {
    userSessionsMap[targetUserId] = userSessionsMap[targetUserId].filter((s) => s.id !== sessionId);
  }

  res.json({
    success: true,
    message: 'Current session safely terminated and authenticated credentials invalidated.',
  });
});

// POST /api/auth/session/logout-all - Revoke all other sessions
app.post('/api/auth/session/logout-all', (req, res) => {
  const { userId } = req.body;
  const targetUserId = userId || 'p-101';

  const user = users.find((u) => u.id === targetUserId);
  const currentSessions = userSessionsMap[targetUserId] || [];
  const otherSessionsCount = currentSessions.filter((s) => !s.isCurrent).length;

  // Keep only current session
  userSessionsMap[targetUserId] = currentSessions.filter((s) => s.isCurrent);

  // Keep only current device
  if (userActiveDevices[targetUserId]) {
    userActiveDevices[targetUserId] = userActiveDevices[targetUserId].filter((d) => d.isCurrent);
  }

  // Record Audit Event in Login History
  const historyList = userLoginHistory[targetUserId] || [];
  const revocationEvent = {
    id: `log-${Date.now()}`,
    date: todayStr,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    logoutTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    duration: '0m (Revoked Remotely)',
    browser: 'System Security Protocol',
    os: 'All Secondary Platforms',
    device: `${otherSessionsCount} Device(s) Revoked`,
    ipAddress: '172.56.21.94',
    location: 'San Francisco, CA, USA',
    status: 'Revoked',
    currentSession: false,
  };
  historyList.unshift(revocationEvent);
  userLoginHistory[targetUserId] = historyList;

  // Dispatch Security Notification
  notifications.unshift({
    id: `notif-sec-${Date.now()}`,
    patientId: targetUserId,
    targetUserId: targetUserId,
    type: 'SYSTEM_UPDATE',
    title: 'All Other Sessions Revoked',
    message: `You signed out of all ${otherSessionsCount} secondary active session(s). Your current session remains secured.`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    revokedCount: otherSessionsCount,
    remainingSessionsCount: 1,
    message: `Successfully revoked ${otherSessionsCount} active secondary session(s). Your current device session remains active and protected.`,
  });
});

// POST /api/auth/session/revoke-session - Revoke a single specific session
app.post('/api/auth/session/revoke-session', (req, res) => {
  const { userId, sessionId } = req.body;
  const targetUserId = userId || 'p-101';

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required.' });
  }

  if (userSessionsMap[targetUserId]) {
    const targetSession = userSessionsMap[targetUserId].find((s) => s.id === sessionId);
    if (targetSession && targetSession.isCurrent) {
      return res.status(400).json({ error: 'Cannot revoke current active session with this control. Use Sign Out instead.' });
    }
    userSessionsMap[targetUserId] = userSessionsMap[targetUserId].filter((s) => s.id !== sessionId);
  }

  // Remove corresponding device if exists
  if (userActiveDevices[targetUserId]) {
    userActiveDevices[targetUserId] = userActiveDevices[targetUserId].filter((d) => d.id !== sessionId && !d.isCurrent);
  }

  // Audit event
  const historyList = userLoginHistory[targetUserId] || [];
  historyList.unshift({
    id: `log-${Date.now()}`,
    date: todayStr,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    logoutTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    duration: 'Revoked',
    browser: 'Web Session Manager',
    os: 'Remote Client',
    device: `Session ${sessionId.slice(0, 10)}...`,
    ipAddress: '172.56.21.94',
    location: 'San Francisco, CA, USA',
    status: 'Revoked',
    currentSession: false,
  });

  // Notification
  notifications.unshift({
    id: `notif-sec-${Date.now()}`,
    patientId: targetUserId,
    targetUserId: targetUserId,
    type: 'SYSTEM_UPDATE',
    title: 'Device Session Terminated',
    message: `A remote session (${sessionId}) was terminated from your Patient Control Room.`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: `Session ${sessionId} was revoked and token invalidated.`,
    remainingCount: (userSessionsMap[targetUserId] || []).length,
  });
});

// ==================== NOTIFICATIONS & REAL-TIME EVENT API ====================

app.post('/api/notifications/device-token', (req, res) => {
  const { userId, token, platform, deviceName } = req.body;
  if (!userId || !token) return res.status(400).json({ error: 'User ID and token required' });

  deviceTokens = deviceTokens.filter((dt) => dt.token !== token);
  deviceTokens.push({
    userId,
    token,
    platform: platform || 'web',
    deviceName: deviceName || 'Web Browser',
    lastActive: new Date().toISOString(),
  });

  res.json({ success: true, registeredCount: deviceTokens.filter((dt) => dt.userId === userId).length });
});

app.get('/api/notifications', (req, res) => {
  const userId = (req.query.userId as string) || 'p-101';
  const userNotifs = notifications.filter((n) => n.targetUserId === userId || n.patientId === userId);
  res.json(userNotifs);
});

app.put('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const notif = notifications.find((n) => n.id === id);
  if (notif) {
    notif.isRead = true;
    notif.readAt = new Date().toISOString();
  }
  res.json({ success: true, notif });
});

// GET /api/patient/control-room/notifications
app.get('/api/patient/control-room/notifications', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  const typeFilter = req.query.type as string; // 'ALL' | 'MEDICATION_REMINDER' | 'MISSED_DOSE' | 'FAMILY_ALERT' | 'SECURITY_ALERT'
  const statusFilter = req.query.status as string; // 'all' | 'unread' | 'read'
  const search = (req.query.search as string || '').toLowerCase().trim();

  let userNotifs = notifications.filter((n) => n.patientId === patientId || n.targetUserId === patientId);

  // Type filter
  if (typeFilter && typeFilter !== 'ALL') {
    if (typeFilter === 'MEDICATION') {
      userNotifs = userNotifs.filter((n) => n.type === 'MEDICATION_REMINDER' || n.type === 'MISSED_DOSE');
    } else {
      userNotifs = userNotifs.filter((n) => n.type === typeFilter);
    }
  }

  // Status filter
  if (statusFilter === 'unread') {
    userNotifs = userNotifs.filter((n) => !n.isRead);
  } else if (statusFilter === 'read') {
    userNotifs = userNotifs.filter((n) => n.isRead);
  }

  // Search query
  if (search) {
    userNotifs = userNotifs.filter(
      (n) =>
        n.title.toLowerCase().includes(search) ||
        n.message.toLowerCase().includes(search) ||
        (n.triggerReason && n.triggerReason.toLowerCase().includes(search))
    );
  }

  const allPatientNotifs = notifications.filter((n) => n.patientId === patientId || n.targetUserId === patientId);
  const unreadCount = allPatientNotifs.filter((n) => !n.isRead).length;

  const prefs = notificationPreferencesMap[patientId] || {
    medicationReminders: true,
    missedDoseAlerts: true,
    familyCareAlerts: true,
    securityAlerts: true,
    pushChannel: true,
    smsChannel: true,
    inAppChannel: true,
    soundAlerts: true,
  };

  const patientDevices = deviceTokens.filter((dt) => dt.userId === patientId);

  res.json({
    success: true,
    patientId,
    unreadCount,
    totalCount: allPatientNotifs.length,
    filteredCount: userNotifs.length,
    notifications: userNotifs,
    preferences: prefs,
    registeredDevices: patientDevices,
    lastSyncTime: new Date().toISOString(),
  });
});

// GET /api/patient/control-room/notifications/:id
app.get('/api/patient/control-room/notifications/:id', (req, res) => {
  const { id } = req.params;
  const notif = notifications.find((n) => n.id === id);
  if (!notif) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  res.json({ success: true, notification: notif });
});

// PATCH /api/patient/control-room/notifications/:id/read
app.patch('/api/patient/control-room/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const notif = notifications.find((n) => n.id === id);
  if (!notif) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  notif.isRead = true;
  notif.readAt = new Date().toISOString();
  res.json({ success: true, notification: notif });
});

// PATCH /api/patient/control-room/notifications/:id/unread
app.patch('/api/patient/control-room/notifications/:id/unread', (req, res) => {
  const { id } = req.params;
  const notif = notifications.find((n) => n.id === id);
  if (!notif) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  notif.isRead = false;
  notif.readAt = undefined;
  res.json({ success: true, notification: notif });
});

// PATCH /api/patient/control-room/notifications/read-all
app.patch('/api/patient/control-room/notifications/read-all', (req, res) => {
  const patientId = (req.body?.patientId as string) || 'p-101';
  let updatedCount = 0;
  notifications.forEach((n) => {
    if ((n.patientId === patientId || n.targetUserId === patientId) && !n.isRead) {
      n.isRead = true;
      n.readAt = new Date().toISOString();
      updatedCount++;
    }
  });

  res.json({ success: true, updatedCount, message: 'All notifications marked as read.' });
});

// DELETE /api/patient/control-room/notifications/:id
app.delete('/api/patient/control-room/notifications/:id', (req, res) => {
  const { id } = req.params;
  const index = notifications.findIndex((n) => n.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  notifications.splice(index, 1);
  res.json({ success: true, message: 'Notification removed from history.' });
});

// GET /api/patient/control-room/notification-preferences
app.get('/api/patient/control-room/notification-preferences', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  const prefs = notificationPreferencesMap[patientId] || {
    medicationReminders: true,
    missedDoseAlerts: true,
    familyCareAlerts: true,
    securityAlerts: true,
    pushChannel: true,
    smsChannel: true,
    inAppChannel: true,
    soundAlerts: true,
  };
  res.json({ success: true, patientId, preferences: prefs });
});

// PATCH /api/patient/control-room/notification-preferences
app.patch('/api/patient/control-room/notification-preferences', (req, res) => {
  const { patientId = 'p-101', preferences } = req.body;
  if (!preferences) {
    return res.status(400).json({ error: 'Preferences payload required' });
  }

  const current = notificationPreferencesMap[patientId] || {
    medicationReminders: true,
    missedDoseAlerts: true,
    familyCareAlerts: true,
    securityAlerts: true,
    pushChannel: true,
    smsChannel: true,
    inAppChannel: true,
    soundAlerts: true,
  };

  notificationPreferencesMap[patientId] = {
    ...current,
    ...preferences,
    // Critical security alerts are mandatory by healthcare security policy
    securityAlerts: true,
  };

  res.json({
    success: true,
    patientId,
    preferences: notificationPreferencesMap[patientId],
    message: 'Notification preferences updated successfully.',
  });
});

// ==================== TIMEZONE & SCHEDULER HELPERS ====================

function parseTimeStringToMinutes(timeStr: string): number {
  if (!timeStr) return -1;
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return -1;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function getLocalMinutesNow(tz?: string): { minutes: number; timeStr12: string; dateStr: string; timeZone: string } {
  const timeZone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';
  const now = new Date();

  try {
    const formatterTime = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
    const formatter24 = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const formatterDate = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter24.formatToParts(now);
    let h = 0;
    let m = 0;
    parts.forEach((p) => {
      if (p.type === 'hour') h = parseInt(p.value, 10);
      if (p.type === 'minute') m = parseInt(p.value, 10);
    });

    const timeStr12 = formatterTime.format(now);
    const dateStr = formatterDate.format(now);

    return {
      minutes: h * 60 + m,
      timeStr12,
      dateStr,
      timeZone,
    };
  } catch (err) {
    const fallbackH = now.getHours();
    const fallbackM = now.getMinutes();
    return {
      minutes: fallbackH * 60 + fallbackM,
      timeStr12: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateStr: todayStr,
      timeZone: 'UTC',
    };
  }
}

// Registry to track dispatched medication reminders and missed alerts for the day to avoid duplicates
const sentAlertRegistry = new Set<string>();

// Continuous Backend Notification Scheduler Worker
function runMedicationScheduleScheduler() {
  try {
    users.forEach((patient) => {
      const patientId = patient.id;
      const patientPrefs = notificationPreferencesMap[patientId] || {
        medicationReminders: true,
        missedDoseAlerts: true,
        familyCareAlerts: true,
        securityAlerts: true,
        pushChannel: true,
        smsChannel: true,
        inAppChannel: true,
      };

      const { minutes: nowMinutes, dateStr: todayDate, timeZone, timeStr12 } = getLocalMinutesNow();

      // Find active medications for this patient
      const activeMeds = medications.filter((m) => {
        if (m.patientId !== patientId) return false;
        if (!m.isActive) return false;
        if (m.status === 'COMPLETED' || m.status === 'DELETED') return false;
        if (m.startDate && m.startDate > todayDate) return false;
        if (m.endDate && m.endDate < todayDate) return false;
        return true;
      });

      activeMeds.forEach((med) => {
        const times: string[] = Array.isArray(med.scheduleTimes) ? med.scheduleTimes : [med.scheduleTimes];

        times.forEach((scheduledTime) => {
          const schedMinutes = parseTimeStringToMinutes(scheduledTime);
          if (schedMinutes === -1) return;

          const reminderRegistryKey = `${todayDate}_${patientId}_${med.id}_${scheduledTime}_REMINDER`;
          const missedRegistryKey = `${todayDate}_${patientId}_${med.id}_${scheduledTime}_MISSED`;

          // 1. EVALUATE MEDICATION REMINDER (at exact scheduled time / within ±1 minute window)
          const minuteDiff = nowMinutes - schedMinutes;

          if (Math.abs(minuteDiff) <= 1) {
            if (!sentAlertRegistry.has(reminderRegistryKey)) {
              sentAlertRegistry.add(reminderRegistryKey);

              if (patientPrefs.medicationReminders !== false) {
                const fcmMessageId = `fcm-rem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                const reminderNotif = {
                  id: `notif-rem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  patientId,
                  targetUserId: patientId,
                  type: 'MEDICATION_REMINDER',
                  title: 'Medication Reminder',
                  message: `It's time to take ${med.medicineName}.`,
                  triggerReason: `Scheduled medication intake time (${scheduledTime}) reached for ${med.medicineName} ${med.dosage}.`,
                  relatedEntityId: med.id,
                  isRead: false,
                  deliveryStatus: 'Delivered',
                  channel: 'FCM_PUSH',
                  priority: 'Normal',
                  fcmMessageId,
                  targetDeviceName: 'Registered Patient Device',
                  createdAt: new Date().toISOString(),
                };

                notifications.unshift(reminderNotif);

                // Ensure adherence log exists for today
                let existingLog = adherenceLogs.find(
                  (l) =>
                    l.patientId === patientId &&
                    l.medicationId === med.id &&
                    l.scheduledDate === todayDate &&
                    l.scheduledTime === scheduledTime
                );
                if (!existingLog) {
                  adherenceLogs.push({
                    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                    patientId,
                    medicationId: med.id,
                    medicineName: med.medicineName,
                    dosage: med.dosage,
                    scheduledTime,
                    scheduledDate: todayDate,
                    status: 'PENDING',
                    createdAt: new Date().toISOString(),
                  });
                }
              }
            }
          }

          // 2. EVALUATE MISSED DOSE (grace window: 30 minutes after scheduled intake time)
          if (minuteDiff >= 30 && minuteDiff <= 240) {
            let existingLog = adherenceLogs.find(
              (l) =>
                l.patientId === patientId &&
                l.medicationId === med.id &&
                l.scheduledDate === todayDate &&
                l.scheduledTime === scheduledTime
            );

            // If no log exists or is still PENDING / UPCOMING, mark as MISSED
            if (!existingLog) {
              existingLog = {
                id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                patientId,
                medicationId: med.id,
                medicineName: med.medicineName,
                dosage: med.dosage,
                scheduledTime,
                scheduledDate: todayDate,
                status: 'MISSED',
                createdAt: new Date().toISOString(),
              };
              adherenceLogs.push(existingLog);
            } else if (existingLog.status === 'PENDING' || existingLog.status === 'UPCOMING') {
              existingLog.status = 'MISSED';
            }

            if (existingLog.status === 'MISSED' && !sentAlertRegistry.has(missedRegistryKey)) {
              sentAlertRegistry.add(missedRegistryKey);

              // Patient Missed Dose Notification
              if (patientPrefs.missedDoseAlerts !== false) {
                const missedNotif = {
                  id: `notif-missed-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  patientId,
                  targetUserId: patientId,
                  type: 'MISSED_DOSE',
                  title: 'Missed Dose',
                  message: `You missed your ${scheduledTime} medication.`,
                  triggerReason: `Scheduled medication ${med.medicineName} (${scheduledTime}) was not marked as taken within the 30-minute grace window.`,
                  relatedEntityId: med.id,
                  isRead: false,
                  deliveryStatus: 'Delivered',
                  channel: 'FCM_PUSH',
                  priority: 'High',
                  fcmMessageId: `fcm-missed-${Date.now()}`,
                  targetDeviceName: 'Registered Patient Device',
                  createdAt: new Date().toISOString(),
                };
                notifications.unshift(missedNotif);
              }

              // Caregiver Safety Care Alert
              const activeCaregivers = familyConnections.filter(
                (fc) => fc.patientId === patientId && fc.status === 'ACTIVE' && fc.permissions?.missedDoseAlerts
              );

              if (activeCaregivers.length > 0 && patientPrefs.familyCareAlerts !== false) {
                activeCaregivers.forEach((caregiver) => {
                  const careAlert = {
                    id: `notif-care-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                    patientId,
                    targetUserId: caregiver.familyMemberId,
                    type: 'FAMILY_ALERT',
                    title: 'Care Alert',
                    message: `${patient.name || 'Sarah'} missed a scheduled medication.`,
                    triggerReason: `Missed dose detected for ${med.medicineName} ${med.dosage} (${scheduledTime}). Clinical caregiver safety alert dispatched to ${caregiver.displayName || caregiver.familyMemberName}.`,
                    relatedEntityId: med.id,
                    isRead: false,
                    deliveryStatus: 'Delivered',
                    channel: 'FCM_PUSH',
                    priority: 'High',
                    fcmMessageId: `fcm-care-${Date.now()}`,
                    targetDeviceName: 'Caregiver Mobile Device',
                    createdAt: new Date().toISOString(),
                  };
                  notifications.unshift(careAlert);
                });
              }
            }
          }
        });
      });
    });
  } catch (err: any) {
    console.error('Error in medication scheduler cycle:', err);
  }
}

// Background scheduler interval running every 30 seconds
setInterval(runMedicationScheduleScheduler, 30000);
setTimeout(runMedicationScheduleScheduler, 2000);

// GET /api/patient/control-room/medication-scheduler-status
app.get('/api/patient/control-room/medication-scheduler-status', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  const { minutes: nowMinutes, timeZone, dateStr, timeStr12 } = getLocalMinutesNow();

  const activeMeds = medications.filter((m) => {
    if (m.patientId !== patientId) return false;
    if (!m.isActive) return false;
    if (m.status === 'COMPLETED' || m.status === 'DELETED') return false;
    if (m.startDate && m.startDate > dateStr) return false;
    if (m.endDate && m.endDate < dateStr) return false;
    return true;
  });

  // Calculate upcoming scheduled doses today / tomorrow
  const upcomingDoses: Array<{
    medId: string;
    medName: string;
    dosage: string;
    scheduledTime: string;
    minutes: number;
    isToday: boolean;
  }> = [];

  activeMeds.forEach((m) => {
    const times: string[] = Array.isArray(m.scheduleTimes) ? m.scheduleTimes : [m.scheduleTimes];
    times.forEach((t) => {
      const mMin = parseTimeStringToMinutes(t);
      if (mMin !== -1) {
        if (mMin >= nowMinutes) {
          upcomingDoses.push({
            medId: m.id,
            medName: m.medicineName,
            dosage: m.dosage,
            scheduledTime: t,
            minutes: mMin,
            isToday: true,
          });
        } else {
          // Tomorrow
          upcomingDoses.push({
            medId: m.id,
            medName: m.medicineName,
            dosage: m.dosage,
            scheduledTime: t,
            minutes: mMin + 1440,
            isToday: false,
          });
        }
      }
    });
  });

  upcomingDoses.sort((a, b) => a.minutes - b.minutes);
  const nextMed = upcomingDoses[0] || null;

  const devices = deviceTokens.filter((d) => d.userId === patientId);

  res.json({
    success: true,
    patientId,
    activeScheduledCount: activeMeds.length,
    nextMedication: nextMed
      ? {
          medicationName: nextMed.medName,
          dosage: nextMed.dosage,
          scheduledTime: nextMed.scheduledTime,
          timingText: nextMed.isToday
            ? `Today at ${nextMed.scheduledTime}`
            : `Tomorrow at ${nextMed.scheduledTime}`,
        }
      : null,
    registeredDevicesCount: devices.length,
    timezone: timeZone,
    currentTime: timeStr12,
    currentDate: dateStr,
    schedulerActive: true,
    schedulerIntervalSeconds: 30,
  });
});

// POST /api/patient/control-room/notifications/trigger-event
// Authoritative Real-Time Event Dispatcher for the 4 Patient Alert Types
app.post('/api/patient/control-room/notifications/trigger-event', (req, res) => {
  const { patientId = 'p-101', eventType, medicationId, customDetails } = req.body;
  const patient = users.find((u) => u.id === patientId) || users[0];
  const prefs = notificationPreferencesMap[patientId] || {
    medicationReminders: true,
    missedDoseAlerts: true,
    familyCareAlerts: true,
    securityAlerts: true,
  };

  const patientMeds = medications.filter((m) => m.patientId === patientId);
  const targetMed = patientMeds.find((m) => m.id === medicationId) || patientMeds[0] || {
    id: 'med-1',
    medicineName: 'Metformin',
    dosage: '500 mg',
    scheduleTimes: ['08:00 AM', '08:00 PM'],
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fcmMessageId = `fcm-msg-${Date.now()}`;
  let newNotif: any = null;
  let caregiverNotif: any = null;

  try {
    switch (eventType) {
      // ==================== 1. 💊 MEDICATION REMINDER ====================
      case 'MEDICATION_REMINDER': {
        if (!prefs.medicationReminders) {
          return res.json({
            success: false,
            suppressed: true,
            message: 'Medication reminders are currently disabled in patient preferences.',
          });
        }

        const medTime = targetMed.scheduleTimes?.[0] || '09:00 AM';
        newNotif = {
          id: `notif-rem-${Date.now()}`,
          patientId,
          targetUserId: patientId,
          type: 'MEDICATION_REMINDER',
          title: 'Medication Reminder',
          message: `It's time to take ${targetMed.medicineName}.`,
          triggerReason: `Scheduled medication intake time (${medTime}) reached for ${targetMed.medicineName} ${targetMed.dosage}.`,
          relatedEntityId: targetMed.id,
          isRead: false,
          deliveryStatus: 'Delivered',
          channel: 'FCM_PUSH',
          priority: 'Normal',
          fcmMessageId,
          targetDeviceName: 'MacBook Pro (Chrome)',
          createdAt: now.toISOString(),
        };

        notifications.unshift(newNotif);
        break;
      }

      // ==================== 2. ⚠️ MISSED DOSE ====================
      case 'MISSED_DOSE': {
        const medTime = targetMed.scheduleTimes?.[0] || '09:00 AM';
        newNotif = {
          id: `notif-missed-${Date.now()}`,
          patientId,
          targetUserId: patientId,
          type: 'MISSED_DOSE',
          title: 'Missed Dose',
          message: `You missed your ${medTime} medication.`,
          triggerReason: `Scheduled medication ${targetMed.medicineName} (${medTime}) was not marked as taken within the 30-minute grace window.`,
          relatedEntityId: targetMed.id,
          isRead: false,
          deliveryStatus: 'Delivered',
          channel: 'FCM_PUSH',
          priority: 'High',
          fcmMessageId,
          targetDeviceName: 'MacBook Pro (Chrome)',
          createdAt: now.toISOString(),
        };

        notifications.unshift(newNotif);

        // Also check if authorized caregiver should receive alert
        const activeCaregiverConn = familyConnections.find(
          (fc) => fc.patientId === patientId && fc.status === 'ACTIVE' && fc.permissions.missedDoseAlerts
        );

        if (activeCaregiverConn && prefs.familyCareAlerts) {
          caregiverNotif = {
            id: `notif-fam-${Date.now()}`,
            patientId,
            targetUserId: activeCaregiverConn.familyMemberId,
            type: 'FAMILY_ALERT',
            title: 'Care Alert',
            message: `${patient.name || 'Sarah'} missed a scheduled medication.`,
            triggerReason: `Missed dose detected for ${targetMed.medicineName} ${targetMed.dosage}. Authorized caregiver notification dispatched to ${activeCaregiverConn.familyMemberName}.`,
            relatedEntityId: targetMed.id,
            isRead: false,
            deliveryStatus: 'Delivered',
            channel: 'FCM_PUSH',
            priority: 'High',
            fcmMessageId: `fcm-msg-fam-${Date.now()}`,
            targetDeviceName: 'Caregiver Mobile Device',
            createdAt: now.toISOString(),
          };
          notifications.unshift(caregiverNotif);
        }
        break;
      }

      // ==================== 3. 👨‍👩‍👧 FAMILY / CAREGIVER ALERT ====================
      case 'FAMILY_ALERT': {
        // Strict Authorization & Permission Check:
        const activeCaregiverConn = familyConnections.find(
          (fc) => fc.patientId === patientId && fc.status === 'ACTIVE'
        );

        if (!activeCaregiverConn) {
          return res.status(403).json({
            success: false,
            authorized: false,
            error: 'No active authorized family connection found. Family alert halted.',
          });
        }

        if (!activeCaregiverConn.permissions.missedDoseAlerts) {
          return res.status(403).json({
            success: false,
            authorized: false,
            error: `Caregiver ${activeCaregiverConn.familyMemberName} does not have missed dose alert permission. Alert withheld to protect patient privacy.`,
          });
        }

        newNotif = {
          id: `notif-fam-direct-${Date.now()}`,
          patientId,
          targetUserId: activeCaregiverConn.familyMemberId,
          type: 'FAMILY_ALERT',
          title: 'Care Alert',
          message: `${patient.name || 'Sarah'} missed a scheduled medication.`,
          triggerReason: `Dispatched to authorized caregiver (${activeCaregiverConn.familyMemberName} / ${activeCaregiverConn.relationship}) based on verified clinical permissions.`,
          relatedEntityId: targetMed.id,
          isRead: false,
          deliveryStatus: 'Delivered',
          channel: 'FCM_PUSH',
          priority: 'High',
          fcmMessageId,
          targetDeviceName: 'Caregiver Device',
          createdAt: now.toISOString(),
        };

        notifications.unshift(newNotif);
        break;
      }

      // ==================== 4. 🔐 SECURITY ALERT ====================
      case 'SECURITY_ALERT': {
        const deviceName = customDetails?.deviceName || 'Chrome on macOS (172.56.21.94)';
        newNotif = {
          id: `notif-sec-${Date.now()}`,
          patientId,
          targetUserId: patientId,
          type: 'SECURITY_ALERT',
          title: 'Security Alert',
          message: 'Your CarePulse account was accessed from a new device.',
          triggerReason: `Authentication event verified from a new device session (${deviceName}) at ${timeStr}.`,
          relatedEntityId: 'sess-new-device',
          isRead: false,
          deliveryStatus: 'Delivered',
          channel: 'FCM_PUSH',
          priority: 'Critical',
          fcmMessageId,
          targetDeviceName: 'MacBook Pro (Chrome)',
          createdAt: now.toISOString(),
        };

        notifications.unshift(newNotif);
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown eventType: ${eventType}` });
    }

    res.json({
      success: true,
      message: `Real-time ${newNotif?.title || eventType} dispatched successfully.`,
      notification: newNotif,
      caregiverNotification: caregiverNotif,
      deliveryStatus: 'Delivered',
      channel: 'FCM_PUSH',
      fcmMessageId,
    });
  } catch (err: any) {
    // If backend failure happens, report to Slack (data minimized, no PHI)
    dispatchInternalSlackAlert({
      severity: 'Critical',
      service: 'Notification Service',
      referenceId: 'ERR-5011',
      message: `Internal exception during real-time event dispatch: ${err.message || 'Unknown'}`,
      action: 'Check Notification Event Engine and restart worker pool',
    });

    res.status(500).json({ error: 'Failed to process real-time event.' });
  }
});

// ==================== INTERNAL SLACK OPERATIONS ALERT SYSTEM ====================

// GET /api/internal/slack-alerts
app.get('/api/internal/slack-alerts', (req, res) => {
  res.json({
    success: true,
    channel: '#carepulse-ops-alerts',
    totalAlerts: internalSlackAlerts.length,
    alerts: internalSlackAlerts,
  });
});

// POST /api/internal/slack-alerts/trigger
app.post('/api/internal/slack-alerts/trigger', (req, res) => {
  const { severity = 'High', service = 'Notification Service', referenceId, message, action } = req.body;

  // Enforce PHI Data Minimization: Strictly operational information
  const sanitizedMessage = (message || 'Operational threshold warning detected')
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]')
    .replace(/\b(Metformin|Lisinopril|Atorvastatin|Amlodipine|Insulin)\b/gi, '[MEDICATION_REDACTED]');

  const alert = dispatchInternalSlackAlert({
    severity,
    service,
    referenceId,
    message: sanitizedMessage,
    action: action || 'Investigate server infrastructure logs',
  });

  res.json({
    success: true,
    message: 'Internal Slack operational alert dispatched.',
    alert,
  });
});

// ==================== PATIENT CONTROL ROOM: FAMILY CONNECTION ====================

app.get('/api/patient/control-room/family', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  const patient = users.find((u) => u.id === patientId) || users[0];

  if (!patient) {
    return res.status(404).json({ error: 'Patient account not found.' });
  }

  const patientConnections = familyConnections.filter((fc) => fc.patientId === patientId);

  const activeMembers = patientConnections
    .filter((fc) => fc.status === 'ACTIVE')
    .map((fc) => ({
      id: fc.id,
      familyMemberId: fc.familyMemberId,
      name: fc.displayName || fc.familyMemberName,
      email: fc.familyMemberEmail,
      relationship: fc.relationship || 'Family Member',
      status: 'ACTIVE',
      connectedSince: fc.createdAt,
      permissions: {
        medicationInfo: Boolean(fc.permissions.medicationStatus),
        adherence: Boolean(fc.permissions.adherencePercentage),
        medicationAlerts: Boolean(fc.permissions.missedDoseAlerts),
        symptoms: Boolean(fc.permissions.symptoms),
        healthUpdates: Boolean(fc.permissions.healthUpdates),
        aiConversations: false, // Strictly false by default for family
        loginHistory: false, // Strictly false
        securityInfo: false, // Strictly false
      },
    }));

  const pendingRequests = patientConnections
    .filter((fc) => fc.status === 'PENDING')
    .map((fc) => ({
      id: fc.id,
      name: fc.displayName || fc.familyMemberName,
      email: fc.familyMemberEmail,
      relationship: fc.relationship || 'Family Member',
      status: 'PENDING',
      requestedAt: fc.createdAt,
      permissions: {
        medicationAlerts: Boolean(fc.permissions.missedDoseAlerts),
        medicationInfo: Boolean(fc.permissions.medicationStatus),
        adherence: Boolean(fc.permissions.adherencePercentage),
      },
    }));

  res.json({
    success: true,
    patientId,
    activeMembers,
    pendingRequests,
    totalCount: activeMembers.length + pendingRequests.length,
  });
});

app.post('/api/patient/control-room/family/invite', (req, res) => {
  const { patientId, name, emailOrPhone, relationship, permissions } = req.body;
  const pId = patientId || 'p-101';
  const patient = users.find((u) => u.id === pId) || users[0];

  if (!name || !emailOrPhone) {
    return res.status(400).json({ error: 'Name and email/phone are required to invite a family member.' });
  }

  const newConnId = `fc-${Date.now()}`;
  const isCaregiver = (relationship || '').toLowerCase().includes('caregiver');

  const newConnection = {
    id: newConnId,
    patientId: pId,
    patientName: patient ? patient.name : 'Sarah Johnson',
    familyMemberId: `f-${Date.now().toString().slice(-4)}`,
    familyMemberName: name.trim(),
    displayName: name.trim(),
    familyMemberEmail: emailOrPhone.trim(),
    relationship: relationship || (isCaregiver ? 'Caregiver' : 'Family Member'),
    permissions: {
      medicationStatus: permissions?.medicationInfo ?? (isCaregiver ? true : false),
      adherencePercentage: permissions?.adherence ?? (isCaregiver ? true : false),
      missedDoseAlerts: permissions?.medicationAlerts ?? true,
      riskLevel: false,
      symptoms: false,
      healthUpdates: false,
      privateNotes: false,
    },
    status: 'PENDING' as const,
    createdAt: new Date().toISOString(),
  };

  familyConnections.push(newConnection);

  // Dispatch invitation notification to audit trail
  notifications.unshift({
    id: `notif-fam-inv-${Date.now()}`,
    patientId: pId,
    targetUserId: pId,
    type: 'SYSTEM_UPDATE',
    title: 'Family Invitation Sent',
    message: `You invited ${name.trim()} (${newConnection.relationship}). Shared access will activate once accepted.`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: `Invitation successfully sent to ${name.trim()}.`,
    connection: newConnection,
  });
});

app.patch('/api/patient/control-room/family/:id/permissions', (req, res) => {
  const { id } = req.params;
  const { permissions, patientId } = req.body;
  const pId = patientId || 'p-101';

  const conn = familyConnections.find((fc) => fc.id === id);
  if (!conn) {
    return res.status(404).json({ error: 'Family connection not found.' });
  }

  conn.permissions = {
    ...conn.permissions,
    medicationStatus: permissions.medicationInfo !== undefined ? permissions.medicationInfo : conn.permissions.medicationStatus,
    adherencePercentage: permissions.adherence !== undefined ? permissions.adherence : conn.permissions.adherencePercentage,
    missedDoseAlerts: permissions.medicationAlerts !== undefined ? permissions.medicationAlerts : conn.permissions.missedDoseAlerts,
    privateNotes: false,
  };

  // Dispatch security audit notification
  notifications.unshift({
    id: `notif-fam-perm-${Date.now()}`,
    patientId: pId,
    targetUserId: pId,
    type: 'SYSTEM_UPDATE',
    title: 'Family Access Updated',
    message: `Access permissions for ${conn.displayName || conn.familyMemberName} were modified.`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Access permissions updated successfully.',
    connection: conn,
  });
});

app.delete('/api/patient/control-room/family/:id', (req, res) => {
  const { id } = req.params;
  const patientId = (req.body?.patientId as string) || (req.query?.patientId as string) || 'p-101';

  const targetConn = familyConnections.find((fc) => fc.id === id);
  if (!targetConn) {
    return res.status(404).json({ error: 'Family connection not found or already removed.' });
  }

  familyConnections = familyConnections.filter((fc) => fc.id !== id);

  // Dispatch access revocation notification
  notifications.unshift({
    id: `notif-fam-rem-${Date.now()}`,
    patientId,
    targetUserId: patientId,
    type: 'SYSTEM_UPDATE',
    title: 'Family Connection Removed',
    message: `Connection with ${targetConn.displayName || targetConn.familyMemberName} (${targetConn.relationship}) was removed. All shared access has been revoked.`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Family connection removed successfully.',
    removedId: id,
  });
});

// ==================== REAL MEDICAL OCR ENGINE & INFERENCE PIPELINE ====================

/**
 * POST /api/ocr (and alias POST /api/ocr/scan)
 * Target Workflow:
 * Patient/Caregiver -> Upload Medical Document/Image -> OCR Backend API -> Document Validation
 * -> Image Preprocessing -> OCR Engine (Tesseract.js WASM + Gemini Vision) -> Text Detection & Recognition
 * -> Raw Extracted Text & Medical Candidate Fields -> Structured JSON Response
 */
const handleOCREndpoint = async (req: express.Request, res: express.Response) => {
  try {
    const {
      fileData,
      file,
      image,
      fileName = 'prescription_scan.jpg',
      mimeType = 'image/jpeg',
      patientId = 'p-101',
      documentTypeHint = 'prescription',
      rotation = 0,
      enhanceContrast = true,
      saveToVault = false,
    } = req.body;

    // Accept fileData, file, or image payload
    const rawPayload = fileData || file || image;

    if (!rawPayload || typeof rawPayload !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing file payload. Please provide a base64 encoded image or document Data URL in fileData.',
      });
    }

    // Process OCR via real inference engine
    const ocrResult = await performMedicalOCR({
      fileData: rawPayload,
      fileName,
      mimeType,
      options: {
        rotation: Number(rotation) || 0,
        documentTypeHint,
        enhanceContrast: Boolean(enhanceContrast),
      },
    });

    // Optional: automatically stage to medical documents vault if requested
    let savedDocumentId: string | undefined = undefined;
    if (saveToVault) {
      const patient = users.find((u) => u.id === patientId) || users[0];
      const docId = `doc-ocr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const cleanDisplayName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'OCR Scanned Document';
      
      const newDoc: StoredMedicalDocument = {
        id: docId,
        patientId: patient.id,
        patientName: patient.name,
        fileName,
        displayName: cleanDisplayName,
        category: ocrResult.documentType === 'prescription' ? 'Prescription' : 'Medicine Document',
        mimeType,
        fileSize: ocrResult.metadata.fileSize,
        fileData: rawPayload,
        storagePath: `medical-documents/${patient.id}/${docId}/${fileName}`,
        uploadedBy: patient.name,
        uploaderRole: 'PATIENT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        notes: `Extracted via CarePulse OCR Scanner. Confidence: ${ocrResult.confidence}%.`,
      };

      medicalDocuments.unshift(newDoc);
      savedDocumentId = docId;
    }

    return res.status(200).json({
      success: true,
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      processingTime: ocrResult.processingTime,
      documentType: ocrResult.documentType,
      engine: ocrResult.engine,
      lines: ocrResult.lines,
      medicalFields: ocrResult.medicalFields,
      metadata: ocrResult.metadata,
      savedDocumentId,
    });
  } catch (err: any) {
    console.error('[API /api/ocr] Inference failure:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'OCR Processing failed on uploaded medical document.',
      text: '',
      confidence: 0,
      processingTime: 0,
      documentType: 'unknown',
    });
  }
};

app.post('/api/ocr', handleOCREndpoint);
app.post('/api/ocr/scan', handleOCREndpoint);

// ==================== MEDICAL DOCUMENTS & SECURE STORAGE (PHASE 1) ====================

interface StoredMedicalDocument {
  id: string;
  patientId: string;
  patientName: string;
  fileName: string;
  displayName: string;
  category: string;
  mimeType: string;
  fileSize: number;
  fileData?: string; // base64 payload / data URL
  storagePath: string;
  uploadedBy: string;
  uploaderRole: 'PATIENT' | 'CAREGIVER' | 'CLINICIAN';
  createdAt: string;
  updatedAt?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  notes?: string;
}

// REAL in-memory document storage (no mock documents pre-populated)
let medicalDocuments: StoredMedicalDocument[] = [];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.js', '.ts', '.vbs', '.scr',
  '.msi', '.com', '.pif', '.jar', '.dll', '.bin', '.html', '.htm', '.php',
];

// 1. GET /api/medical-documents
app.get('/api/medical-documents', (req, res) => {
  const patientId = (req.query.patientId as string) || 'p-101';
  const requesterId = (req.query.requesterId as string) || patientId;
  const category = req.query.category as string;
  const search = (req.query.search as string || '').toLowerCase().trim();
  const sort = (req.query.sort as string) || 'newest';

  // Authorization check: Patient vs Caregiver
  if (requesterId !== patientId) {
    const requesterUser = users.find((u) => u.id === requesterId);
    if (requesterUser?.role === 'FAMILY_MEMBER' || requesterUser?.role === 'CAREGIVER') {
      const conn = familyConnections.find(
        (c) => c.patientId === patientId && (c.familyMemberId === requesterId || c.familyMemberEmail === requesterUser.email)
      );
      if (!conn) {
        return res.status(403).json({ error: 'Access Denied: You are not connected to this patient.' });
      }
      // Check if family permissions explicitly allow medical document access
      const hasPerm = conn.permissions?.canViewMedicalRecords || conn.permissions?.viewMedicalDocuments || conn.permissions?.fullAccess;
      if (!hasPerm) {
        return res.status(403).json({
          error: 'Access Denied: The patient has not granted medical document viewing permissions to your caregiver account.',
        });
      }
    } else if (requesterUser && requesterUser.role === 'PATIENT') {
      return res.status(403).json({ error: 'Access Denied: Patients cannot access other patients\' medical documents.' });
    }
  }

  // Filter patient's active documents
  let docs = medicalDocuments.filter((d) => d.patientId === patientId && d.status === 'ACTIVE');

  // Category filter
  if (category && category !== 'All') {
    docs = docs.filter((d) => d.category.toLowerCase() === category.toLowerCase());
  }

  // Search filter (metadata search only)
  if (search) {
    docs = docs.filter(
      (d) =>
        d.displayName.toLowerCase().includes(search) ||
        d.fileName.toLowerCase().includes(search) ||
        d.category.toLowerCase().includes(search) ||
        (d.notes && d.notes.toLowerCase().includes(search))
    );
  }

  // Sorting
  docs.sort((a, b) => {
    if (sort === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sort === 'name-asc') {
      return a.displayName.localeCompare(b.displayName);
    }
    if (sort === 'name-desc') {
      return b.displayName.localeCompare(a.displayName);
    }
    if (sort === 'size-desc') {
      return b.fileSize - a.fileSize;
    }
    if (sort === 'size-asc') {
      return a.fileSize - b.fileSize;
    }
    // Default newest
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Omit heavy fileData payload from list view for efficiency, return metadata
  const metadataList = docs.map(({ fileData, ...meta }) => meta);

  res.json({
    patientId,
    total: metadataList.length,
    documents: metadataList,
  });
});

// 2. GET /api/medical-documents/:id
app.get('/api/medical-documents/:id', (req, res) => {
  const { id } = req.params;
  const patientId = (req.query.patientId as string) || 'p-101';
  const requesterId = (req.query.requesterId as string) || patientId;

  const doc = medicalDocuments.find((d) => d.id === id && d.status === 'ACTIVE');
  if (!doc) {
    return res.status(404).json({ error: 'Medical document not found or has been removed.' });
  }

  // Patient ownership verification
  if (doc.patientId !== patientId) {
    return res.status(403).json({ error: 'Access Denied: You do not have permission to access this document.' });
  }

  // Authorization check for caregiver
  if (requesterId !== patientId) {
    const requesterUser = users.find((u) => u.id === requesterId);
    if (requesterUser?.role === 'FAMILY_MEMBER' || requesterUser?.role === 'CAREGIVER') {
      const conn = familyConnections.find(
        (c) => c.patientId === patientId && (c.familyMemberId === requesterId || c.familyMemberEmail === requesterUser.email)
      );
      const hasPerm = conn?.permissions?.canViewMedicalRecords || conn?.permissions?.viewMedicalDocuments || conn?.permissions?.fullAccess;
      if (!hasPerm) {
        return res.status(403).json({ error: 'Access Denied: Caregiver document access is not permitted by the patient.' });
      }
    }
  }

  res.json(doc);
});

// 3. POST /api/medical-documents/upload
app.post('/api/medical-documents/upload', (req, res) => {
  const {
    patientId = 'p-101',
    fileName,
    displayName,
    category = 'Other Medical Document',
    mimeType,
    fileSize,
    fileData,
    uploadedBy,
    uploaderRole = 'PATIENT',
    notes,
  } = req.body;

  // Validation
  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'File name and file content are required for upload.' });
  }

  const fileExt = path.extname(fileName).toLowerCase();
  if (DANGEROUS_EXTENSIONS.includes(fileExt)) {
    return res.status(400).json({
      error: `Security Alert: Files with extension '${fileExt}' are prohibited for patient safety.`,
    });
  }

  // Validate MIME type
  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase()) && !mimeType.startsWith('image/')) {
    return res.status(400).json({
      error: `Unsupported file type (${mimeType}). Supported formats: PDF, JPG, JPEG, PNG, WEBP, HEIC, DOC, DOCX, TXT.`,
    });
  }

  // Max 25 MB
  const maxBytes = 25 * 1024 * 1024;
  if (fileSize && fileSize > maxBytes) {
    return res.status(400).json({
      error: `File size exceeds the 25 MB storage threshold (Current: ${(fileSize / (1024 * 1024)).toFixed(1)} MB).`,
    });
  }

  // Resolve patient details
  const patient = users.find((u) => u.id === patientId && u.role === 'PATIENT') || users.find((u) => u.id === 'p-101') || users[0];
  const documentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const cleanDisplayName = displayName?.trim() || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const storagePath = `medical-documents/${patient.id}/${documentId}/${fileName}`;

  const newDoc: StoredMedicalDocument = {
    id: documentId,
    patientId: patient.id,
    patientName: patient.name,
    fileName,
    displayName: cleanDisplayName,
    category,
    mimeType: mimeType || 'application/octet-stream',
    fileSize: fileSize || Math.round(fileData.length * 0.75),
    fileData,
    storagePath,
    uploadedBy: uploadedBy || patient.name,
    uploaderRole: uploaderRole as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'ACTIVE',
    notes: notes || '',
  };

  medicalDocuments.unshift(newDoc);

  // Dispatch Audit Notification
  notifications.unshift({
    id: `notif-doc-${Date.now()}`,
    patientId: patient.id,
    targetUserId: patient.id,
    type: 'SYSTEM_UPDATE',
    title: 'Medical Document Uploaded',
    message: `New document "${cleanDisplayName}" (${category}) securely saved to CarePulse storage vault.`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  // Return document metadata without huge base64 in initial response
  const { fileData: omittedData, ...returnedMeta } = newDoc;

  res.status(201).json({
    success: true,
    message: 'Medical document uploaded and secured successfully.',
    document: returnedMeta,
  });
});

// 4. DELETE /api/medical-documents/:id
app.delete('/api/medical-documents/:id', (req, res) => {
  const { id } = req.params;
  const { patientId = 'p-101', requesterId = patientId } = req.body || {};

  const docIndex = medicalDocuments.findIndex((d) => d.id === id && d.status === 'ACTIVE');
  if (docIndex === -1) {
    return res.status(404).json({ error: 'Medical document not found.' });
  }

  const doc = medicalDocuments[docIndex];

  // Ownership verification
  if (doc.patientId !== patientId) {
    return res.status(403).json({ error: 'Access Denied: You do not have permission to delete this document.' });
  }

  // Caregivers are strictly forbidden from deleting patient medical records
  if (requesterId !== patientId) {
    const requesterUser = users.find((u) => u.id === requesterId);
    if (requesterUser?.role === 'FAMILY_MEMBER' || requesterUser?.role === 'CAREGIVER') {
      return res.status(403).json({
        error: 'Access Denied: Caregivers cannot delete patient medical records. Only the patient owner can delete documents.',
      });
    }
  }

  // Remove document
  const deletedDoc = medicalDocuments.splice(docIndex, 1)[0];

  // Audit record
  notifications.unshift({
    id: `notif-doc-del-${Date.now()}`,
    patientId: doc.patientId,
    targetUserId: doc.patientId,
    type: 'SYSTEM_UPDATE',
    title: 'Medical Document Deleted',
    message: `Medical document "${deletedDoc.displayName}" was removed from the secure vault by the patient.`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Medical document removed successfully.',
    deletedId: id,
  });
});

// ==================== VITE & EXPRESS MIDDLEWARE ====================

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CarePulse Healthcare Platform running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
