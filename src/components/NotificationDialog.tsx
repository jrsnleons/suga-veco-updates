'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, BellRing, BellOff, MapPin, Check, X, 
  Sparkles, ShieldCheck, AlertTriangle, Send, RotateCcw, 
  Clock, Zap, RefreshCw, Calendar
} from 'lucide-react';
import { useScrollLock } from '@/lib/use-scroll-lock';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getNotificationPrefs,
  saveNotificationPrefs,
  sendTestNotification,
  clearNotifiedHistory,
  isIOS,
  isStandalonePWA,
  NotificationPreferences,
} from '@/lib/notification-manager';

interface NotificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: string[];
  onOpenPinDialog: () => void;
}

export const NotificationDialog: React.FC<NotificationDialogProps> = ({
  isOpen,
  onClose,
  favorites,
  onOpenPinDialog,
}) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [prefs, setPrefs] = useState<NotificationPreferences>(getNotificationPrefs);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  useScrollLock(isOpen);

  // Sync permissions and preferences when modal opens
  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      setPrefs(getNotificationPrefs());
      setTestSuccess(null);
      setResetSuccess(false);
    }
  }, [isOpen]);

  // Handle escape key to dismiss dialog
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
  };

  const handleTogglePref = (key: keyof NotificationPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    saveNotificationPrefs(updated);
  };

  const handleSendTest = async () => {
    setIsTesting(true);
    setTestSuccess(null);
    try {
      const ok = await sendTestNotification();
      setTestSuccess(ok);
      setPermission(getNotificationPermission());
    } catch {
      setTestSuccess(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetHistory = () => {
    clearNotifiedHistory();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2500);
  };

  const isGranted = permission === 'granted';
  const isDenied = permission === 'denied';
  const isUnsupported = permission === 'unsupported' || !isNotificationSupported();
  const showIOSNotice = isIOS() && !isStandalonePWA();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[var(--sheet-scrim)] backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 touch-none"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-dialog-title"
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--elevated-surface)] border border-[var(--hairline)] rounded-t-[32px] sm:rounded-[24px] max-w-md w-full p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] space-y-4 shadow-2xl max-h-[90vh] flex flex-col overscroll-contain touch-pan-y overflow-hidden"
          >
            {/* iOS Sheet Grabber Bar */}
            <div className="w-12 h-1.5 rounded-full bg-[var(--label-tertiary)]/70 dark:bg-white/35 mx-auto -mt-1 mb-1 shadow-xs" />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--accent-orange)]/15 text-[var(--accent-orange)] flex items-center justify-center font-semibold">
                  <BellRing className="w-4 h-4 text-[var(--accent-orange)]" />
                </div>
                <div>
                  <h3 id="notification-dialog-title" className="text-[17px] font-semibold text-[var(--label-primary)]">
                    Brownout Alerts
                  </h3>
                  <p className="text-[12px] text-[var(--label-secondary-alpha)]">
                    Strictly for your pinned locations
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[var(--tertiary-fill)] text-[var(--label-secondary)] hover:text-[var(--label-primary)] flex items-center justify-center cursor-pointer ios-press"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 space-y-4 pr-1 max-h-[65vh] overscroll-contain touch-pan-y no-scrollbar sm:ios-drawer-scroll">
              
              {/* Permission Banner */}
              <div className="p-4 rounded-2xl bg-[var(--secondary-bg)] border border-[var(--hairline)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isGranted ? (
                      <ShieldCheck className="w-5 h-5 text-[var(--accent-green)]" />
                    ) : isDenied ? (
                      <BellOff className="w-5 h-5 text-[var(--accent-red)]" />
                    ) : (
                      <Bell className="w-5 h-5 text-[var(--accent-blue)]" />
                    )}
                    <div>
                      <div className="text-[14px] font-semibold text-[var(--label-primary)]">
                        {isGranted
                          ? 'Alerts Active'
                          : isDenied
                          ? 'Notifications Blocked'
                          : isUnsupported
                          ? 'Browser Not Supported'
                          : 'Permission Required'}
                      </div>
                      <div className="text-[11px] text-[var(--label-secondary-alpha)]">
                        {isGranted
                          ? 'Your device will receive outage updates.'
                          : isDenied
                          ? 'Enable in browser settings to receive alerts.'
                          : isUnsupported
                          ? 'Web Notifications are unavailable on this device.'
                          : 'Allow notifications to receive outage alerts.'}
                      </div>
                    </div>
                  </div>

                  {isGranted && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-[10px] font-bold text-[var(--accent-green)] font-mono-tabular">
                      LIVE
                    </span>
                  )}
                </div>

                {/* Actions depending on permission state */}
                {!isGranted && !isDenied && !isUnsupported && (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleRequestPermission}
                    className="w-full py-2.5 rounded-xl bg-[var(--accent-blue)] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 fill-current" />
                    <span>Enable Outage Notifications</span>
                  </motion.button>
                )}

                {isGranted && (
                  <div className="pt-2 border-t border-[var(--hairline)] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--label-secondary-alpha)] font-mono-tabular">
                      {testSuccess === true ? '✓ Alert received!' : testSuccess === false ? '⚠️ Dispatch failed' : 'Verify sound & banner'}
                    </span>
                    <button
                      onClick={handleSendTest}
                      disabled={isTesting}
                      className="px-3 py-1.5 rounded-xl bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 text-[var(--accent-blue)] font-medium text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isTesting ? 'Sending...' : 'Send Test Alert'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* iOS Safari Home Screen Notice */}
              {showIOSNotice && (
                <div className="p-3.5 rounded-2xl bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20 space-y-1 text-xs text-[var(--label-primary)]">
                  <div className="font-semibold flex items-center gap-1.5 text-[var(--accent-blue)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>iPhone Web Push Guide</span>
                  </div>
                  <p className="text-[11px] text-[var(--label-secondary-alpha)] leading-relaxed">
                    To receive background notifications on iOS, tap <strong>Share</strong> (box with arrow) at the bottom of Safari, then choose <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                  </p>
                </div>
              )}

              {/* Monitored Locations Card */}
              <div className="p-3.5 rounded-2xl bg-[var(--secondary-bg)] border border-[var(--hairline)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[var(--accent-blue)]" />
                    <span className="text-[13px] font-semibold text-[var(--label-primary)]">
                      Monitored Locations
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenPinDialog();
                    }}
                    className="text-[11px] font-semibold text-[var(--accent-blue)] hover:underline cursor-pointer"
                  >
                    Manage Pins
                  </button>
                </div>

                {favorites.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {favorites.map((fav) => (
                      <span
                        key={fav}
                        className="px-2.5 py-1 rounded-lg bg-[var(--accent-blue)]/12 border border-[var(--accent-blue)]/20 text-[var(--accent-blue)] text-[11px] font-medium flex items-center gap-1"
                      >
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>{fav}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/25 flex items-start gap-2.5 text-xs text-[var(--label-primary)]">
                    <AlertTriangle className="w-4 h-4 text-[var(--accent-orange)] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">No locations pinned yet</span>
                      <span className="text-[11px] text-[var(--label-secondary-alpha)]">
                        Notifications only trigger for pinned areas. Pin your barangay or city to start receiving power alerts.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notification Type Toggles */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[var(--label-secondary-alpha)] uppercase tracking-wider px-1">
                  Alert Preferences
                </span>

                <div className="rounded-2xl bg-[var(--secondary-bg)] border border-[var(--hairline)] divide-y divide-[var(--hairline)] overflow-hidden">
                  
                  {/* 1. 1-Hour Advance Warning */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--accent-orange)]/15 text-[var(--accent-orange)] flex items-center justify-center mt-0.5 flex-shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-[var(--label-primary)] leading-tight">
                          1-Hour Advance Warning
                        </div>
                        <div className="text-[11px] text-[var(--label-secondary-alpha)] mt-0.5 leading-snug">
                          Alert ~60 mins before a scheduled outage starts today.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs.oneHourAdvance}
                      onClick={() => handleTogglePref('oneHourAdvance')}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                        prefs.oneHourAdvance ? 'bg-[var(--accent-blue)]' : 'bg-[var(--tertiary-fill)]'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          prefs.oneHourAdvance ? 'translate-x-5.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 2. New Advisory Alerts */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] flex items-center justify-center mt-0.5 flex-shrink-0">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-[var(--label-primary)] leading-tight">
                          New Advisory Detected
                        </div>
                        <div className="text-[11px] text-[var(--label-secondary-alpha)] mt-0.5 leading-snug">
                          Alert when VECO posts a new upcoming schedule.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs.newAdvisories}
                      onClick={() => handleTogglePref('newAdvisories')}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                        prefs.newAdvisories ? 'bg-[var(--accent-blue)]' : 'bg-[var(--tertiary-fill)]'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          prefs.newAdvisories ? 'translate-x-5.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 3. Schedule & Status Changes */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--accent-red)]/15 text-[var(--accent-red)] flex items-center justify-center mt-0.5 flex-shrink-0">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-[var(--label-primary)] leading-tight">
                          Status & Cancellation Alerts
                        </div>
                        <div className="text-[11px] text-[var(--label-secondary-alpha)] mt-0.5 leading-snug">
                          Alert if an outage is cancelled, delayed, or emergency.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs.statusChanges}
                      onClick={() => handleTogglePref('statusChanges')}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                        prefs.statusChanges ? 'bg-[var(--accent-blue)]' : 'bg-[var(--tertiary-fill)]'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          prefs.statusChanges ? 'translate-x-5.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 4. Power Restored Alerts */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--accent-green)]/15 text-[var(--accent-green)] flex items-center justify-center mt-0.5 flex-shrink-0">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-[var(--label-primary)] leading-tight">
                          Power Restored Notice
                        </div>
                        <div className="text-[11px] text-[var(--label-secondary-alpha)] mt-0.5 leading-snug">
                          Alert when active outage ends and power is restored.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs.powerRestored}
                      onClick={() => handleTogglePref('powerRestored')}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                        prefs.powerRestored ? 'bg-[var(--accent-blue)]' : 'bg-[var(--tertiary-fill)]'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          prefs.powerRestored ? 'translate-x-5.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 5. Daily Morning Briefing */}
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] flex items-center justify-center mt-0.5 flex-shrink-0">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-[var(--label-primary)] leading-tight">
                          Daily Morning Briefing
                        </div>
                        <div className="text-[11px] text-[var(--label-secondary-alpha)] mt-0.5 leading-snug">
                          Morning summary if any outage is scheduled for today.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs.morningBriefing}
                      onClick={() => handleTogglePref('morningBriefing')}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                        prefs.morningBriefing ? 'bg-[var(--accent-blue)]' : 'bg-[var(--tertiary-fill)]'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          prefs.morningBriefing ? 'translate-x-5.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                </div>
              </div>

              {/* Reset History Action */}
              <div className="pt-1 flex items-center justify-between text-xs px-1">
                <span className="text-[11px] text-[var(--label-secondary-alpha)]">
                  {resetSuccess ? '✓ Alert history cleared' : 'Testing again?'}
                </span>
                <button
                  onClick={handleResetHistory}
                  className="text-[11px] text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Sent History</span>
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-[var(--hairline)] flex items-center justify-between text-xs text-[var(--label-secondary-alpha)]">
              <span className="font-mono-tabular">
                {isGranted ? 'Notifications Active' : 'Notifications Paused'}
              </span>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[var(--accent-blue)] text-white font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer select-none"
              >
                Done
              </motion.button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
