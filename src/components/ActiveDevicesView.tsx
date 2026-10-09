import React, { useState, useEffect } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  MapPin,
  RefreshCw,
  ArrowLeft,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LogOut,
} from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../services/api';
import { BackButton } from './BackButton';

export interface ActiveDevice {
  id: string;
  deviceName: string;
  deviceType?: string;
  browser: string;
  os: string;
  location: string;
  lastActive: string;
  isCurrentDevice?: boolean;
}

interface ActiveDevicesViewProps {
  currentUser: UserType;
  onNavigate?: (tab: string) => void;
}

export const ActiveDevicesView: React.FC<ActiveDevicesViewProps> = ({
  currentUser,
  onNavigate,
}) => {
  const [devices, setDevices] = useState<ActiveDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sign out confirmation modal state
  const [deviceToSignOut, setDeviceToSignOut] = useState<ActiveDevice | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, [currentUser.id]);

  const fetchDevices = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api.getControlRoomActiveDevices(currentUser.id);
      if (res && Array.isArray(res.devices)) {
        setDevices(res.devices);
      } else {
        setDevices([]);
      }
    } catch (err: any) {
      console.error('Failed to load active devices:', err);
      setError('Unable to load your active devices.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleConfirmSignOut = async () => {
    if (!deviceToSignOut) return;
    setIsSigningOut(true);

    try {
      const res = await api.signOutActiveDevice(deviceToSignOut.id, currentUser.id);
      if (res?.success) {
        setDevices((prev) => prev.filter((d) => d.id !== deviceToSignOut.id));
        setToastMessage(`✓ Device signed out successfully.`);
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setError(res?.error || 'Failed to sign out device.');
      }
    } catch (err: any) {
      console.error('Failed to sign out device:', err);
      setError('Failed to sign out device. Please try again.');
    } finally {
      setIsSigningOut(false);
      setDeviceToSignOut(null);
    }
  };

  const getDeviceIcon = (device: ActiveDevice) => {
    const text = `${device.deviceName} ${device.deviceType || ''} ${device.os}`.toLowerCase();
    if (text.includes('phone') || text.includes('iphone') || text.includes('android')) {
      return <Smartphone className="w-5 h-5 text-blue-600 shrink-0" />;
    }
    if (text.includes('tablet') || text.includes('ipad')) {
      return <Tablet className="w-5 h-5 text-blue-600 shrink-0" />;
    }
    return <Laptop className="w-5 h-5 text-blue-600 shrink-0" />;
  };

  const otherDevices = devices.filter((d) => !d.isCurrentDevice);
  const currentDevice = devices.find((d) => d.isCurrentDevice);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ==================== 1. HEADER & BACK NAVIGATION ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2.5">
            <BackButton fallbackLabel="Back to Patient Control Room" />
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 text-xs font-semibold">Active Devices</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Laptop className="w-6 h-6 text-blue-600" />
            <span>Active Devices</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            View the devices currently signed in to your CarePulse account.
          </p>
        </div>

        {/* Refresh Action */}
        <div className="shrink-0 flex items-center space-x-2">
          <button
            onClick={() => fetchDevices(true)}
            disabled={refreshing || loading}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ==================== TOAST / ALERT NOTIFICATION ==================== */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ==================== 2. MAIN DEVICE CONTENT ==================== */}
      {loading ? (
        // Skeleton Loading State
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs animate-pulse space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 bg-slate-100 rounded" />
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-5 w-24 bg-slate-100 rounded-full" />
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="h-3.5 w-36 bg-slate-100 rounded" />
                <div className="h-3.5 w-44 bg-slate-100 rounded" />
              </div>
              <div className="h-8 w-full bg-slate-100 rounded-xl mt-3" />
            </div>
          ))}
        </div>
      ) : error ? (
        // Error State
        <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{error}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We were unable to retrieve the active devices for your account.
          </p>
          <button
            onClick={() => fetchDevices(false)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-2xs"
          >
            Try Again
          </button>
        </div>
      ) : devices.length === 0 ? (
        // Empty State
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Laptop className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No active devices found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No devices are currently registered to your account.
          </p>
          <button
            onClick={() => fetchDevices(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Devices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {devices.map((device) => {
              const isCurrent = Boolean(device.isCurrentDevice);

              return (
                <div
                  key={device.id}
                  className={`bg-white rounded-2xl p-5 border shadow-2xs transition-all flex flex-col justify-between ${
                    isCurrent ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top: Device Icon, Name & Current Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                          {getDeviceIcon(device)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                            {device.deviceName}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            {device.browser} · {device.os}
                          </p>
                        </div>
                      </div>

                      {/* Current Device Indicator */}
                      {isCurrent && (
                        <span className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Current Device</span>
                        </span>
                      )}
                    </div>

                    {/* Middle: Approximate Location & Last Active */}
                    <div className="space-y-1.5 py-3 border-t border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium">{device.location || 'Location unavailable'}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Last active:{' '}
                          <strong className="font-semibold text-slate-700">{device.lastActive}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action */}
                  <div className="pt-3 border-t border-slate-100 mt-2">
                    {isCurrent ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold cursor-default flex items-center justify-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Current Device</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeviceToSignOut(device)}
                        className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-2xs"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* If there are no other devices besides current device */}
          {otherDevices.length === 0 && currentDevice && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-center space-y-1">
              <p className="text-xs font-bold text-slate-700">No other active devices.</p>
              <p className="text-xs text-slate-500">
                This is the only device currently signed in to your CarePulse account.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==================== 3. SIGN OUT CONFIRMATION MODAL ==================== */}
      {deviceToSignOut && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Sign out this device?</h3>
              <button
                onClick={() => setDeviceToSignOut(null)}
                disabled={isSigningOut}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will remove its active CarePulse session. The user on that device will need to sign in again to access the account.
            </p>

            {/* Device Info Summary */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center space-x-2 font-bold text-slate-800">
                {getDeviceIcon(deviceToSignOut)}
                <span>{deviceToSignOut.deviceName}</span>
              </div>
              <div className="text-slate-500 space-y-1">
                <div>
                  Platform:{' '}
                  <span className="text-slate-700 font-semibold">
                    {deviceToSignOut.browser} · {deviceToSignOut.os}
                  </span>
                </div>
                <div>
                  Location:{' '}
                  <span className="text-slate-700 font-semibold">
                    {deviceToSignOut.location || 'Location unavailable'}
                  </span>
                </div>
                <div>
                  Last Active:{' '}
                  <span className="text-slate-700 font-semibold">{deviceToSignOut.lastActive}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeviceToSignOut(null)}
                disabled={isSigningOut}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSignOut}
                disabled={isSigningOut}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-2xs flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {isSigningOut ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing Out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
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
