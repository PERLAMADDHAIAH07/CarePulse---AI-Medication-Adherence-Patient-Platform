export type Role = 'PATIENT' | 'FAMILY_MEMBER';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  familyInviteCode: string; // E.g. "A7K9P2" for patients
  linkedPatientId?: string; // For family members connected to a patient
  avatarUrl?: string;
  createdAt: string;
}

export interface Medication {
  id: string;
  patientId: string;
  medicineName: string;
  genericName?: string;
  dosage: string;
  strength?: string;
  dosageAmount?: string;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  manufacturer?: string;
  mrp?: string;
  frequency?: string;
  scheduleTimes: string[]; // E.g. ["08:00 AM", "08:00 PM"]
  startDate: string;
  endDate?: string;
  isActive: boolean;
  instructions?: string;
  pillColor?: string;
  category?: string; // E.g. "Blood Pressure", "Diabetes", "Cholesterol"
  source?: 'ocr' | 'manual' | 'doctor';
  createdAt: string;
  updatedAt?: string;
}

export type DoseStatus = 'TAKEN' | 'MISSED' | 'SKIPPED' | 'DELAYED' | 'PENDING' | 'UPCOMING';

export type HistoryEventType =
  | 'MEDICINE_CREATED'
  | 'MEDICINE_UPDATED'
  | 'MEDICINE_DELETED'
  | 'MEDICINE_ACTIVATED'
  | 'MEDICINE_DISABLED'
  | 'SCHEDULE_CREATED'
  | 'SCHEDULE_UPDATED'
  | 'REMINDER_SENT'
  | 'REMINDER_OPENED'
  | 'DOSE_TAKEN'
  | 'DOSE_MISSED'
  | 'DOSE_SKIPPED'
  | 'DOSE_DELAYED'
  | 'AI_RISK_UPDATED'
  | 'FAMILY_ALERT_SENT'
  | 'NOTIFICATION_DELIVERED'
  | 'MEDICATION_COMPLETED'
  | 'MEDICATION_EXPIRED'
  | 'MEDICATION_RESTARTED';

export interface HistoryEvent {
  id: string;
  patientId: string;
  medicationId?: string;
  medicineName: string;
  dosage?: string;
  eventType: HistoryEventType;
  eventTitle: string;
  scheduledTime?: string;
  actualTime?: string;
  status: 'TAKEN' | 'MISSED' | 'SKIPPED' | 'DELAYED' | 'CREATED' | 'UPDATED' | 'DELETED' | 'ALERT' | 'REMINDER' | 'ACTIVATED' | 'DISABLED' | 'COMPLETED' | 'EXPIRED';
  createdDate: string;
  updatedDate?: string;
  timestamp: string;
  reminderStatus?: 'Delivered' | 'Opened' | 'Pending' | 'Scheduled' | 'Failed';
  adherenceImpact?: string;
  aiRiskImpact?: string;
  notes?: string;
  notificationStatus?: string;
}

export interface AdherenceLog {
  id: string;
  patientId: string;
  medicationId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string; // E.g. "08:00 AM"
  scheduledDate: string; // E.g. "2026-08-03"
  status: DoseStatus;
  takenAt?: string;
  createdAt: string;
}

export interface AdherenceSummary {
  todayPercentage: number;
  weeklyPercentage: number;
  monthlyPercentage: number;
  totalScheduledToday: number;
  takenToday: number;
  missedToday: number;
  pendingToday: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface Symptom {
  id: string;
  patientId: string;
  symptomText: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes?: string;
  date: string;
  createdAt: string;
}

export interface HealthUpdate {
  id: string;
  patientId: string;
  note: string;
  wellBeingScore: number; // 1 to 5
  date: string;
  createdAt: string;
}

export interface FamilyPermissions {
  medicationStatus: boolean;
  adherencePercentage: boolean;
  missedDoseAlerts: boolean;
  riskLevel: boolean;
  symptoms: boolean;
  healthUpdates: boolean;
  privateNotes: boolean;
  aiConversations: boolean;
}

export interface FamilyConnection {
  id: string;
  patientId: string;
  patientName: string;
  familyMemberId: string;
  familyMemberName: string;
  displayName?: string;
  familyMemberEmail: string;
  phone?: string;
  relationship: string; // E.g. "Son", "Spouse", "Daughter", "Caregiver"
  permissions: FamilyPermissions;
  status: 'ACTIVE' | 'PENDING';
  createdAt: string;
}

export type RiskLevel = 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK';

export interface RiskAssessment {
  patientId: string;
  riskLevel: RiskLevel;
  score: number; // 0 (best adherence) to 100 (highest risk)
  reasons: string[];
  recommendations: string[];
  calculatedAt: string;
}

export interface AlertNotification {
  id: string;
  patientId: string;
  targetUserId: string;
  type: 'MEDICATION_REMINDER' | 'MISSED_DOSE' | 'FAMILY_ALERT' | 'SECURITY_ALERT' | 'SYSTEM_UPDATE' | 'RISK_UPDATE';
  title: string;
  message: string;
  triggerReason?: string;
  relatedEntityId?: string;
  isRead: boolean;
  readAt?: string;
  deliveryStatus?: 'Delivered' | 'Sent' | 'Pending' | 'Failed' | 'Read';
  channel?: 'FCM_PUSH' | 'IN_APP' | 'SMS';
  priority?: 'Normal' | 'High' | 'Critical';
  fcmMessageId?: string;
  providerMessageId?: string;
  recipientPhoneReference?: string;
  targetDeviceName?: string;
  createdAt: string;
}

export interface NotificationPreference {
  medicationReminders: boolean;
  missedDoseAlerts: boolean;
  familyCareAlerts: boolean;
  securityAlerts: boolean;
  pushChannel: boolean;
  smsChannel: boolean;
  inAppChannel: boolean;
  soundAlerts: boolean;
}

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

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AIConversation {
  id: string;
  patientId: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface NavHistoryEntry {
  tab: string;
  subView?: string;
  label?: string;
  params?: Record<string, any>;
  timestamp?: number;
}

export type MedicalDocumentCategory =
  | 'Medical Certificate'
  | 'Prescription'
  | 'Lab Report'
  | 'Medical Image / Scan'
  | 'Discharge Summary'
  | 'Medicine Document'
  | 'Other Medical Document';

export interface MedicalDocument {
  id: string;
  patientId: string;
  patientName?: string;
  fileName: string;
  displayName: string;
  category: MedicalDocumentCategory;
  mimeType: string;
  fileSize: number; // in bytes
  fileData?: string; // base64 / data URL for secure rendering
  storagePath: string;
  uploadedBy: string;
  uploaderRole: 'PATIENT' | 'CAREGIVER' | 'CLINICIAN';
  createdAt: string;
  updatedAt?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  notes?: string;
  tags?: string[];
}

export interface OCRDetectedMedication {
  medicineName: string;
  genericName?: string | null;
  strength?: string | null;
  dosageAmount?: string;
  dosage: string;
  batchNumber?: string | null;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  manufacturer?: string | null;
  mrp?: string | null;
  frequency: string;
  scheduleTimes: string[];
  startDate?: string;
  endDate?: string;
  instructions?: string;
  category?: string;
  confidence?: number;
  pillColor?: string;
  rawText?: string;
}

export interface OCRMedicalFields {
  detectedMedications: OCRDetectedMedication[];
  batchNumber?: string | null;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  manufacturer?: string | null;
  mrp?: string | null;
  doctorName?: string;
  patientName?: string;
  date?: string;
  notes?: string;
  warnings?: string[];
  institution?: string;
}

export interface OCRResponse {
  success: boolean;
  text: string;
  confidence: number;
  processingTime: number; // in milliseconds
  documentType: string;
  engine?: string;
  lines: string[];
  medicalFields?: OCRMedicalFields;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    wordCount?: number;
    lineCount?: number;
    rotation?: number;
    preprocessed?: boolean;
  };
  savedDocumentId?: string;
  error?: string;
}


