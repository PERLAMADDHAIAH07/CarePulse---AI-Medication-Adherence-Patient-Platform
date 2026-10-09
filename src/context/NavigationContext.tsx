import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NavHistoryEntry } from '../types';

interface NavigateOptions {
  label?: string;
  replace?: boolean;
  params?: Record<string, any>;
}

interface NavigationContextType {
  activeTab: string;
  activeSubView?: string;
  historyStack: NavHistoryEntry[];
  params: Record<string, any>;
  navigate: (tab: string, subView?: string, options?: NavigateOptions) => void;
  goBack: () => void;
  canGoBack: boolean;
  previousEntry: NavHistoryEntry | null;
  getBackLabel: (fallback?: string) => string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const getTabDisplayTitle = (tab: string, subView?: string): string => {
  if (tab === 'control-room' || tab === 'settings') {
    switch (subView) {
      case 'auth':
        return 'Authentication & Session';
      case 'login-history':
        return 'Login History';
      case 'devices':
        return 'Active Devices';
      case 'security':
        return 'Security Center';
      case 'notifications':
        return 'Notifications';
      case 'family':
        return 'Family Connection';
      case 'overview':
      default:
        return 'Patient Control Room';
    }
  }

  switch (tab) {
    case 'dashboard':
      return 'Dashboard';
    case 'family-dashboard':
    case 'patient-overview':
      return 'Family Dashboard';
    case 'medications':
      return 'Medicines';
    case 'history':
      return 'History Timeline';
    case 'ai-assistant':
      return 'AI Assistant';
    case 'family':
      return 'Family Connections';
    case 'ocr-scanner':
    case 'ocr':
      return 'OCR Medicine Scanner';
    case 'analytics':
      return 'Adherence Analytics';
    case 'symptoms':
      return 'Symptom Journal';
    case 'documents':
    case 'medical-documents':
      return 'Medical Documents';
    case 'profile':
      return 'Profile';
    default:
      return tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ');
  }
};

interface NavigationProviderProps {
  children: React.ReactNode;
  initialTab?: string;
  initialSubView?: string;
  userRole?: 'PATIENT' | 'FAMILY_MEMBER';
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
  initialTab = 'dashboard',
  initialSubView,
  userRole = 'PATIENT',
}) => {
  const [activeTab, setActiveTabState] = useState<string>(initialTab);
  const [activeSubView, setActiveSubViewState] = useState<string | undefined>(initialSubView);
  const [historyStack, setHistoryStack] = useState<NavHistoryEntry[]>([]);
  const [params, setParams] = useState<Record<string, any>>({});

  const defaultHomeTab = userRole === 'PATIENT' ? 'dashboard' : 'family-dashboard';

  // Navigate function that maintains stack and history
  const navigate = useCallback(
    (newTab: string, newSubView?: string, options?: NavigateOptions) => {
      // Don't push duplicate state if identical
      if (newTab === activeTab && newSubView === activeSubView && !options?.params) {
        return;
      }

      if (!options?.replace) {
        const currentEntry: NavHistoryEntry = {
          tab: activeTab,
          subView: activeSubView,
          label: getTabDisplayTitle(activeTab, activeSubView),
          params,
          timestamp: Date.now(),
        };

        setHistoryStack((prev) => {
          // Limit stack to last 30 entries to avoid memory bloat
          const updated = [...prev, currentEntry];
          return updated.slice(-30);
        });
      }

      setActiveTabState(newTab);
      setActiveSubViewState(newSubView);
      if (options?.params) {
        setParams(options.params);
      }

      // Sync window history for browser Back / Forward compatibility
      try {
        const statePayload = { tab: newTab, subView: newSubView, params: options?.params };
        window.history.pushState(statePayload, '', window.location.pathname);
      } catch (err) {
        // Safe iframe fallback
      }
    },
    [activeTab, activeSubView, params]
  );

  // Back Navigation handler
  const goBack = useCallback(() => {
    if (historyStack.length > 0) {
      const nextStack = [...historyStack];
      const previous = nextStack.pop();
      setHistoryStack(nextStack);

      if (previous) {
        setActiveTabState(previous.tab);
        setActiveSubViewState(previous.subView);
        if (previous.params) {
          setParams(previous.params);
        }
        return;
      }
    }

    // Fallback logic if history stack is empty
    if (activeTab === 'control-room' || activeTab === 'settings') {
      if (activeSubView && activeSubView !== 'overview') {
        setActiveSubViewState('overview');
        return;
      }
      setActiveTabState(defaultHomeTab);
      setActiveSubViewState(undefined);
      return;
    }

    if (activeTab !== defaultHomeTab) {
      setActiveTabState(defaultHomeTab);
      setActiveSubViewState(undefined);
    }
  }, [historyStack, activeTab, activeSubView, defaultHomeTab]);

  // Handle browser Back / Forward button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTabState(event.state.tab);
        setActiveSubViewState(event.state.subView);
        if (event.state.params) {
          setParams(event.state.params);
        }
      } else if (historyStack.length > 0) {
        goBack();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [historyStack, goBack]);

  const canGoBack =
    historyStack.length > 0 ||
    activeTab !== defaultHomeTab ||
    (activeTab === 'control-room' && Boolean(activeSubView && activeSubView !== 'overview'));

  const previousEntry = historyStack.length > 0 ? historyStack[historyStack.length - 1] : null;

  const getBackLabel = useCallback(
    (fallback?: string): string => {
      if (previousEntry && previousEntry.label) {
        return `Back to ${previousEntry.label}`;
      }
      if (activeTab === 'control-room' || activeTab === 'settings') {
        if (activeSubView && activeSubView !== 'overview') {
          return 'Back to Control Room';
        }
      }
      if (fallback) {
        return fallback;
      }
      if (activeTab !== defaultHomeTab) {
        return `Back to ${getTabDisplayTitle(defaultHomeTab)}`;
      }
      return 'Back';
    },
    [previousEntry, activeTab, activeSubView, defaultHomeTab]
  );

  return (
    <NavigationContext.Provider
      value={{
        activeTab,
        activeSubView,
        historyStack,
        params,
        navigate,
        goBack,
        canGoBack,
        previousEntry,
        getBackLabel,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
