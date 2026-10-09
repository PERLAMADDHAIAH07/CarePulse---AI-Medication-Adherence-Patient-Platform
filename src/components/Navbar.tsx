import React from 'react';
import {
  HeartPulse,
  Sparkles,
  Users,
  Pill,
  Clock,
  LayoutDashboard,
  Menu,
  SlidersHorizontal,
  ScanLine,
} from 'lucide-react';
import { User as UserType } from '../types';

interface NavbarProps {
  currentUser: UserType;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadCount?: number;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  unreadCount = 0,
  onToggleMobileSidebar,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => setActiveTab(currentUser.role === 'PATIENT' ? 'dashboard' : 'family-dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                  Care<span className="text-blue-600">Pulse</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 rounded-full border border-blue-200">
                  AI Healthcare
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">Medication & Caregiver Intelligence</p>
            </div>
          </div>

          {/* CLEAN & MINIMAL NAVIGATION LINKS (ONLY: Dashboard, Medicines, AI Assistant, History, Family) */}
          <nav className="hidden md:flex items-center space-x-1 sm:space-x-2">
            {/* 1. DASHBOARD */}
            <button
              onClick={() => setActiveTab(currentUser.role === 'PATIENT' ? 'dashboard' : 'family-dashboard')}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'dashboard' || activeTab === 'family-dashboard'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-blue-600" />
              <span>Dashboard</span>
            </button>

            {/* 2. MEDICINES */}
            <button
              onClick={() => setActiveTab(currentUser.role === 'PATIENT' ? 'medications' : 'patient-overview')}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'medications' || activeTab === 'patient-overview'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Pill className="w-4 h-4 text-emerald-600" />
              <span>Medicines</span>
            </button>

            {/* 3. AI ASSISTANT */}
            <button
              onClick={() => setActiveTab('ai-assistant')}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'ai-assistant'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>AI Assistant</span>
            </button>

            {/* 4. HISTORY */}
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'history'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4 text-purple-600" />
              <span>History</span>
            </button>

            {/* 5. FAMILY */}
            <button
              onClick={() => setActiveTab('family')}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'family'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4 text-teal-600" />
              <span>Family</span>
            </button>

            {/* 6. OCR SCANNER */}
            <button
              onClick={() => setActiveTab('ocr-scanner')}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'ocr-scanner'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              aria-label="OCR Scanner"
              title="Scan prescription or medicine packaging with OCR"
            >
              <ScanLine className="w-4 h-4 text-indigo-600" />
              <span>OCR Scanner</span>
            </button>
          </nav>

          {/* MOBILE / TABLET CONTROL CENTER TRIGGER BUTTON */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleMobileSidebar}
              className="xl:hidden flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
              title="Open User Control Center"
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Control Center</span>
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>
          </div>
        </div>

        {/* MOBILE NAVIGATION BAR ON SMALL SCREENS */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 text-xs font-bold text-slate-600 overflow-x-auto">
          <button
            onClick={() => setActiveTab(currentUser.role === 'PATIENT' ? 'dashboard' : 'family-dashboard')}
            className={`py-1 px-1.5 rounded-lg whitespace-nowrap ${
              activeTab === 'dashboard' || activeTab === 'family-dashboard' ? 'text-blue-600 font-black' : ''
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab(currentUser.role === 'PATIENT' ? 'medications' : 'patient-overview')}
            className={`py-1 px-1.5 rounded-lg whitespace-nowrap ${
              activeTab === 'medications' || activeTab === 'patient-overview' ? 'text-blue-600 font-black' : ''
            }`}
          >
            Medicines
          </button>
          <button
            onClick={() => setActiveTab('ai-assistant')}
            className={`py-1 px-1.5 rounded-lg whitespace-nowrap text-blue-700 bg-blue-50 ${
              activeTab === 'ai-assistant' ? 'font-black bg-blue-600 text-white' : ''
            }`}
          >
            AI Assistant
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-1 px-1.5 rounded-lg whitespace-nowrap ${activeTab === 'history' ? 'text-blue-600 font-black' : ''}`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('family')}
            className={`py-1 px-1.5 rounded-lg whitespace-nowrap ${activeTab === 'family' ? 'text-blue-600 font-black' : ''}`}
          >
            Family
          </button>
          <button
            onClick={() => setActiveTab('ocr-scanner')}
            className={`py-1 px-1.5 rounded-lg whitespace-nowrap ${activeTab === 'ocr-scanner' ? 'text-blue-600 font-black' : ''}`}
          >
            OCR Scanner
          </button>
        </div>
      </div>
    </header>
  );
};
