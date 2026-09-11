import React, { useEffect, useRef, useState } from 'react';
import {
  User,
  Bot,
  Volume2,
  Copy,
  Check,
  Sparkles,
  Trash2,
  Download,
  CheckCircle2,
  Wrench,
  Cloud,
} from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatHistoryProps {
  messages: ChatMessage[];
  liveTranscript: { user: string; assistant: string };
  onSpeakMessage: (text: string) => void;
  onClearChat: () => void;
  status: string;
  aiName: string;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  liveTranscript,
  onSpeakMessage,
  onClearChat,
  status,
  aiName,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, liveTranscript]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    const transcriptText = messages
      .map((m) => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.role.toUpperCase()}: ${m.text}`)
      .join('\n\n');
    const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uboo-voice-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="chat-history-container"
      className="flex flex-col h-full w-full bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide flex items-center gap-1.5">
            <span>Conversation with {aiName || 'Uboo'}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/50 flex items-center gap-1">
              <Cloud className="w-2.5 h-2.5 text-indigo-400" />
              <span>Cloud Sync</span>
            </span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">({messages.length})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="export-transcript-btn"
            onClick={handleExport}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Download Transcript"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            id="clear-chat-history-btn"
            onClick={onClearChat}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xl">
              💬
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Say "Hey {aiName || 'Uboo'}" or tap the Mic to start</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Try: "Turn on flashlight", "Set volume to 80%", "Open YouTube", or simply chat about anything naturally.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/80 text-amber-300 border border-amber-500/20 max-w-md text-center flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{msg.text}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex gap-3 items-start ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 border border-indigo-500/30 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`group relative max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-xs'
                    : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{msg.text}</div>

                {/* Device Command badge if executed */}
                {msg.commandExecuted && (
                  <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-mono">{msg.commandExecuted.statusMessage}</span>
                  </div>
                )}

                {/* Footer info & Actions */}
                <div className="mt-2 flex items-center justify-between gap-3 text-[11px] opacity-70">
                  <div className="flex items-center gap-1.5">
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    {msg.modelUsed && (
                      <span className="hidden sm:inline px-1.5 py-0.5 rounded-md bg-slate-900/40 text-[10px] text-slate-300 font-mono">
                        {msg.modelUsed.includes('live') ? 'Gemini Live' : 'Gemini 3.8'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isUser && (
                      <button
                        onClick={() => onSpeakMessage(msg.text)}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-slate-300 hover:text-white"
                        title="Read aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="p-1 hover:bg-white/10 rounded transition-colors text-slate-300 hover:text-white"
                      title="Copy message"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-full bg-slate-700/60 border border-slate-600 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Live Interim Transcripts */}
        {liveTranscript.user && (
          <div className="flex justify-end gap-3 items-start animate-fade-in">
            <div className="max-w-[80%] rounded-2xl rounded-tr-xs px-4 py-3 text-sm bg-indigo-600/60 text-indigo-100 border border-indigo-500/40 italic flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping" />
              <span>{liveTranscript.user}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-500/40 border border-indigo-400 flex items-center justify-center text-white shrink-0 mt-0.5">
              <User className="w-4 h-4" />
            </div>
          </div>
        )}

        {liveTranscript.assistant && (
          <div className="flex justify-start gap-3 items-start animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-tl-xs px-4 py-3 text-sm bg-slate-800/70 text-slate-200 border border-indigo-500/30">
              <div className="flex items-center gap-1.5 mb-1 text-xs text-indigo-400 font-medium">
                <Sparkles className="w-3 h-3 animate-spin" />
                <span>{aiName || 'Uboo'} speaking...</span>
              </div>
              <div className="whitespace-pre-wrap">{liveTranscript.assistant}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
