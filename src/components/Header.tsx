import React from 'react';
import { Mic, Radio, Settings, Activity, Zap, Smartphone, CloudCheck, ShieldCheck } from 'lucide-react';
import { ConversationMode, AssistantStatus } from '../types';

interface HeaderProps {
  mode: ConversationMode;
  status: AssistantStatus;
  selectedVoice: string;
  aiName: string;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  status,
  selectedVoice,
  aiName,
  onOpenSettings,
}) => {
  return (
    <header
      id="app-header"
      className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-40"
    >
      {/* Brand & Assistant Name */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25">
          <Smartphone className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-sans flex items-center gap-1.5">
              <span>{aiName || 'Uboo'}</span>
              <span className="text-xs text-indigo-400 font-normal">Android AI</span>
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Full Phone Control</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Next-gen voice assistant with custom wake words & cloud sync
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Active Voice Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-medium">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span>Voice: <strong className="text-white font-semibold">{selectedVoice}</strong></span>
        </div>

        {/* Settings button */}
        <button
          id="open-settings-btn"
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all text-xs font-medium active:scale-95 shadow-sm"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span className="hidden sm:inline">Settings & AI Name</span>
        </button>
      </div>
    </header>
  );
};
