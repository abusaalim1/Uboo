import React, { useState } from 'react';
import {
  X,
  Play,
  Check,
  Volume2,
  Sliders,
  UserCheck,
  Sparkles,
  Smartphone,
  Shield,
  Plus,
  Trash2,
  Cloud,
} from 'lucide-react';
import { VoiceProfile, AssistantPersona, UserCustomSettings } from '../types';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: string;
  onSelectVoice: (voiceId: string) => void;
  voices: VoiceProfile[];
  systemPrompt: string;
  onUpdateSystemPrompt: (prompt: string) => void;
  selectedPersona: string;
  onSelectPersona: (persona: AssistantPersona) => void;
  personas: AssistantPersona[];
  onTestVoice: (voiceId: string) => void;
  // Custom AI Name & Wake Words
  userSettings: UserCustomSettings;
  onUpdateSettings: (settings: Partial<UserCustomSettings>) => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  selectedVoice,
  onSelectVoice,
  voices,
  systemPrompt,
  onUpdateSystemPrompt,
  selectedPersona,
  onSelectPersona,
  personas,
  onTestVoice,
  userSettings,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'assistant' | 'voices' | 'personas' | 'prompt'>('assistant');
  const [newWakeWord, setNewWakeWord] = useState('');

  if (!isOpen) return null;

  const handleAddWakeWord = () => {
    if (!newWakeWord.trim()) return;
    const clean = newWakeWord.trim().toLowerCase();
    if (!userSettings.wakeWords.includes(clean)) {
      onUpdateSettings({
        wakeWords: [...userSettings.wakeWords, clean],
      });
    }
    setNewWakeWord('');
  };

  const handleRemoveWakeWord = (word: string) => {
    onUpdateSettings({
      wakeWords: userSettings.wakeWords.filter((w) => w !== word),
    });
  };

  return (
    <div
      id="voice-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <span>Assistant & Voice Configuration</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  Cloud Synced
                </span>
              </h2>
              <p className="text-xs text-slate-400">Custom names, wake words, Gemini speech & personas</p>
            </div>
          </div>
          <button
            id="close-settings-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2 overflow-x-auto scrollbar-none">
          <button
            id="tab-assistant-btn"
            onClick={() => setActiveTab('assistant')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'assistant'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Name & Wake Word</span>
          </button>
          <button
            id="tab-voices-btn"
            onClick={() => setActiveTab('voices')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'voices'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Natural Voices ({voices.length})
          </button>
          <button
            id="tab-personas-btn"
            onClick={() => setActiveTab('personas')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'personas'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Personas
          </button>
          <button
            id="tab-prompt-btn"
            onClick={() => setActiveTab('prompt')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'prompt'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            System Rules
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Custom Name & Wake Word Tab */}
          {activeTab === 'assistant' && (
            <div className="space-y-4">
              {/* AI Name Input */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2.5">
                <label className="block text-xs font-semibold text-slate-200">
                  Custom AI Assistant Name
                </label>
                <p className="text-xs text-slate-400">
                  You can call your AI assistant by any custom name like <strong className="text-indigo-300">Uboo</strong>, <strong className="text-indigo-300">Abu</strong>, <strong className="text-indigo-300">Priya</strong>, or <strong className="text-indigo-300">Jarvis</strong>.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={userSettings.aiName}
                    onChange={(e) => {
                      const name = e.target.value;
                      onUpdateSettings({
                        aiName: name,
                        wakeWords: Array.from(new Set([
                          `hey ${name.toLowerCase()}`,
                          `hello ${name.toLowerCase()}`,
                          name.toLowerCase(),
                          ...userSettings.wakeWords,
                        ])).filter(Boolean),
                      });
                    }}
                    placeholder="Enter AI name (e.g. Uboo, Abu, Priya)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                {/* Preset Quick Names */}
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <span className="text-[11px] text-slate-400">Quick presets:</span>
                  {['Uboo', 'Abu', 'Priya', 'Jarvis', 'Siri X'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() =>
                        onUpdateSettings({
                          aiName: preset,
                          wakeWords: [
                            `hey ${preset.toLowerCase()}`,
                            `hello ${preset.toLowerCase()}`,
                            preset.toLowerCase(),
                          ],
                        })
                      }
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        userSettings.aiName.toLowerCase() === preset.toLowerCase()
                          ? 'bg-indigo-600 border-indigo-500 text-white font-medium'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wake Words Management */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Active Wake Words & Triggers</div>
                    <div className="text-[11px] text-slate-400">Speak any of these phrases to trigger listening</div>
                  </div>
                </div>

                {/* Word Badges */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {userSettings.wakeWords.map((word) => (
                    <div
                      key={word}
                      className="px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 text-xs flex items-center gap-2 font-medium"
                    >
                      <span>"{word}"</span>
                      {userSettings.wakeWords.length > 1 && (
                        <button
                          onClick={() => handleRemoveWakeWord(word)}
                          className="text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add new wake word */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newWakeWord}
                    onChange={(e) => setNewWakeWord(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWakeWord()}
                    placeholder="Add custom trigger (e.g. hey dost)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddWakeWord}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Cloud Sync Status info */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                <Cloud className="w-5 h-5 text-indigo-400" />
                <div className="text-xs text-slate-300">
                  <strong className="text-slate-100">Firebase Cloud Persistence Active:</strong> All messages, device permissions, and custom wake word settings are saved to Firebase Firestore.
                </div>
              </div>
            </div>
          )}

          {/* Voices Tab */}
          {activeTab === 'voices' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Select a high-fidelity natural voice for Gemini spoken audio:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {voices.map((v) => {
                  const isSelected = selectedVoice === v.id;
                  return (
                    <div
                      key={v.id}
                      id={`voice-card-${v.id.toLowerCase()}`}
                      onClick={() => onSelectVoice(v.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 shadow-md'
                          : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-100">{v.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                              {v.gender}
                            </span>
                          </div>
                          <p className="text-xs text-indigo-400 font-medium mt-0.5">{v.tone}</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2">{v.description}</p>

                      <div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTestVoice(v.id);
                          }}
                          className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-700"
                        >
                          <Volume2 className="w-3 h-3 text-indigo-400" />
                          <span>Preview Sample</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Personas Tab */}
          {activeTab === 'personas' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Choose an assistant persona for dynamic conversational tone:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {personas.map((p) => {
                  const isSelected = selectedPersona === p.id;
                  return (
                    <div
                      key={p.id}
                      id={`persona-${p.id}`}
                      onClick={() => onSelectPersona(p)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 shadow-md'
                          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg">
                          {p.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-100">{p.name}</div>
                          <div className="text-xs text-slate-400">{p.title}</div>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Apply</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* System Rules */}
          {activeTab === 'prompt' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Custom System Instructions
                </label>
                <textarea
                  id="system-prompt-input"
                  rows={6}
                  value={systemPrompt}
                  onChange={(e) => onUpdateSystemPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-100 font-mono focus:border-indigo-500 focus:outline-none leading-relaxed"
                  placeholder="E.g., You are a friendly, concise voice assistant..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() =>
                    onUpdateSystemPrompt(
                      'You are a high-performance, natural, and friendly voice assistant. Keep answers concise, conversational, free of markdown formatting, and easy to understand when read aloud.'
                    )
                  }
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Reset to Default
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            id="done-settings-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md active:scale-95"
          >
            Save & Done
          </button>
        </div>
      </div>
    </div>
  );
};
