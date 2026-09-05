'use client';

import React from 'react';
import { Zap, RefreshCw } from 'lucide-react';

interface HeaderProps {
  lastSyncedText: string;
  isSyncing: boolean;
  onSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({ lastSyncedText, isSyncing, onSync }) => {
  return (
    <header className="flex items-center justify-between pt-1">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 font-semibold text-sm shadow-xs">
          <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold tracking-tight text-zinc-100 block">Suga</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 font-mono">VECO Feed</span>
          </div>
          <span className="text-[11px] text-zinc-400">Cebu Power & Brownout Monitor</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
        <span className="font-medium text-zinc-300">{lastSyncedText}</span>
        <button 
          onClick={onSync} 
          disabled={isSyncing}
          className="hover:text-zinc-100 p-1.5 rounded-md hover:bg-zinc-800/80 text-zinc-400 transition-colors disabled:opacity-50 cursor-pointer" 
          title="Check Facebook for updates"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
