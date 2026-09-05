'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const subscribe = (callback: () => void) => {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
};

export function DisclaimerBanner() {
  const [localDismissed, setLocalDismissed] = useState(false);

  const isSessionDismissed = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return sessionStorage.getItem('suga_disclaimer_dismissed') === 'true';
      } catch {
        return false;
      }
    },
    () => false
  );

  const isDismissed = localDismissed || isSessionDismissed;

  const handleDismiss = () => {
    setLocalDismissed(true);
    try {
      sessionStorage.setItem('suga_disclaimer_dismissed', 'true');
    } catch {}
  };

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="relative bg-[var(--accent-orange)]/10 border-b border-[var(--accent-orange)]/20 px-4 py-2.5">
            <div className="max-w-2xl sm:max-w-3xl md:max-w-4xl mx-auto flex items-center justify-center gap-2 text-xs sm:text-[13px]">
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--accent-orange)] shrink-0" />
              <p className="text-[var(--label-secondary)]">
                <span className="font-semibold text-[var(--accent-orange)]">Disclaimer:</span>{' '}
                This is an <span className="font-medium">unofficial</span> community project and is not affiliated with or endorsed by Visayan Electric (VECO).
              </p>
              <button
                onClick={handleDismiss}
                className="ml-1.5 p-1 rounded-full hover:bg-[var(--tertiary-fill)] transition-colors shrink-0 cursor-pointer"
                aria-label="Dismiss disclaimer"
              >
                <X className="w-3.5 h-3.5 text-[var(--label-tertiary)]" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
