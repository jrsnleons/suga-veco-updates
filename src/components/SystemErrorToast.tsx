'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, X, RefreshCw } from 'lucide-react';

interface SystemErrorToastProps {
  isVisible: boolean;
  onDismiss: () => void;
  onRetry?: () => void;
  message?: string;
}

export const SystemErrorToast: React.FC<SystemErrorToastProps> = ({
  isVisible,
  onDismiss,
  onRetry,
  message = 'Unable to fetch the latest schedules. The system may be temporarily unavailable.',
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="fixed top-[calc(4.5rem+env(safe-area-inset-top,0px))] inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
        >
          <div className="pointer-events-auto max-w-md w-full bg-[var(--elevated-surface)] border border-[var(--accent-red)]/30 rounded-2xl shadow-2xl p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-red)]/12 flex items-center justify-center shrink-0">
                  <WifiOff className="w-4.5 h-4.5 text-[var(--accent-red)]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--label-primary)]">
                    System Unavailable
                  </h3>
                  <p className="text-xs text-[var(--label-secondary-alpha)] leading-relaxed mt-0.5">
                    {message}
                  </p>
                </div>
              </div>

              <button
                onClick={onDismiss}
                className="w-7 h-7 rounded-full bg-[var(--tertiary-fill)] text-[var(--label-secondary)] hover:text-[var(--label-primary)] flex items-center justify-center cursor-pointer shrink-0 ios-press"
                aria-label="Dismiss error notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Actions */}
            {onRetry && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onDismiss();
                    onRetry();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--accent-blue)] hover:opacity-90 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity cursor-pointer ios-press"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={onDismiss}
                  className="px-4 py-2.5 rounded-xl bg-[var(--tertiary-fill)] hover:bg-[var(--tertiary-fill)]/80 text-[var(--label-primary)] text-xs font-semibold transition-colors cursor-pointer ios-press"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
