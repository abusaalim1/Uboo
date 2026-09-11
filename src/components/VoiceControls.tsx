import React, { useState } from 'react';
import { Mic, MicOff, Square, Send, Sparkles, Volume2, Radio } from 'lucide-react';
import { AssistantStatus, ConversationMode } from '../types';

interface VoiceControlsProps {
  status: AssistantStatus;
  isMicActive: boolean;
  onToggleMic: () => void;
  onInterrupt: () => void;
  onSendMessage: (text: string) => void;
  mode: ConversationMode;
  onModeChange: (mode: ConversationMode) => void;
}

const QUICK_PROMPTS = [
  'Tell me a brief motivational thought',
  'Explain quantum computing in simple terms',
  'What is happening in space exploration right now?',
  'Help me practice casual conversational French',
];

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  status,
  isMicActive,
  onToggleMic,
  onInterrupt,
  onSendMessage,
  mode,
  onModeChange,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const isSpeaking = status === 'speaking';

  return (
    <div id="voice-controls-section" className="w-full flex flex-col items-center gap-4">
      {/* Quick Prompt Suggestions */}
      <div className="w-full overflow-x-auto pb-1 scrollbar-none flex items-center justify-center gap-2 px-2">
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            id={`quick-prompt-${i}`}
            onClick={() => onSendMessage(prompt)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Main Interactive Mic & Action Bar */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 shadow-xl">
        {/* Mode Switcher Pill */}
        <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
          <button
            id="mode-btn-live"
            onClick={() => onModeChange('live')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              mode === 'live'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Real-time Live API audio stream with Gemini 3.1 Flash Live Preview"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            <span>Live Stream</span>
          </button>
          <button
            id="mode-btn-pipeline"
            onClick={() => onModeChange('pipeline')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              mode === 'pipeline'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Turn-by-turn Speech recognition + Gemini 3.8 Flash + Gemini TTS"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
            <span>Pipeline TTS</span>
          </button>
        </div>

        {/* Center Mic Button & Interrupt */}
        <div className="flex items-center gap-3">
          {/* Interrupt Button (Visible when Gemini is speaking) */}
          {isSpeaking && (
            <button
              id="interrupt-btn"
              onClick={onInterrupt}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Interrupt</span>
            </button>
          )}

          {/* Primary Microphone Trigger */}
          <button
            id="primary-mic-btn"
            onClick={onToggleMic}
            className={`relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 active:scale-90 ${
              isMicActive
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 ring-4 ring-red-500/20'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 ring-4 ring-indigo-500/20'
            }`}
            title={isMicActive ? 'Mute Microphone' : 'Start Speaking'}
          >
            {isMicActive ? (
              <MicOff className="w-6 h-6 animate-pulse" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Text Input Fallback */}
        <form
          id="text-input-form"
          onSubmit={handleSubmit}
          className="w-full sm:w-72 flex items-center bg-slate-950/80 rounded-xl border border-slate-800 px-3 py-1.5 focus-within:border-indigo-500/80 transition-colors"
        >
          <input
            id="chat-text-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Or type a question..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            id="send-text-btn"
            type="submit"
            disabled={!inputText.trim()}
            className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 disabled:opacity-30 disabled:hover:text-indigo-400 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
