'use client';

import React from 'react';
import { Radio, Calendar, Clock } from 'lucide-react';

export type ActiveTab = 'status' | 'calendar' | 'archive';

interface BottomNavProps {
  currentTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab }) => {
  const tabs = [
    { id: 'status' as const, label: 'Radar', icon: Radio },
    { id: 'calendar' as const, label: 'Timeline', icon: Calendar },
    { id: 'archive' as const, label: 'History', icon: Clock },
  ];

  return (
    <nav className="fixed bottom-5 inset-x-0 max-w-xs sm:max-w-sm mx-auto px-4 z-40 pointer-events-none">
      <div className="pointer-events-auto ios-vibrancy-pill rounded-full p-1.5 shadow-2xl flex items-center justify-around border border-[var(--hairline)]">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button 
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex-1 py-1.5 px-3 rounded-full flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ios-press ${
                isActive 
                  ? 'text-[var(--accent-blue)] bg-[var(--accent-blue)]/12 font-semibold' 
                  : 'text-[var(--label-secondary-alpha)] hover:text-[var(--label-primary)]'
              }`}
              style={{ minHeight: '44px' }}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] tracking-tight leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
