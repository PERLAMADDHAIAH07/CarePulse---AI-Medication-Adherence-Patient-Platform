import React, { useState, useRef, useCallback } from 'react';
import {
  ScanLine,
  Upload,
  Camera,
  Image as ImageIcon,
  X,
  FileText,
  AlertCircle,
  Pill,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Clock,
  Activity,
  Copy,
  Check,
  Plus,
  Trash2,
  FolderOpen,
  Calendar,
  AlertTriangle,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { User as UserType, Medication, OCRResponse, OCRDetectedMedication, OCRMedicalFields } from '../types';
import { api } from '../services/api';
import { BackButton } from './BackButton';

interface OCRMedicineScannerProps {
  currentUser: UserType;
  linkedPatient?: UserType | null;
  medications?: Medication[];
  onAddMedication?: (med: Partial<Medication>) => Promise<void>;
  onNavigate?: (tab: string) => void;
  onRefreshData?: () => void;
}

const DURATION_SHORTCUTS = [
  { label: '3 Days', days: 3 },
  { label: '5 Days', days: 5 },
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
  { label: 'Ongoing', days: 0 },
  { label: 'Custom', days: -1 },
];

const STANDARD_DOSAGE_UNITS = [
  '1 tablet',
  '2 tablets',
  '0.5 tablet',
  '1 capsule',
  '2 capsules',
  '5 ml',
  '10 ml',
  '15 ml',
  '1 drop',
  '2 drops',
  '1 puff',
  '2 puffs',
  '1 sachet',
  '1 injection',
  '1 application',
];

const CATEGORY_OPTIONS = [
  'Prescription',
  'Blood Pressure',
  'Diabetes',
  'Cholesterol',
  'Antibiotic',
  'Heart Care',
  'Vitamin / Supplement',
  'Pain Relief',
  'General Care',
  'Other',
];

export const OCRMedicineScanner: React.FC<OCRMedicineScannerProps> = ({
  currentUser,
  linkedPatient,
  medications = [],
  onAddMedication,
  onNavigate,
  onRefreshData,
}) => {
  const activePatient = currentUser.role === 'PATIENT' ? currentUser : (linkedPatient || currentUser);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string; type: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState(0);
  
  // OCR processing state
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Verification & Candidate Editing State
  const [activeTab, setActiveTab] = useState<'candidates' | 'rawText'>('candidates');
  const [editableMedications, setEditableMedications] = useState<OCRDetectedMedication[]>([]);
  const [isSavingMedication, setIsSavingMedication] = useState<number | null>(null);
  const [savedMedications, setSavedMedications] = useState<string[]>([]);
  const [lastAddedMed, setLastAddedMed] = useState<{
    name: string;
    dosage: string;
    scheduleTimes: string[];
  } | null>(null);

  // Custom time input state per card
  const [showAddTimeIndex, setShowAddTimeIndex] = useState<number | null>(null);
  const [newTimeInputValue, setNewTimeInputValue] = useState<Record<number, string>>({});
  const [customDosageUnits, setCustomDosageUnits] = useState<Record<number, boolean>>({});

  // Duplicate Conflict Modal State
  const [duplicateConflict, setDuplicateConflict] = useState<{
    med: OCRDetectedMedication;
    index: number;
    existingMed: Medication;
  } | null>(null);

  // Document Vault save state
  const [isSavingToVault, setIsSavingToVault] = useState(false);
  const [vaultSaved, setVaultSaved] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file selection
  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid image file (PNG, JPG, JPEG, WEBP) or document.');
      return;
    }

    setSelectedFile(file);
    setFileDetails({
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type || 'image/jpeg',
    });
    setRotation(0);
    setOcrResult(null);
    setScanError(null);
    setEditableMedications([]);
    setSavedMedications([]);
    setLastAddedMed(null);
    setVaultSaved(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setFileDetails(null);
    setRotation(0);
    setOcrResult(null);
    setScanError(null);
    setEditableMedications([]);
    setSavedMedications([]);
    setLastAddedMed(null);
    setVaultSaved(false);
    setDuplicateConflict(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleRotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Helper to extract strength and dosage amount from raw string
  const parseStrengthAndUnit = (rawDosage: string) => {
    let strength = '';
    let dosageAmount = '1 tablet';

    if (!rawDosage) return { strength: '', dosageAmount: '1 tablet' };

    const strengthMatch = rawDosage.match(/\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?|%))\b/i);
    if (strengthMatch) {
      strength = strengthMatch[0].trim();
    }

    const amountMatch = rawDosage.match(/\b(\d+\s*(?:tablets?|capsules?|drops?|puffs?|pills?|teaspoons?|sachets?))\b/i);
    if (amountMatch) {
      dosageAmount = amountMatch[0].trim();
    } else if (rawDosage.toLowerCase().includes('tablet')) {
      dosageAmount = '1 tablet';
    } else if (rawDosage.toLowerCase().includes('capsule')) {
      dosageAmount = '1 capsule';
    }

    return { strength, dosageAmount };
  };

  // Helper: calculate end date from start date + days
  const calculateEndDate = (startDateStr: string, days: number): string => {
    if (days <= 0) return '';
    try {
      const d = new Date(startDateStr);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // TRIGGER REAL OCR INFERENCE PIPELINE
  const handleTriggerScan = async () => {
    if (!imagePreview) return;

    setIsScanning(true);
    setScanError(null);
    setOcrResult(null);
    setSavedMedications([]);
    setLastAddedMed(null);

    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const result = await api.performOCR({
        fileData: imagePreview,
        fileName: fileDetails?.name || 'medical_scan.jpg',
        mimeType: fileDetails?.type || 'image/jpeg',
        patientId: activePatient.id,
        documentTypeHint: 'prescription',
        rotation,
        enhanceContrast: true,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to extract text from document image.');
      }

      setOcrResult(result);

      // Populate candidate medications for patient verification
      const detected = result.medicalFields?.detectedMedications || [];
      const globalFields: OCRMedicalFields | undefined = result.medicalFields;
      
      if (detected.length > 0) {
        setEditableMedications(
          detected.map((m) => {
            const { strength, dosageAmount } = parseStrengthAndUnit(m.dosage);
            return {
              medicineName: m.medicineName || 'Detected Medicine',
              genericName: m.genericName || null,
              strength: m.strength || strength || '',
              dosageAmount: m.dosageAmount || dosageAmount || '1 tablet',
              dosage: m.dosage || (m.strength ? `${m.strength} (${m.dosageAmount || '1 tablet'})` : '1 tablet'),
              frequency: m.frequency || 'Once daily',
              scheduleTimes: m.scheduleTimes?.length > 0 ? m.scheduleTimes : ['08:00 AM', '08:00 PM'],
              startDate: m.startDate || todayStr,
              endDate: m.endDate || '',
              category: m.category || 'Prescription',
              confidence: m.confidence || result.confidence || 85,
            };
          })
        );
        setActiveTab('candidates');
      } else {
        // Initial candidate card for manual completion
        setEditableMedications([
          {
            medicineName: '',
            genericName: null,
            strength: '',
            dosageAmount: '1 tablet',
            dosage: '1 tablet',
            frequency: 'Once daily',
            scheduleTimes: ['08:00 AM', '08:00 PM'],
            startDate: todayStr,
            endDate: '',
            category: 'Prescription',
            confidence: 60,
          },
        ]);
        setActiveTab('candidates');
      }

      showToast(`OCR Scan Completed! Extracted text with ${result.confidence}% confidence.`);
    } catch (err: any) {
      console.error('[OCR Frontend] Scan failed:', err);
      setScanError(err.message || 'Optical character recognition failed. Please try a clearer, higher-contrast image.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopyRawText = () => {
    if (!ocrResult?.text) return;
    navigator.clipboard.writeText(ocrResult.text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Medication Verification Field Changes
  const handleMedicationChange = (index: number, field: keyof OCRDetectedMedication, value: any) => {
    setEditableMedications((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      // Keep dosage string synchronized with strength + dosage amount
      if (field === 'strength' || field === 'dosageAmount') {
        const str = field === 'strength' ? value : current.strength;
        const amt = field === 'dosageAmount' ? value : current.dosageAmount;
        if (str && amt) {
          current.dosage = `${str} (${amt})`;
        } else {
          current.dosage = str || amt || '1 tablet';
        }
      }

      updated[index] = current;
      return updated;
    });
  };

  // Intake Time Addition Handler
  const handleAddIntakeTime = (index: number, timeStr: string) => {
    let formattedTime = timeStr.trim();
    if (!formattedTime) return;

    if (/^\d{1,2}:\d{2}$/.test(formattedTime)) {
      const [hStr, mStr] = formattedTime.split(':');
      let h = parseInt(hStr, 10);
      const isPM = h >= 12;
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      formattedTime = `${String(h).padStart(2, '0')}:${mStr} ${isPM ? 'PM' : 'AM'}`;
    }

    setEditableMedications((prev) => {
      const updated = [...prev];
      const currentTimes = [...(updated[index].scheduleTimes || [])];
      if (!currentTimes.includes(formattedTime)) {
        currentTimes.push(formattedTime);
        updated[index] = { ...updated[index], scheduleTimes: currentTimes };
      }
      return updated;
    });

    setShowAddTimeIndex(null);
    setNewTimeInputValue((prev) => ({ ...prev, [index]: '' }));
  };

  const handleRemoveScheduleTime = (medIndex: number, timeStr: string) => {
    setEditableMedications((prev) => {
      const updated = [...prev];
      const currentTimes = (updated[medIndex].scheduleTimes || []).filter((t) => t !== timeStr);
      if (currentTimes.length === 0) {
        showToast('At least one intake time is required for your medication schedule.');
        return prev;
      }
      updated[medIndex] = { ...updated[medIndex], scheduleTimes: currentTimes };
      return updated;
    });
  };

  // Duration Shortcut Handler
  const handleSelectDuration = (index: number, days: number) => {
    setEditableMedications((prev) => {
      const updated = [...prev];
      const startDate = updated[index].startDate || new Date().toISOString().split('T')[0];
      if (days === 0) {
        updated[index] = { ...updated[index], endDate: '' };
      } else if (days > 0) {
        updated[index] = { ...updated[index], endDate: calculateEndDate(startDate, days) };
      }
      return updated;
    });
  };

  const handleAddCustomCandidate = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setEditableMedications((prev) => [
      ...prev,
      {
        medicineName: '',
        genericName: null,
        strength: '',
        dosageAmount: '1 tablet',
        dosage: '1 tablet',
        frequency: 'Once daily',
        scheduleTimes: ['08:00 AM', '08:00 PM'],
        startDate: todayStr,
        endDate: '',
        category: 'Prescription',
      },
    ]);
  };

  const handleRemoveCandidate = (index: number) => {
    setEditableMedications((prev) => prev.filter((_, i) => i !== index));
  };

  // INITIATE SAVE & DUPLICATE PROTECTION CHECK
  const handleInitiateAddMedicine = (med: OCRDetectedMedication, index: number) => {
    const cleanName = med.medicineName.trim();
    if (!cleanName) {
      alert('Please provide a medication name before adding.');
      return;
    }

    if (!med.scheduleTimes || med.scheduleTimes.length === 0) {
      alert('Please select or specify at least one schedule intake time.');
      return;
    }

    // DUPLICATE MEDICINE PROTECTION CHECK
    const existingMatch = medications.find(
      (m) => m.medicineName.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (existingMatch) {
      setDuplicateConflict({
        med,
        index,
        existingMed: existingMatch,
      });
      return;
    }

    // No duplicate conflict, proceed directly to save
    executeSaveMedication(med, index);
  };

  // CORE SAVE FUNCTION CONNECTED TO EXISTING CAREPULSE MEDICINES SYSTEM
  const executeSaveMedication = async (med: OCRDetectedMedication, index: number) => {
    setIsSavingMedication(index);
    setDuplicateConflict(null);

    const cleanName = med.medicineName.trim();
    const fullDosage =
      med.strength && med.dosageAmount
        ? `${med.strength} (${med.dosageAmount})`
        : med.dosage || med.strength || med.dosageAmount || '1 tablet';

    const payload: Partial<Medication> = {
      patientId: activePatient.id,
      medicineName: cleanName,
      genericName: med.genericName?.trim() || undefined,
      category: med.category || 'Prescription',
      strength: med.strength?.trim() || undefined,
      dosageAmount: med.dosageAmount?.trim() || '1 tablet',
      dosage: fullDosage,
      startDate: med.startDate || new Date().toISOString().split('T')[0],
      endDate: med.endDate ? med.endDate : undefined,
      frequency:
        med.frequency?.trim() ||
        (med.scheduleTimes?.length === 2
          ? 'Twice daily'
          : med.scheduleTimes?.length === 3
          ? 'Three times daily'
          : med.scheduleTimes?.length >= 4
          ? 'Four times daily'
          : 'Once daily'),
      scheduleTimes: med.scheduleTimes && med.scheduleTimes.length > 0 ? med.scheduleTimes : ['08:00 AM'],
      isActive: true,
      pillColor: 'bg-indigo-600',
      source: 'ocr',
    };

    try {
      if (onAddMedication) {
        await onAddMedication(payload);
      } else {
        await api.addMedication(payload);
      }

      if (onRefreshData) {
        await onRefreshData();
      }

      setSavedMedications((prev) => [...prev, cleanName]);
      setLastAddedMed({
        name: cleanName,
        dosage: fullDosage,
        scheduleTimes: payload.scheduleTimes || ['08:00 AM'],
      });

      showToast(`"${cleanName}" successfully added to your active CarePulse Medicines!`);
    } catch (err: any) {
      console.error('[OCR Frontend] Save medication failed:', err);
      alert(`Failed to save medication to CarePulse: ${err.message || 'Please check your connection.'}`);
    } finally {
      setIsSavingMedication(null);
    }
  };

  // SAVE ORIGINAL SCAN AS MEDICAL DOCUMENT IN VAULT
  const handleSaveScanToVault = async () => {
    if (!imagePreview) return;
    setIsSavingToVault(true);
    try {
      const fileName = fileDetails?.name || 'prescription_ocr_scan.jpg';
      const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Prescription Scan';

      await api.uploadMedicalDocument({
        patientId: activePatient.id,
        fileName,
        displayName: cleanName,
        category: ocrResult?.documentType === 'prescription' ? 'Prescription' : 'Medicine Document',
        mimeType: fileDetails?.type || 'image/jpeg',
        fileSize: fileDetails?.size ? parseInt(fileDetails.size) * 1024 : 100000,
        fileData: imagePreview,
        uploadedBy: currentUser.name,
        uploaderRole: currentUser.role === 'PATIENT' ? 'PATIENT' : 'CAREGIVER',
        notes: `OCR Scanned on ${new Date().toLocaleString()}. Extracted text confidence: ${ocrResult?.confidence || 95}%.`,
      });

      setVaultSaved(true);
      showToast('Scanned document saved to your secure Medical Document Vault!');
    } catch (err: any) {
      alert(`Failed to save to vault: ${err.message}`);
    } finally {
      setIsSavingToVault(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto animate-fade-in" id="ocr-medicine-scanner-root">
      {/* 1. TOP NAVIGATION & BACK BUTTON */}
      <div className="flex items-center justify-between">
        <BackButton fallbackLabel="Back to Medicines" />
        <div className="flex items-center space-x-2 text-xs text-slate-500 font-semibold">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ScanLine className="w-3.5 h-3.5 mr-1" />
            Neural OCR Engine Active
          </span>
        </div>
      </div>

      {/* 2. HEADER BANNER */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Prescription & Label Intelligence
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>HIPAA Encrypted</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                <ScanLine className="w-6 h-6" />
              </div>
              <span>OCR Medicine Scanner</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
              Upload or snap a photo of your prescription bottle, blister pack, or doctor prescription sheet.
              The optical recognition engine extracts medicine names, dosages, and administration schedules for your review before saving directly to your active Medicines tab.
            </p>
          </div>

          {/* Authenticated Patient Context Badge */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:min-w-[240px] shrink-0">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Active Patient Context
            </span>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {activePatient.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{activePatient.name}</p>
                <p className="text-[10px] font-mono text-slate-500 truncate">ID: {activePatient.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS TOAST NOTIFICATION */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between space-x-3 shadow-xs animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. UPLOAD & CAPTURE WORKSPACE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Upload Medicine / Prescription Image</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Supports packaging photos, medicine bottle labels, pharmacy receipts, and doctor notes.
            </p>
          </div>
          {imagePreview && (
            <button
              onClick={handleClearImage}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Image</span>
            </button>
          )}
        </div>

        {/* Hidden Native File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileInputChange}
          className="hidden"
          id="ocr-file-upload"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden"
          id="ocr-camera-capture"
        />

        {/* Drop Zone or Image Preview */}
        {!imagePreview ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
            }`}
          >
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Drag and drop your prescription or medicine photo here
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supported formats: PNG, JPG, JPEG, WEBP (up to 15MB)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 transition-all shadow-2xs flex items-center justify-center space-x-2"
                >
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Take Photo</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image Preview Container */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center min-h-[320px] max-h-[480px]">
              <img
                src={imagePreview}
                alt="Prescription or Medicine Preview"
                className="max-h-[460px] w-auto object-contain transition-transform duration-300"
                style={{ transform: `rotate(${rotation}deg)` }}
              />

              {/* Scanning Active Overlay */}
              {isScanning && (
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-400 flex items-center justify-center mb-4 animate-pulse">
                    <ScanLine className="w-8 h-8 animate-bounce" />
                  </div>
                  <p className="text-sm font-bold text-white mb-1">Running Optical Recognition...</p>
                  <p className="text-xs text-indigo-200 max-w-sm">
                    Extracting verbatim text, medication names, dosages, and administration directions.
                  </p>
                </div>
              )}

              {/* Floating Tools Toolbar */}
              <div className="absolute top-4 right-4 flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg z-10">
                <button
                  type="button"
                  onClick={handleRotateImage}
                  className="p-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                  title="Rotate image 90 degrees"
                  disabled={isScanning}
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                  title="Replace image"
                  disabled={isScanning}
                >
                  <Upload className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="p-2 rounded-lg text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 transition-colors"
                  title="Remove image"
                  disabled={isScanning}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* File Metadata Strip */}
            {fileDetails && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center space-x-2 min-w-0">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-bold text-slate-800 truncate">{fileDetails.name}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 font-mono">{fileDetails.size}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-medium">Rotation: {rotation}°</span>
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[11px]">
                    Ready for OCR
                  </span>
                </div>
              </div>
            )}

            {/* Scan Error Feedback */}
            {scanError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start space-x-3 text-xs animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">OCR Recognition Warning: </span>
                  {scanError}
                </div>
              </div>
            )}

            {/* Scan Medicine CTA Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleTriggerScan}
                  disabled={isScanning}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center space-x-2.5 ${
                    isScanning
                      ? 'bg-indigo-400 text-white cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <ScanLine className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Processing Optical Scan...' : ocrResult ? 'Re-scan Image' : 'Scan Medicine'}</span>
                </button>

                {ocrResult && (
                  <button
                    type="button"
                    onClick={handleSaveScanToVault}
                    disabled={isSavingToVault || vaultSaved}
                    className={`w-full sm:w-auto px-4 py-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center space-x-2 ${
                      vaultSaved
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs'
                    }`}
                  >
                    {vaultSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Saved to Medical Documents</span>
                      </>
                    ) : (
                      <>
                        <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{isSavingToVault ? 'Saving...' : 'Save Scan to Document Vault'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-500 text-center sm:text-right">
                All uploaded documents are processed securely in accordance with HIPAA data guidelines.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4. SUCCESS BANNER & IMMEDIATE MEDICINES TAB NAVIGATION */}
      {lastAddedMed && (
        <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-300 shadow-xs space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  Medication Added to CarePulse Medicines!
                </h3>
                <p className="text-xs text-emerald-800 mt-1">
                  <strong>{lastAddedMed.name}</strong> ({lastAddedMed.dosage}) is now active with daily intake scheduled at: <strong>{lastAddedMed.scheduleTimes.join(', ')}</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('medications')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
                >
                  <span>View in Medicines Tab</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleClearImage}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-100/60 text-emerald-900 border border-emerald-300 text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Scan Another Prescription</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. DUPLICATE MEDICINE WARNING MODAL */}
      {duplicateConflict && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-scale-up">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Duplicate Medicine Detected
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This medicine may already exist in your active Medicines list.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-2">
              <p>
                <strong>Existing Record:</strong> {duplicateConflict.existingMed.medicineName} ({duplicateConflict.existingMed.dosage})
              </p>
              <p>
                <strong>Current Schedule:</strong> {duplicateConflict.existingMed.scheduleTimes.join(', ')}
              </p>
              <p>
                <strong>Status:</strong> {duplicateConflict.existingMed.isActive ? 'Active' : 'Completed/Inactive'}
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Would you like to review the existing record in your Medicines tab, or proceed with adding this as an additional separate prescription?
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDuplicateConflict(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold"
              >
                Cancel
              </button>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateConflict(null);
                    onNavigate('medications');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center justify-center space-x-1.5"
                >
                  <Pill className="w-3.5 h-3.5" />
                  <span>View Existing Medicine</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => executeSaveMedication(duplicateConflict.med, duplicateConflict.index)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add as New Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. OCR RESULTS & MEDICATION REVIEW WORKSPACE */}
      {ocrResult && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in" id="ocr-results-panel">
          {/* Header & Metrics Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>OCR Inference Succeeded</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                  {ocrResult.documentType.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Extracted Text & Medication Verification</h2>
            </div>

            {/* Metrics Chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-600" />
                <span>Confidence: <strong>{ocrResult.confidence}%</strong></span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Time: <strong>{ocrResult.processingTime} ms</strong></span>
              </div>
              {ocrResult.engine && (
                <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-mono text-[11px]">
                  {ocrResult.engine === 'gemini_vision' ? 'Gemini Vision Model' : 'Tesseract OCR WASM'}
                </div>
              )}
            </div>
          </div>

          {/* Medical Safety Disclaimer Notice */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start space-x-3 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <strong className="block mb-0.5">Medical Accuracy & Patient Review:</strong>
              Optical character recognition extracts text directly from your image. Please verify or edit the medicine name, dosage, and intake times below before clicking <strong>"Add Medicine"</strong>.
            </div>
          </div>

          {/* Tabs: Candidate Medications vs Raw OCR Text */}
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab('candidates')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'candidates'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Medication Entry Review ({editableMedications.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('rawText')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'rawText'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Verbatim OCR Text ({ocrResult.lines.length} Lines)</span>
            </button>
          </div>

          {/* Tab 1: Verification Form Cards */}
          {activeTab === 'candidates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">
                  Review and customize the extracted details below, then click <strong>"Add Medicine"</strong>.
                </p>
                <button
                  type="button"
                  onClick={handleAddCustomCandidate}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Medication</span>
                </button>
              </div>

              {editableMedications.map((med, idx) => {
                const cleanName = med.medicineName.trim();
                const isAlreadySaved = savedMedications.includes(cleanName) && cleanName.length > 0;
                const isCurrentSaving = isSavingMedication === idx;
                const isAddingTime = showAddTimeIndex === idx;

                return (
                  <div
                    key={idx}
                    className={`p-6 rounded-2xl border transition-all space-y-5 ${
                      isAlreadySaved
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : 'bg-slate-50/70 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-slate-900">
                              {med.medicineName || 'Detected Medicine'}
                            </span>
                            {med.strength && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[11px]">
                                {med.strength}
                              </span>
                            )}
                            {med.category && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]">
                                {med.category}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {med.dosageAmount || '1 tablet'} • {med.scheduleTimes?.length || 1} dose(s) per day
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isAlreadySaved && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Active in Medicines Tab</span>
                          </span>
                        )}
                        {editableMedications.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCandidate(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Remove card"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Form Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      {/* 1. Medicine / Brand Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Medicine / Brand Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={med.medicineName}
                          onChange={(e) => handleMedicationChange(idx, 'medicineName', e.target.value)}
                          placeholder="e.g. Dolo 650, Metformin, Azithral 500"
                          className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* 2. Generic Name / Composition */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Generic Name / Composition
                        </label>
                        <input
                          type="text"
                          value={med.genericName || ''}
                          onChange={(e) => handleMedicationChange(idx, 'genericName', e.target.value)}
                          placeholder="e.g. Paracetamol IP, Metformin Hydrochloride"
                          className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* 3. Category */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Category
                        </label>
                        <select
                          value={med.category || 'Prescription'}
                          onChange={(e) => handleMedicationChange(idx, 'category', e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        >
                          {CATEGORY_OPTIONS.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 4. Strength / Concentration */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Strength / Concentration
                        </label>
                        <input
                          type="text"
                          value={med.strength || ''}
                          onChange={(e) => handleMedicationChange(idx, 'strength', e.target.value)}
                          placeholder="e.g. 500 mg, 650 mg, 10 mg, 250 mcg"
                          className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* 5. Dosage Unit */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Dosage Unit
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomDosageUnits((prev) => ({ ...prev, [idx]: !prev[idx] }))
                            }
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold"
                          >
                            {customDosageUnits[idx] ? 'Choose standard' : 'Custom'}
                          </button>
                        </div>
                        {customDosageUnits[idx] ? (
                          <input
                            type="text"
                            value={med.dosageAmount || ''}
                            onChange={(e) => handleMedicationChange(idx, 'dosageAmount', e.target.value)}
                            placeholder="e.g. 1 sachet, 10 ml, 2 sprays"
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <select
                            value={med.dosageAmount || '1 tablet'}
                            onChange={(e) => handleMedicationChange(idx, 'dosageAmount', e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          >
                            {STANDARD_DOSAGE_UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* 6. Start Date */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Start Date</span>
                        </label>
                        <input
                          type="date"
                          value={med.startDate || new Date().toISOString().split('T')[0]}
                          onChange={(e) => handleMedicationChange(idx, 'startDate', e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* 7. End Date */}
                      <div className="sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            End Date (Optional)
                          </label>
                          {med.endDate && (
                            <button
                              type="button"
                              onClick={() => handleMedicationChange(idx, 'endDate', '')}
                              className="text-[10px] text-slate-400 hover:text-rose-600 font-medium"
                            >
                              Clear (Ongoing)
                            </button>
                          )}
                        </div>
                        <input
                          type="date"
                          value={med.endDate || ''}
                          onChange={(e) => handleMedicationChange(idx, 'endDate', e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-medium focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* 8. Duration Shortcut */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                        Duration Shortcut
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {DURATION_SHORTCUTS.map((shortcut, sIdx) => {
                          const isActive =
                            shortcut.days === 0
                              ? !med.endDate
                              : shortcut.days > 0 &&
                                med.endDate ===
                                  calculateEndDate(
                                    med.startDate || new Date().toISOString().split('T')[0],
                                    shortcut.days
                                  );

                          return (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => handleSelectDuration(idx, shortcut.days)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                isActive
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                  : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                              }`}
                            >
                              {shortcut.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 9. Schedule Intake Times */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                            <Clock className="w-4 h-4 text-indigo-600" />
                            <span>Schedule Intake Times</span>
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Specify daily times when this medication should be taken.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddTimeIndex(isAddingTime ? null : idx)}
                          className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Intake Time</span>
                        </button>
                      </div>

                      {/* Add Intake Time Inline Box */}
                      {isAddingTime && (
                        <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2.5 animate-fade-in">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="time"
                              value={newTimeInputValue[idx] || '08:00'}
                              onChange={(e) =>
                                setNewTimeInputValue((prev) => ({ ...prev, [idx]: e.target.value }))
                              }
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 font-mono font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleAddIntakeTime(idx, newTimeInputValue[idx] || '08:00')
                              }
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              Add Time
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddTimeIndex(null)}
                              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-medium"
                            >
                              Cancel
                            </button>
                          </div>

                          {/* Quick suggestions */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] text-slate-600 font-semibold">Presets:</span>
                            {['08:00 AM', '12:00 PM', '02:00 PM', '08:00 PM', '10:00 PM'].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => handleAddIntakeTime(idx, t)}
                                className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-100 transition-colors"
                              >
                                + {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Active Intake Times Rows */}
                      <div className="space-y-2">
                        {(med.scheduleTimes || []).length === 0 ? (
                          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                            No intake time scheduled. Please click "+ Add Intake Time" to set times.
                          </p>
                        ) : (
                          (med.scheduleTimes || []).map((timeStr, tIdx) => (
                            <div
                              key={tIdx}
                              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                            >
                              <div className="flex items-center space-x-2 font-mono font-bold text-xs text-slate-800">
                                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                <span>{timeStr}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveScheduleTime(idx, timeStr)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Delete intake time"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Add Medicine Action Button */}
                    <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        {isAlreadySaved ? (
                          <span className="text-emerald-700 font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Saved to CarePulse Medication list</span>
                          </span>
                        ) : (
                          <span>Click to validate and save directly to your Medicines tab.</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleInitiateAddMedicine(med, idx)}
                          disabled={isCurrentSaving || isAlreadySaved}
                          className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center justify-center space-x-2 ${
                            isAlreadySaved
                              ? 'bg-emerald-600 text-white cursor-default'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                          }`}
                        >
                          {isAlreadySaved ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Added to Medicines</span>
                            </>
                          ) : (
                            <>
                              <Pill className="w-4 h-4" />
                              <span>{isCurrentSaving ? 'Saving...' : 'Add Medicine'}</span>
                            </>
                          )}
                        </button>

                        {isAlreadySaved && onNavigate && (
                          <button
                            type="button"
                            onClick={() => onNavigate('medications')}
                            className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center space-x-1"
                          >
                            <span>Go to Medicines</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Verbatim Raw OCR Text */}
          {activeTab === 'rawText' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Verbatim Text Detected by OCR Model:
                </span>
                <button
                  type="button"
                  onClick={handleCopyRawText}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Text</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-[360px] border border-slate-800 leading-relaxed whitespace-pre-wrap select-text">
                {ocrResult.text || 'No text recognized in document.'}
              </div>

              {ocrResult.lines && ocrResult.lines.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Line Breakdown ({ocrResult.lines.length} lines detected)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {ocrResult.lines.map((line, i) => (
                      <div
                        key={i}
                        className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono truncate"
                      >
                        <span className="text-slate-400 mr-2 select-none">L{i + 1}:</span>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 7. ARCHITECTURE WORKFLOW STRIP */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center space-x-2">
          <Pill className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">CarePulse OCR to Medicines Workflow</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Step 1</span>
            <p className="text-xs font-bold text-slate-900">OCR Scanner</p>
            <p className="text-[11px] text-slate-500 leading-snug">
              Upload prescription image, bottle label, or doctor note.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Step 2</span>
            <p className="text-xs font-bold text-slate-900">OCR Prediction</p>
            <p className="text-[11px] text-slate-500 leading-snug">
              OCR models extract verbatim text and detect medicine name & strength.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Step 3</span>
            <p className="text-xs font-bold text-slate-900">Review & Edit</p>
            <p className="text-[11px] text-slate-500 leading-snug">
              User confirms dosage and defines schedule intake times (08:00 AM, 08:00 PM).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Step 4</span>
            <p className="text-xs font-bold text-slate-900">Add Medicine</p>
            <p className="text-[11px] text-slate-500 leading-snug">
              Duplicate protection checks and saves to existing Medicines database.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1.5">
            <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block">Step 5</span>
            <p className="text-xs font-bold text-indigo-950">Medicines Tab & Schedule</p>
            <p className="text-[11px] text-indigo-700 leading-snug">
              Immediately appears in Medicines tab with reminders and adherence tracking.
            </p>
          </div>
        </div>

        {/* Shortcut to Medication List */}
        {onNavigate && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onNavigate('medications')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1.5 hover:underline"
            >
              <span>Go to Medicines Tab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
