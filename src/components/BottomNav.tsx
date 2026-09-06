'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Radio, Bookmark, Calendar } from 'lucide-react';

export type ActiveTab = 'pulse' | 'radar' | 'watchlist' | 'timeline';

interface BottomNavProps {
  currentTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab }) => {
  const tabs = [
    { id: 'pulse' as const, label: 'Pulse', icon: Zap },
    { id: 'radar' as const, label: 'Radar', icon: Radio },
    { id: 'watchlist' as const, label: 'Watchlist', icon: Bookmark },
    { id: 'timeline' as const, label: 'Timeline', icon: Calendar },
  ];

  return (
    <nav aria-label="Main navigation" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] inset-x-0 max-w-sm sm:max-w-md mx-auto px-3 z-40 pointer-events-none">
      <div role="tablist" className="pointer-events-auto ios-vibrancy-pill rounded-full p-1.5 flex items-center justify-around border border-[var(--hairline)] shadow-2xl backdrop-blur-2xl">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <motion.button 
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => onChangeTab(tab.id)}
              whileTap={{ scale: 0.92 }}
              className="relative flex-1 py-1.5 px-2.5 rounded-full flex flex-col items-center justify-center gap-0.5 cursor-pointer outline-none select-none transition-colors"
              style={{ minHeight: '44px' }}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active-pill"
                  className="absolute inset-0 bg-[var(--accent-blue)]/12 rounded-full border border-[var(--accent-blue)]/20"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              <Icon className={`w-4 h-4 relative z-10 transition-colors ${
                isActive ? 'text-[var(--accent-blue)] stroke-[2.5]' : 'text-[var(--label-secondary-alpha)] stroke-2'
              }`} />
              <span className={`text-[10px] tracking-tight leading-none relative z-10 transition-colors ${
                isActive ? 'text-[var(--accent-blue)] font-semibold' : 'text-[var(--label-secondary-alpha)]'
              }`}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
