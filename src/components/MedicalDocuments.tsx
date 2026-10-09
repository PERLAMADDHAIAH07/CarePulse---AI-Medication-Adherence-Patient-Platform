import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  HardDrive,
  File,
  FileCheck,
  Image as ImageIcon,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  FolderOpen,
  Plus,
  Lock,
  Calendar,
  Layers,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Info,
} from 'lucide-react';
import { User, MedicalDocument, MedicalDocumentCategory } from '../types';
import { api } from '../services/api';
import { BackButton } from './BackButton';

interface MedicalDocumentsProps {
  currentUser: User;
  linkedPatient?: User | null;
  onNavigate?: (tab: string, subView?: string) => void;
}

const CATEGORIES: { label: MedicalDocumentCategory; icon: any; color: string; bg: string; border: string }[] = [
  { label: 'Medical Certificate', icon: FileCheck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { label: 'Prescription', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { label: 'Lab Report', icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { label: 'Medical Image / Scan', icon: ImageIcon, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { label: 'Discharge Summary', icon: HardDrive, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { label: 'Medicine Document', icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  { label: 'Other Medical Document', icon: File, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
];

export const MedicalDocuments: React.FC<MedicalDocumentsProps> = ({
  currentUser,
  linkedPatient,
  onNavigate,
}) => {
  const isPatient = currentUser.role === 'PATIENT';
  const effectivePatientId = isPatient ? currentUser.id : linkedPatient?.id || 'p-101';
  const effectivePatientName = isPatient ? currentUser.name : linkedPatient?.name || 'Patient';

  // Document state
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Search, filter, sorting, view mode
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'>('newest');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<MedicalDocument | null>(null);
  const [viewingDocLoading, setViewingDocLoading] = useState(false);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<MedicalDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileDataUrl, setUploadFileDataUrl] = useState<string>('');
  const [uploadDisplayName, setUploadDisplayName] = useState('');
  const [uploadCategory, setUploadCategory] = useState<MedicalDocumentCategory>('Lab Report');
  const [uploadNotes, setUploadNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, [effectivePatientId, selectedCategory, searchQuery, sortBy]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.getMedicalDocuments({
        patientId: effectivePatientId,
        category: selectedCategory,
        search: searchQuery,
        requesterId: currentUser.id,
      });
      setDocuments(res.documents || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load medical documents.');
    } finally {
      setLoading(false);
    }
  };

  // Handle File Selection
  const handleFileSelect = (file: File) => {
    setUploadError('');

    // Check size limit: 25 MB
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(`File is too large (${formatFileSize(file.size)}). Maximum allowed size is 25 MB.`);
      return;
    }

    // Check extension
    const forbiddenExts = ['.exe', '.bat', '.cmd', '.sh', '.js', '.vbs', '.msi', '.dll', '.html'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (forbiddenExts.includes(ext)) {
      setUploadError(`Files with extension '${ext}' are restricted for patient security.`);
      return;
    }

    setUploadFile(file);
    if (!uploadDisplayName.trim()) {
      // Set default friendly title
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setUploadDisplayName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    // Read base64 preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadFileDataUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Drag & Drop
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Submit Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadFileDataUrl) {
      setUploadError('Please select a valid medical document file.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadProgress(20);

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
      }, 150);

      const res = await api.uploadMedicalDocument({
        patientId: effectivePatientId,
        fileName: uploadFile.name,
        displayName: uploadDisplayName.trim() || uploadFile.name,
        category: uploadCategory,
        mimeType: uploadFile.type || 'application/octet-stream',
        fileSize: uploadFile.size,
        fileData: uploadFileDataUrl,
        uploadedBy: currentUser.name,
        uploaderRole: currentUser.role,
        notes: uploadNotes.trim(),
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        setIsUploadModalOpen(false);
        resetUploadForm();
        triggerToast(`Document "${res.document.displayName}" securely uploaded.`);
        fetchDocuments();
      }, 400);
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadError(err.message || 'Upload failed. Please try again.');
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadFileDataUrl('');
    setUploadDisplayName('');
    setUploadCategory('Lab Report');
    setUploadNotes('');
    setUploadError('');
    setUploadProgress(0);
  };

  // Open Document Viewer
  const handleOpenDocument = async (doc: MedicalDocument) => {
    setViewingDocLoading(true);
    try {
      const fullDoc = await api.getMedicalDocumentById(doc.id, effectivePatientId, currentUser.id);
      setViewingDoc(fullDoc);
    } catch (err: any) {
      triggerToast(`Unable to open document: ${err.message}`);
    } finally {
      setViewingDocLoading(false);
    }
  };

  // Download Document
  const handleDownloadDocument = async (doc: MedicalDocument) => {
    try {
      let docToDownload = doc;
      if (!docToDownload.fileData) {
        docToDownload = await api.getMedicalDocumentById(doc.id, effectivePatientId, currentUser.id);
      }

      if (!docToDownload.fileData) {
        throw new Error('Document content is not available for download.');
      }

      // Create download link
      const link = document.createElement('a');
      link.href = docToDownload.fileData;
      link.download = docToDownload.fileName || `${docToDownload.displayName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      triggerToast(`Downloaded "${docToDownload.displayName}"`);
    } catch (err: any) {
      triggerToast(`Download failed: ${err.message}`);
    }
  };

  // Delete Document
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmDoc) return;
    setIsDeleting(true);
    try {
      await api.deleteMedicalDocument(deleteConfirmDoc.id, effectivePatientId, currentUser.id);
      triggerToast(`Document "${deleteConfirmDoc.displayName}" removed from vault.`);
      setDeleteConfirmDoc(null);
      fetchDocuments();
    } catch (err: any) {
      triggerToast(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string): string => {
    if (!isoString) return 'Recent';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  };

  const getCategoryConfig = (categoryName: string) => {
    return (
      CATEGORIES.find((c) => c.label.toLowerCase() === categoryName?.toLowerCase()) || {
        label: categoryName,
        icon: File,
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
      }
    );
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Back Action */}
      <div className="flex items-center justify-between">
        <BackButton fallbackLabel="Back to Profile" />
        <div className="flex items-center space-x-2">
          <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            HIPAA Storage Vault
          </span>
          <button
            onClick={fetchDocuments}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shadow-2xs"
            title="Refresh documents list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-3 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-800/40">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 flex-wrap gap-y-1">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/80 backdrop-blur-md flex items-center justify-center text-white border border-blue-400/30 shadow-lg">
                <FolderOpen className="w-5 h-5 text-blue-200" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Medical Documents</h1>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Phase 1 • Secure Vault
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Securely store, organize, and access verified medical records, diagnostic lab reports, prescriptions, and health scans for{' '}
              <strong className="text-white">{effectivePatientName}</strong>.
            </p>

            <div className="flex items-center space-x-4 text-xs text-slate-400 pt-1 flex-wrap gap-2">
              <span className="flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>Patient Isolated Storage</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{documents.length} Stored Document{documents.length !== 1 ? 's' : ''}</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Future AI Assistant RAG Source</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {isPatient ? (
              <button
                onClick={() => {
                  resetUploadForm();
                  setIsUploadModalOpen(true);
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center space-x-2.5 active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Medical Document</span>
              </button>
            ) : (
              <div className="px-4 py-2.5 rounded-2xl bg-white/10 text-slate-200 border border-white/10 text-xs font-bold flex items-center space-x-2 backdrop-blur-md">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Authorized Caregiver View</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search document name or notes..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Sorting & View Switcher */}
          <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Document Name (A-Z)</option>
                <option value="name-desc">Document Name (Z-A)</option>
                <option value="size-desc">File Size (Largest)</option>
                <option value="size-asc">File Size (Smallest)</option>
              </select>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewLayout('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewLayout === 'grid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewLayout('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewLayout === 'table' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
              selectedCategory === 'All'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>All Documents</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedCategory === 'All' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {documents.length}
            </span>
          </button>

          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.label;
            const Icon = cat.icon;
            return (
              <button
                key={cat.label}
                onClick={() => setSelectedCategory(cat.label)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : `${cat.bg} ${cat.color} ${cat.border} hover:opacity-80`
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-800 text-xs font-medium">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={fetchDocuments} className="font-bold underline hover:text-rose-900">
            Retry
          </button>
        </div>
      )}

      {/* DOCUMENT LIBRARY CONTENT */}
      {loading && documents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Loading Medical Documents...</h3>
          <p className="text-xs text-slate-500">Retrieving patient records from encrypted storage.</p>
        </div>
      ) : documents.length === 0 ? (
        /* EMPTY STATE */
        <div className="bg-white rounded-3xl p-10 sm:p-14 border border-slate-200 text-center space-y-6 shadow-2xs max-w-3xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-xs">
            <FolderOpen className="w-8 h-8 text-blue-600" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-extrabold text-slate-900">No Medical Documents Yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload your prescriptions, lab reports, medical certificates, and other medical records to keep them securely in CarePulse.
            </p>
          </div>

          {isPatient && (
            <div className="pt-2">
              <button
                onClick={() => {
                  resetUploadForm();
                  setIsUploadModalOpen(true);
                }}
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg inline-flex items-center space-x-2 active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Upload First Document</span>
              </button>
            </div>
          )}

          <div className="border-t border-slate-100 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Prescriptions & Scans</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Keep medication orders & radiology images organized.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Diagnostic Lab Reports</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Store blood tests, metabolic panels & clinical notes.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>HIPAA Encrypted Vault</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Accessible only by verified patient credentials.</p>
            </div>
          </div>
        </div>
      ) : viewLayout === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => {
            const catConfig = getCategoryConfig(doc.category);
            const CatIcon = catConfig.icon;
            const isPdf = doc.mimeType?.includes('pdf') || doc.fileName?.endsWith('.pdf');
            const isImage = doc.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(doc.fileName);

            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Category Header */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase flex items-center space-x-1.5 ${catConfig.bg} ${catConfig.color} border ${catConfig.border}`}>
                      <CatIcon className="w-3 h-3" />
                      <span>{doc.category}</span>
                    </span>

                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {formatFileSize(doc.fileSize)}
                    </span>
                  </div>

                  {/* Document Title & File Info */}
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
                      {doc.displayName}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono flex items-center space-x-1 truncate">
                      <span className="uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                        {isPdf ? 'PDF' : isImage ? 'IMAGE' : 'DOC'}
                      </span>
                      <span className="truncate">{doc.fileName}</span>
                    </p>
                  </div>

                  {/* Notes / Clinical Remarks */}
                  {doc.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                      {doc.notes}
                    </p>
                  )}

                  {/* Metadata Row */}
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatDate(doc.createdAt)}</span>
                      </span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px]">
                        ✓ Vault Stored
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenDocument(doc)}
                    className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1.5"
                    title="View Document"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => handleDownloadDocument(doc)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
                    title="Download Document"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {isPatient && (
                    <button
                      onClick={() => setDeleteConfirmDoc(doc)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl border border-rose-200/60 transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Document Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Format & Size</th>
                  <th className="py-3.5 px-4">Uploaded At</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {documents.map((doc) => {
                  const catConfig = getCategoryConfig(doc.category);
                  const CatIcon = catConfig.icon;
                  const isPdf = doc.mimeType?.includes('pdf') || doc.fileName?.endsWith('.pdf');

                  return (
                    <tr key={doc.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${catConfig.bg} ${catConfig.color}`}>
                            <CatIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900">{doc.displayName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{doc.fileName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${catConfig.bg} ${catConfig.color} border ${catConfig.border}`}>
                          {doc.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 rounded mr-1.5">
                          {isPdf ? 'PDF' : 'IMG'}
                        </span>
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenDocument(doc)}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors"
                            title="View Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors"
                            title="Download Document"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {isPatient && (
                            <button
                              onClick={() => setDeleteConfirmDoc(doc)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200/60 transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Medical Document</h3>
                  <p className="text-xs text-slate-500">Securely store your medical records in CarePulse.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isUploading) setIsUploadModalOpen(false);
                }}
                disabled={isUploading}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-2 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-5">
              {/* File Dropzone / Selector */}
              {!uploadFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50 scale-101'
                      : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80 bg-slate-50/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    Click to select file or drag & drop here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports PDF, JPG, PNG, WEBP, HEIC, DOCX (Up to 25 MB)
                  </p>
                </div>
              ) : (
                /* FILE PREVIEW (Requirement 6) */
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Selected File Preview
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadFile(null)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                    >
                      Change File
                    </button>
                  </div>

                  <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    {uploadFile.type.startsWith('image/') && uploadFileDataUrl ? (
                      <img
                        src={uploadFileDataUrl}
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{uploadFile.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {uploadFile.type || 'Document'} • {formatFileSize(uploadFile.size)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Document Title / Display Name
                </label>
                <input
                  type="text"
                  value={uploadDisplayName}
                  onChange={(e) => setUploadDisplayName(e.target.value)}
                  placeholder="e.g., Blood Test August, Lisinopril Prescription"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                />
              </div>

              {/* Document Category Selector (Requirement 4) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Document Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.label} value={cat.label}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Clinical Notes / Remarks (Optional)
                </label>
                <textarea
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="e.g., Follow-up with Dr. Vance in 3 months. Normal HbA1c."
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                />
              </div>

              {/* Upload Progress Bar (Requirement 25) */}
              {isUploading && (
                <div className="space-y-2 bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span className="flex items-center space-x-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Encrypting & Securing Document...</span>
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-2 active:scale-98"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload Document</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DOCUMENT MODAL (Requirement 17) */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                    {viewingDoc.displayName}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    {viewingDoc.category} • {formatFileSize(viewingDoc.fileSize)} • {formatDate(viewingDoc.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => handleDownloadDocument(viewingDoc)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Stage */}
            <div className="flex-1 min-h-[350px] max-h-[550px] overflow-y-auto bg-slate-900/5 rounded-2xl p-4 flex items-center justify-center border border-slate-200">
              {viewingDoc.fileData && (viewingDoc.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(viewingDoc.fileName)) ? (
                <img
                  src={viewingDoc.fileData}
                  alt={viewingDoc.displayName}
                  className="max-h-[500px] max-w-full rounded-xl shadow-md object-contain"
                />
              ) : viewingDoc.fileData && (viewingDoc.mimeType?.includes('pdf') || viewingDoc.fileName?.endsWith('.pdf')) ? (
                <iframe
                  src={viewingDoc.fileData}
                  title={viewingDoc.displayName}
                  className="w-full h-[480px] rounded-xl border border-slate-300 bg-white"
                />
              ) : (
                <div className="text-center p-8 space-y-4 max-w-md">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{viewingDoc.fileName}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Direct in-browser preview is not supported for this file format ({viewingDoc.mimeType || 'Document'}).
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadDocument(viewingDoc)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File to View</span>
                  </button>
                </div>
              )}
            </div>

            {/* Document Details Footer */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900">Storage Path:</span>{' '}
                <code className="text-[11px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                  {viewingDoc.storagePath || `medical-documents/${viewingDoc.patientId}/${viewingDoc.id}`}
                </code>
              </div>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                ✓ Verified Patient Document
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG (Requirement 19) */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                Delete Medical Document?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-800 font-bold">"{deleteConfirmDoc.displayName}"</strong> from your medical records? This file will be permanently removed from the CarePulse vault.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDeleteConfirmDoc(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Document</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
