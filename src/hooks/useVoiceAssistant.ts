import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatMessage,
  AssistantStatus,
  ConversationMode,
  VoiceProfile,
  UserCustomSettings,
  DevicePermissionState,
  AndroidDeviceState,
  DeviceCommandResult,
} from '../types';
import { GaplessAudioPlayer, convertFloat32To16kPCMBase64 } from '../utils/audio';
import { deviceManager } from '../utils/deviceManager';
import {
  saveMessageToCloud,
  loadMessagesFromCloud,
  clearMessagesInCloud,
} from '../services/cloudStorage';

export interface UseVoiceAssistantOptions {
  voice: string;
  systemPrompt: string;
  mode: ConversationMode;
  autoSpeakResponse?: boolean;
  userSettings: UserCustomSettings;
  permissions: DevicePermissionState;
  deviceState: AndroidDeviceState;
  onUpdateDeviceState: (partial: Partial<AndroidDeviceState>) => void;
}

export function useVoiceAssistant({
  voice,
  systemPrompt,
  mode,
  autoSpeakResponse = true,
  userSettings,
  permissions,
  deviceState,
  onUpdateDeviceState,
}: UseVoiceAssistantOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<AssistantStatus>('idle');
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<{ user: string; assistant: string }>({
    user: '',
    assistant: '',
  });

  // Audio refs
  const audioPlayerRef = useRef<GaplessAudioPlayer | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);

  // Sync state tracking refs
  const isMicActiveRef = useRef<boolean>(false);
  const statusRef = useRef<AssistantStatus>('idle');
  const modeRef = useRef<ConversationMode>(mode);
  const userSettingsRef = useRef<UserCustomSettings>(userSettings);
  const permissionsRef = useRef<DevicePermissionState>(permissions);
  const deviceStateRef = useRef<AndroidDeviceState>(deviceState);
  const currentAssistantMsgIdRef = useRef<string | null>(null);
  const currentAssistantTextRef = useRef<string>('');

  modeRef.current = mode;
  isMicActiveRef.current = isMicActive;
  statusRef.current = status;
  userSettingsRef.current = userSettings;
  permissionsRef.current = permissions;
  deviceStateRef.current = deviceState;

  // Load cloud conversations on initial boot
  useEffect(() => {
    loadMessagesFromCloud().then((cloudMsgs) => {
      if (cloudMsgs && cloudMsgs.length > 0) {
        setMessages(cloudMsgs);
      } else {
        const welcomeMsg: ChatMessage = {
          id: 'welcome-init',
          role: 'assistant',
          text: `Namaste! I am ${userSettings.aiName || 'Uboo'}, your Android AI Voice Assistant. I have full permission to control your phone settings, flashlight, volume, and open apps. You can wake me by saying "${userSettings.wakeWords[0] || 'Hey Uboo'}".`,
          timestamp: Date.now(),
          modelUsed: 'gemini-3.8-flash',
        };
        setMessages([welcomeMsg]);
        saveMessageToCloud(welcomeMsg);
      }
    });
  }, [userSettings.aiName]);

  // Initialize Audio Player
  useEffect(() => {
    const player = new GaplessAudioPlayer((isPlaying) => {
      if (isPlaying) {
        setStatus('speaking');
      } else if (statusRef.current === 'speaking') {
        setStatus(isMicActiveRef.current ? 'listening' : 'idle');
      }
    });
    audioPlayerRef.current = player;
    player.init();

    return () => {
      player.close();
      audioPlayerRef.current = null;
    };
  }, []);

  // Stop output audio and interrupt assistant speech
  const interrupt = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stopAll();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    setStatus(isMicActiveRef.current ? 'listening' : 'idle');
  }, []);

  // Execute Phone / Android Device hardware actions
  const executeDeviceCommand = useCallback(
    async (command: DeviceCommandResult) => {
      deviceManager.vibrate(80);
      switch (command.action) {
        case 'flashlight': {
          const enable = command.target === 'on';
          await deviceManager.toggleFlashlight(enable);
          onUpdateDeviceState({ flashlightOn: enable });
          break;
        }
        case 'volume': {
          const vol = command.data?.volume ?? 70;
          onUpdateDeviceState({ volume: vol });
          break;
        }
        case 'brightness': {
          const br = command.data?.brightness ?? 80;
          onUpdateDeviceState({ brightness: br });
          break;
        }
        case 'wifi': {
          const enable = command.data?.wifiEnabled ?? true;
          onUpdateDeviceState({ wifiEnabled: enable });
          break;
        }
        case 'bluetooth': {
          const enable = command.data?.bluetoothEnabled ?? true;
          onUpdateDeviceState({ bluetoothEnabled: enable });
          break;
        }
        case 'launch_app': {
          const target = command.target || '';
          deviceManager.openAppOrUrl(target);
          break;
        }
        case 'battery_check': {
          const bat = await deviceManager.getBatteryStatus();
          if (bat) {
            onUpdateDeviceState({ batteryLevel: bat.level, isCharging: bat.charging });
          }
          break;
        }
      }
    },
    [onUpdateDeviceState]
  );

  // Send message in Pipeline Mode (Text/STT -> Gemini 3.8-Flash with Device Tools -> Gemini TTS)
  const handlePipelineSend = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      interrupt();
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      saveMessageToCloud(userMsg);
      setStatus('thinking');
      setLiveTranscript({ user: '', assistant: '' });

      try {
        const historyForApi = messages.slice(-8).map((m) => ({
          role: m.role,
          text: m.text,
        }));

        const chatRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            history: historyForApi,
            aiName: userSettingsRef.current.aiName || 'Uboo',
            systemInstruction: systemPrompt,
            deviceState: deviceStateRef.current,
          }),
        });

        if (!chatRes.ok) {
          throw new Error(`Chat API error: ${chatRes.statusText}`);
        }

        const chatData = await chatRes.json();
        const replyText = chatData.text || 'Command processed.';
        const command = chatData.command;

        if (command) {
          await executeDeviceCommand(command);
        }

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          timestamp: Date.now(),
          modelUsed: 'gemini-3.8-flash',
          commandExecuted: command || undefined,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        saveMessageToCloud(assistantMsg);

        if (autoSpeakResponse) {
          setStatus('speaking');
          try {
            const ttsRes = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: replyText,
                voice,
              }),
            });

            if (ttsRes.ok) {
              const ttsData = await ttsRes.json();
              if (ttsData.audio && audioPlayerRef.current) {
                await audioPlayerRef.current.playChunk(ttsData.audio);
              }
            } else if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(replyText);
              utterance.onend = () => {
                setStatus(isMicActiveRef.current ? 'listening' : 'idle');
              };
              window.speechSynthesis.speak(utterance);
            }
          } catch (ttsErr) {
            console.error('TTS error:', ttsErr);
          }
        } else {
          setStatus(isMicActiveRef.current ? 'listening' : 'idle');
        }
      } catch (err: any) {
        console.error('Pipeline conversation error:', err);
        setStatus('error');
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'system',
            text: `Error: ${err.message || 'Unable to connect to Gemini API.'}`,
            timestamp: Date.now(),
          },
        ]);
      }
    },
    [messages, systemPrompt, voice, autoSpeakResponse, interrupt, executeDeviceCommand]
  );

  // Initialize Web Speech Recognition with Wake Word Detection
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          const currentText = finalTranscript || interimTranscript;
          if (currentText.trim()) {
            setLiveTranscript((prev) => ({ ...prev, user: currentText }));
          }

          const lower = currentText.toLowerCase().trim();

          // Check wake word triggers
          const wakeWords = userSettingsRef.current.wakeWords;
          const triggeredWakeWord = wakeWords.some((w) => lower.includes(w.toLowerCase()));

          if (triggeredWakeWord) {
            deviceManager.vibrate([60, 40, 60]);
          }

          if (finalTranscript.trim()) {
            let processed = finalTranscript.trim();
            // Strip wake word prefix if spoken before command
            for (const w of wakeWords) {
              if (processed.toLowerCase().startsWith(w)) {
                processed = processed.slice(w.length).trim();
              }
            }
            if (processed) {
              handlePipelineSend(processed);
            }
            setLiveTranscript((prev) => ({ ...prev, user: '' }));
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition warning:', event.error);
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('Speech recognition init failed', e);
      }
    }
  }, [handlePipelineSend]);

  // Connect WebSocket for Live API Mode
  const connectLiveWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/live`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Live WebSocket connected');
      ws.send(
        JSON.stringify({
          type: 'init',
          voice,
          systemInstruction: systemPrompt,
          aiName: userSettingsRef.current.aiName || 'Uboo',
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'status' && data.status === 'connected') {
          setStatus(isMicActiveRef.current ? 'listening' : 'idle');
        } else if (data.type === 'audio' && data.audio) {
          setStatus('speaking');
          if (audioPlayerRef.current) {
            audioPlayerRef.current.playChunk(data.audio);
          }
        } else if (data.type === 'text') {
          currentAssistantTextRef.current += data.text;
          setLiveTranscript((prev) => ({
            ...prev,
            assistant: currentAssistantTextRef.current,
          }));

          if (!currentAssistantMsgIdRef.current) {
            const newId = `live-assistant-${Date.now()}`;
            currentAssistantMsgIdRef.current = newId;
            setMessages((prev) => [
              ...prev,
              {
                id: newId,
                role: 'assistant',
                text: currentAssistantTextRef.current,
                timestamp: Date.now(),
                modelUsed: 'gemini-3.1-flash-live-preview',
                isStreaming: true,
              },
            ]);
          } else {
            const targetId = currentAssistantMsgIdRef.current;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === targetId ? { ...m, text: currentAssistantTextRef.current } : m
              )
            );
          }
        } else if (data.type === 'transcript') {
          if (data.role === 'user') {
            setLiveTranscript((prev) => ({ ...prev, user: data.text }));
            if (data.isFinal) {
              const uMsg: ChatMessage = {
                id: `live-user-${Date.now()}`,
                role: 'user',
                text: data.text,
                timestamp: Date.now(),
              };
              setMessages((prev) => [...prev, uMsg]);
              saveMessageToCloud(uMsg);
              setLiveTranscript((prev) => ({ ...prev, user: '' }));
              setStatus('thinking');
            }
          } else if (data.role === 'assistant') {
            currentAssistantTextRef.current = data.text;
            setLiveTranscript((prev) => ({ ...prev, assistant: data.text }));
          }
        } else if (data.type === 'interrupted') {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.stopAll();
          }
          currentAssistantMsgIdRef.current = null;
          currentAssistantTextRef.current = '';
          setStatus(isMicActiveRef.current ? 'listening' : 'idle');
        } else if (data.type === 'turn_complete') {
          if (currentAssistantMsgIdRef.current) {
            const targetId = currentAssistantMsgIdRef.current;
            const fullText = currentAssistantTextRef.current;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === targetId ? { ...m, isStreaming: false } : m
              )
            );
            saveMessageToCloud({
              id: targetId,
              role: 'assistant',
              text: fullText,
              timestamp: Date.now(),
              modelUsed: 'gemini-3.1-flash-live-preview',
            });
          }
          currentAssistantMsgIdRef.current = null;
          currentAssistantTextRef.current = '';
          setLiveTranscript((prev) => ({ ...prev, assistant: '' }));
          if (!audioPlayerRef.current?.isPlaying()) {
            setStatus(isMicActiveRef.current ? 'listening' : 'idle');
          }
        }
      } catch (err) {
        console.error('Error handling WS event:', err);
      }
    };

    wsRef.current = ws;
    return ws;
  }, [voice, systemPrompt]);

  // Start microphone streaming
  const startListening = useCallback(async () => {
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.init();
      }

      deviceManager.vibrate(50);
      setStatus('connecting');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass();
      inputAudioCtxRef.current = inputCtx;

      const source = inputCtx.createMediaStreamSource(stream);

      if (modeRef.current === 'live') {
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(inputCtx.destination);
        scriptProcessorRef.current = processor;

        const ws = connectLiveWebSocket();

        processor.onaudioprocess = (e) => {
          if (!isMicActiveRef.current) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const base64Pcm = convertFloat32To16kPCMBase64(inputData, inputCtx.sampleRate);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'audio', audio: base64Pcm }));
          }
        };
      } else {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
      }

      setIsMicActive(true);
      setStatus('listening');
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setStatus('error');
    }
  }, [connectLiveWebSocket]);

  // Stop microphone
  const stopListening = useCallback(() => {
    setIsMicActive(false);

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    setStatus(audioPlayerRef.current?.isPlaying() ? 'speaking' : 'idle');
  }, []);

  const toggleMic = useCallback(() => {
    if (isMicActive) {
      stopListening();
    } else {
      startListening();
    }
  }, [isMicActive, startListening, stopListening]);

  const sendTextMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      if (modeRef.current === 'live') {
        const ws = connectLiveWebSocket();
        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          text: text.trim(),
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
        saveMessageToCloud(userMsg);
        setStatus('thinking');

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'text', text: text.trim() }));
        }
      } else {
        handlePipelineSend(text);
      }
    },
    [connectLiveWebSocket, handlePipelineSend]
  );

  const speakMessage = useCallback(
    async (text: string) => {
      if (!text || !audioPlayerRef.current) return;
      interrupt();
      setStatus('speaking');
      try {
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice }),
        });
        if (ttsRes.ok) {
          const ttsData = await ttsRes.json();
          if (ttsData.audio) {
            await audioPlayerRef.current.playChunk(ttsData.audio);
          }
        }
      } catch (err) {
        console.error('Error in speakMessage:', err);
        setStatus('idle');
      }
    },
    [voice, interrupt]
  );

  const clearChat = useCallback(async () => {
    interrupt();
    await clearMessagesInCloud();
    const newMsg: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      text: `Chat history cleared and updated in Cloud. I'm ready, what would you like to do?`,
      timestamp: Date.now(),
      modelUsed: mode === 'live' ? 'gemini-3.1-flash-live-preview' : 'gemini-3.8-flash',
    };
    setMessages([newMsg]);
    saveMessageToCloud(newMsg);
    setLiveTranscript({ user: '', assistant: '' });
  }, [interrupt, mode]);

  return {
    messages,
    status,
    isMicActive,
    liveTranscript,
    inputAnalyser: null,
    outputAnalyser: audioPlayerRef.current?.getAnalyser() || null,
    startListening,
    stopListening,
    toggleMic,
    interrupt,
    sendTextMessage,
    speakMessage,
    clearChat,
  };
}
