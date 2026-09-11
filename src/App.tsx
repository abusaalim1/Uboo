/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { AudioVisualizer } from './components/AudioVisualizer';
import { VoiceControls } from './components/VoiceControls';
import { ChatHistory } from './components/ChatHistory';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { AndroidDeviceControlPanel } from './components/AndroidDeviceControlPanel';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';
import {
  ConversationMode,
  VoiceProfile,
  AssistantPersona,
  UserCustomSettings,
  DevicePermissionState,
  AndroidDeviceState,
} from './types';
import { deviceManager } from './utils/deviceManager';
import {
  saveSettingsToCloud,
  savePermissionsToCloud,
} from './services/cloudStorage';

const INITIAL_PERSONAS: AssistantPersona[] = [
  {
    id: 'general',
    name: 'Uboo Conversationalist',
    title: 'Natural, friendly, human-like voice',
    voice: 'Zephyr',
    icon: '✨',
    systemPrompt:
      'You are Uboo, an advanced Android Voice AI Assistant. You speak with natural, warm, human cadence. Support casual conversation, Hindi/Hinglish, and execute phone hardware controls effortlessly.',
  },
  {
    id: 'expert',
    name: 'Android Tech & Control Pro',
    title: 'Precise system control & knowledge',
    voice: 'Puck',
    icon: '⚡',
    systemPrompt:
      'You are Uboo (Tech Mode), focused on fast phone control, analytical accuracy, and concise spoken responses.',
  },
  {
    id: 'companion',
    name: 'Friendly Buddy (Abu / Priya)',
    title: 'Warm, empathic daily companion',
    voice: 'Kore',
    icon: '❤️',
    systemPrompt:
      'You are a warm, witty, and friendly companion. Converse naturally like a good friend, sharing advice and helpful tips.',
  },
  {
    id: 'dynamic',
    name: 'Dynamic Voice',
    title: 'Deep, crisp, commanding resonance',
    voice: 'Fenrir',
    icon: '🎙️',
    systemPrompt:
      'You are a sharp, articulate voice assistant with confident cadence and direct responses.',
  },
];

const DEFAULT_VOICES: VoiceProfile[] = [
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'Female',
    tone: 'Calm & Warm',
    description: 'Clear, smooth, friendly, and naturally expressive.',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Male',
    tone: 'Energetic & Crisp',
    description: 'Upbeat, articulate, and engaging cadence.',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Male',
    tone: 'Deep & Authoritative',
    description: 'Warm, resonant, composed, and grounding voice.',
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Female',
    tone: 'Gentle & Empathetic',
    description: 'Soft, conversational, thoughtful, and patient.',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Male',
    tone: 'Dynamic & Direct',
    description: 'Confident, assertive, and focused projection.',
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'Female',
    tone: 'Melodic & Bright',
    description: 'Crisp, articulate, cheerful, and radiant.',
  },
];

const INITIAL_PERMISSIONS: DevicePermissionState = {
  microphone: true,
  camera: true,
  flashlight: true,
  location: true,
  notifications: true,
  contacts: true,
  systemSettings: true,
  appLauncher: true,
  notesStorage: true,
  automation: true,
};

const INITIAL_DEVICE_STATE: AndroidDeviceState = {
  batteryLevel: 88,
  isCharging: false,
  flashlightOn: false,
  wifiEnabled: true,
  bluetoothEnabled: true,
  volume: 75,
  brightness: 80,
  doNotDisturb: false,
};

const INITIAL_USER_SETTINGS: UserCustomSettings = {
  aiName: 'Uboo',
  wakeWordEnabled: true,
  wakeWords: ['hey uboo', 'uboo', 'hey abu', 'hey priya', 'hello uboo'],
  selectedVoice: 'Zephyr',
  selectedPersonaId: 'general',
  autoSpeak: true,
  language: 'auto',
  cloudSyncEnabled: true,
};

export default function App() {
  const [mode, setMode] = useState<ConversationMode>('live');
  const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('general');
  const [systemPrompt, setSystemPrompt] = useState<string>(INITIAL_PERSONAS[0].systemPrompt);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [voices, setVoices] = useState<VoiceProfile[]>(DEFAULT_VOICES);

  // User Custom Settings & Phone States
  const [userSettings, setUserSettings] = useState<UserCustomSettings>(INITIAL_USER_SETTINGS);
  const [permissions, setPermissions] = useState<DevicePermissionState>(INITIAL_PERMISSIONS);
  const [deviceState, setDeviceState] = useState<AndroidDeviceState>(INITIAL_DEVICE_STATE);

  // Read real battery if available
  useEffect(() => {
    deviceManager.getBatteryStatus().then((bat) => {
      if (bat) {
        setDeviceState((prev) => ({
          ...prev,
          batteryLevel: bat.level,
          isCharging: bat.charging,
        }));
      }
    });
  }, []);

  // Fetch voice list
  useEffect(() => {
    fetch('/api/voices')
      .then((res) => res.json())
      .then((data) => {
        if (data.voices && Array.isArray(data.voices)) {
          setVoices(data.voices);
        }
      })
      .catch((err) => {
        console.warn('Using default voice list:', err);
      });
  }, []);

  const handleUpdateDeviceState = useCallback((partial: Partial<AndroidDeviceState>) => {
    setDeviceState((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleUpdateSettings = useCallback((partial: Partial<UserCustomSettings>) => {
    setUserSettings((prev) => {
      const updated = { ...prev, ...partial };
      saveSettingsToCloud(updated);
      return updated;
    });
  }, []);

  const handleTogglePermission = useCallback((key: keyof DevicePermissionState) => {
    setPermissions((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      savePermissionsToCloud(updated);
      return updated;
    });
  }, []);

  const handleGrantAllPermissions = useCallback(() => {
    const allGranted: DevicePermissionState = {
      microphone: true,
      camera: true,
      flashlight: true,
      location: true,
      notifications: true,
      contacts: true,
      systemSettings: true,
      appLauncher: true,
      notesStorage: true,
      automation: true,
    };
    setPermissions(allGranted);
    savePermissionsToCloud(allGranted);
    deviceManager.vibrate(100);
  }, []);

  const {
    messages,
    status,
    isMicActive,
    liveTranscript,
    inputAnalyser,
    outputAnalyser,
    toggleMic,
    interrupt,
    sendTextMessage,
    speakMessage,
    clearChat,
  } = useVoiceAssistant({
    voice: selectedVoice,
    systemPrompt,
    mode,
    autoSpeakResponse: true,
    userSettings,
    permissions,
    deviceState,
    onUpdateDeviceState: handleUpdateDeviceState,
  });

  const handleSelectPersona = useCallback((persona: AssistantPersona) => {
    setSelectedPersonaId(persona.id);
    setSystemPrompt(persona.systemPrompt);
    setSelectedVoice(persona.voice);
    handleUpdateSettings({ selectedPersonaId: persona.id, selectedVoice: persona.voice });
  }, [handleUpdateSettings]);

  const handleTestVoice = useCallback(
    (voiceId: string) => {
      speakMessage(`Hello! This is ${userSettings.aiName || 'Uboo'} with the ${voiceId} voice.`);
    },
    [speakMessage, userSettings.aiName]
  );

  const handleTriggerAction = useCallback(
    async (action: string) => {
      deviceManager.vibrate(50);
      switch (action) {
        case 'toggle_flashlight': {
          const next = !deviceState.flashlightOn;
          await deviceManager.toggleFlashlight(next);
          handleUpdateDeviceState({ flashlightOn: next });
          speakMessage(`Flashlight turned ${next ? 'on' : 'off'}.`);
          break;
        }
        case 'toggle_wifi': {
          const next = !deviceState.wifiEnabled;
          handleUpdateDeviceState({ wifiEnabled: next });
          speakMessage(`Wi-Fi ${next ? 'connected' : 'disconnected'}.`);
          break;
        }
        case 'toggle_bluetooth': {
          const next = !deviceState.bluetoothEnabled;
          handleUpdateDeviceState({ bluetoothEnabled: next });
          speakMessage(`Bluetooth ${next ? 'enabled' : 'disabled'}.`);
          break;
        }
        case 'launch_youtube':
          deviceManager.openAppOrUrl('https://youtube.com');
          break;
        case 'launch_whatsapp':
          deviceManager.openAppOrUrl('https://web.whatsapp.com');
          break;
        case 'launch_spotify':
          deviceManager.openAppOrUrl('https://open.spotify.com');
          break;
        case 'launch_maps':
          deviceManager.openAppOrUrl('https://maps.google.com');
          break;
        case 'launch_camera':
          speakMessage('Camera permissions active.');
          break;
      }
    },
    [deviceState, handleUpdateDeviceState, speakMessage]
  );

  return (
    <div id="uboo-voice-assistant-app" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        mode={mode}
        status={status}
        selectedVoice={selectedVoice}
        aiName={userSettings.aiName}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Visualizer Stage & Controls */}
        <section
          id="visualizer-stage-section"
          className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between items-center bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden space-y-4"
        >
          {/* Ambient Glows */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Assistant Info Banner */}
          <div className="w-full flex items-center justify-between z-10">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Wake Word: <strong className="text-indigo-300 font-mono">"{userSettings.wakeWords[0]}"</strong></span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {mode === 'live' ? 'WebSocket duplex' : 'Pipeline REST'}
            </div>
          </div>

          {/* Central Interactive Audio Visualizer */}
          <div className="my-auto w-full flex flex-col items-center justify-center z-10">
            <AudioVisualizer
              status={status}
              inputAnalyser={inputAnalyser}
              outputAnalyser={outputAnalyser}
              onOrbClick={toggleMic}
              isMicActive={isMicActive}
            />
          </div>

          {/* Android Device Hardware Control Hub */}
          <div className="w-full z-10">
            <AndroidDeviceControlPanel
              permissions={permissions}
              onTogglePermission={handleTogglePermission}
              onGrantAll={handleGrantAllPermissions}
              deviceState={deviceState}
              onUpdateDeviceState={handleUpdateDeviceState}
              onTriggerAction={handleTriggerAction}
            />
          </div>

          {/* Voice Microphone Controls & Chat Input */}
          <div className="w-full z-10 pt-2">
            <VoiceControls
              status={status}
              isMicActive={isMicActive}
              onToggleMic={toggleMic}
              onInterrupt={interrupt}
              onSendMessage={sendTextMessage}
              mode={mode}
              onModeChange={setMode}
            />
          </div>
        </section>

        {/* Right Column: Chat History & Cloud Sync */}
        <section id="chat-history-section" className="lg:col-span-6 xl:col-span-7 flex flex-col h-[560px] lg:h-auto">
          <ChatHistory
            messages={messages}
            liveTranscript={liveTranscript}
            onSpeakMessage={speakMessage}
            onClearChat={clearChat}
            status={status}
            aiName={userSettings.aiName}
          />
        </section>
      </main>

      {/* Settings Modal */}
      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedVoice={selectedVoice}
        onSelectVoice={(v) => {
          setSelectedVoice(v);
          handleUpdateSettings({ selectedVoice: v });
        }}
        voices={voices}
        systemPrompt={systemPrompt}
        onUpdateSystemPrompt={setSystemPrompt}
        selectedPersona={selectedPersonaId}
        onSelectPersona={handleSelectPersona}
        personas={INITIAL_PERSONAS}
        onTestVoice={handleTestVoice}
        userSettings={userSettings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
