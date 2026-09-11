export type Role = 'user' | 'assistant' | 'system';

export interface DeviceCommandResult {
  action: string;
  target?: string;
  details?: string;
  success: boolean;
  statusMessage: string;
  data?: any;
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  audioBase64?: string;
  durationSec?: number;
  isStreaming?: boolean;
  modelUsed?: string;
  commandExecuted?: DeviceCommandResult;
}

export type AssistantStatus = 
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'executing'
  | 'interrupted'
  | 'error';

export type ConversationMode = 'live' | 'pipeline';

export interface VoiceProfile {
  id: string;
  name: string;
  gender: 'Female' | 'Male' | 'Neutral';
  tone: string;
  description: string;
}

export interface AssistantPersona {
  id: string;
  name: string;
  title: string;
  systemPrompt: string;
  voice: string;
  icon: string;
}

export interface DevicePermissionState {
  microphone: boolean;
  camera: boolean;
  flashlight: boolean;
  location: boolean;
  notifications: boolean;
  contacts: boolean;
  systemSettings: boolean; // Volume, brightness, wifi, bluetooth
  appLauncher: boolean;
  notesStorage: boolean;
  automation: boolean;
}

export interface AndroidDeviceState {
  batteryLevel: number;
  isCharging: boolean;
  flashlightOn: boolean;
  wifiEnabled: boolean;
  bluetoothEnabled: boolean;
  volume: number; // 0-100
  brightness: number; // 0-100
  doNotDisturb: boolean;
  currentApp?: string;
  locationAddress?: string;
}

export interface UserCustomSettings {
  aiName: string; // e.g. "Uboo", "Abu", "Priya", "Jarvis"
  wakeWordEnabled: boolean;
  wakeWords: string[]; // ["hey uboo", "hey abu", "hey priya", "uboo"]
  selectedVoice: string;
  selectedPersonaId: string;
  autoSpeak: boolean;
  language: 'hinglish' | 'hindi' | 'english' | 'auto';
  cloudSyncEnabled: boolean;
}

export interface LiveWebSocketMessage {
  type: 'audio' | 'text' | 'transcript' | 'interrupted' | 'turn_complete' | 'status' | 'error' | 'session_closed';
  audio?: string;
  text?: string;
  role?: 'user' | 'assistant';
  isFinal?: boolean;
  status?: string;
  error?: string;
  reason?: string;
}
