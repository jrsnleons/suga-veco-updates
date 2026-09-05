'use client';

import React from 'react';
import { Zap, Calendar, Archive } from 'lucide-react';

export type ActiveTab = 'status' | 'calendar' | 'archive';

interface BottomNavProps {
  currentTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab }) => {
  return (
    <nav className="fixed bottom-4 inset-x-0 max-w-xs mx-auto px-4 z-40">
      <div className="glass-nav rounded-2xl p-1 shadow-2xl flex items-center justify-around">
        <button 
          onClick={() => onChangeTab('status')}
          className={`flex-1 py-2 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
            currentTab === 'status' ? 'text-zinc-100 bg-zinc-800/60' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none">Status</span>
        </button>

        <button 
          onClick={() => onChangeTab('calendar')}
          className={`flex-1 py-2 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
            currentTab === 'calendar' ? 'text-zinc-100 bg-zinc-800/60' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none">Calendar</span>
        </button>

        <button 
          onClick={() => onChangeTab('archive')}
          className={`flex-1 py-2 rounded-xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
            currentTab === 'archive' ? 'text-zinc-100 bg-zinc-800/60' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none">Archive</span>
        </button>
      </div>
    </nav>
  );
};
