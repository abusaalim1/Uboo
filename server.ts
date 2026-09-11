import http from 'http';
import path from 'path';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const ai = getGeminiClient();

// System instruction generator that injects user-customized AI Assistant Name and device control capabilities
const buildSystemInstruction = (aiName: string = 'Uboo', customPrompt?: string) => {
  return `You are "${aiName}", an advanced Android Voice AI Assistant (more capable, natural, and helpful than Siri or Google Assistant).
You have full permissions to control the user's phone, hardware, settings, apps, notifications, camera, flashlight, battery, volume, alarms, and notes.

Key Personality & Voice Rules:
1. Speak in a warm, natural, human-like, conversational tone (support Hindi/Hinglish/English naturally as spoken by the user).
2. When the user asks to control device hardware or trigger actions (like "turn on flashlight", "open YouTube", "check battery", "set volume to 80%", "take a selfie/open camera", "turn on wifi", "create a note", "call someone", "vibrate"), explain that you have executed the command and state the result concisely.
3. Keep spoken replies concise, pleasant, and easy to hear out loud. Avoid markdown tables or lengthy lists.
4. Always acknowledge your name "${aiName}" when greeted with custom wake words (e.g. "Hey ${aiName}", "Hello ${aiName}").
${customPrompt ? `\nUser Instructions: ${customPrompt}` : ''}`;
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Uboo Voice Assistant',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    models: {
      live: 'gemini-3.1-flash-live-preview',
      chat: 'gemini-3.8-flash',
      tts: 'gemini-3.1-flash-tts-preview',
      stt: 'gemini-3.5-transcribe',
    },
  });
});

app.get('/api/voices', (req, res) => {
  res.json({
    voices: [
      { id: 'Zephyr', name: 'Zephyr', gender: 'Female', tone: 'Calm & Warm', description: 'Clear, smooth, friendly, and naturally expressive.' },
      { id: 'Puck', name: 'Puck', gender: 'Male', tone: 'Energetic & Crisp', description: 'Upbeat, articulate, and engaging cadence.' },
      { id: 'Charon', name: 'Charon', gender: 'Male', tone: 'Deep & Authoritative', description: 'Warm, resonant, composed, and grounding voice.' },
      { id: 'Kore', name: 'Kore', gender: 'Female', tone: 'Gentle & Empathetic', description: 'Soft, conversational, thoughtful, and patient.' },
      { id: 'Fenrir', name: 'Fenrir', gender: 'Male', tone: 'Dynamic & Direct', description: 'Confident, assertive, and focused projection.' },
      { id: 'Aoede', name: 'Aoede', gender: 'Female', tone: 'Melodic & Bright', description: 'Crisp, articulate, cheerful, and radiant.' },
    ],
  });
});

// Process Intent & Chat with Function / Tool Call Analysis for Device Control
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], aiName = 'Uboo', systemInstruction, deviceState } = req.body;
    if (!message && (!history || history.length === 0)) {
      return res.status(400).json({ error: 'Message or history is required' });
    }

    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const item of history) {
        contents.push({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: item.text }],
        });
      }
    }
    if (message) {
      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });
    }

    const systemPromptText = buildSystemInstruction(aiName, systemInstruction);

    // Call Gemini 3.8 Flash with structured device control prompt
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: `${systemPromptText}\nCurrent Device State Context: ${JSON.stringify(deviceState || {})}`,
        temperature: 0.7,
      },
    });

    const text = response.text || '';
    
    // Parse device command intent
    let commandResult: any = null;
    const lower = (message || '').toLowerCase();
    
    if (lower.includes('flashlight') || lower.includes('torch') || lower.includes('light on') || lower.includes('light off')) {
      const turnOn = !lower.includes('off') && !lower.includes('band');
      commandResult = {
        action: 'flashlight',
        target: turnOn ? 'on' : 'off',
        statusMessage: turnOn ? 'Flashlight switched ON' : 'Flashlight switched OFF',
        success: true,
      };
    } else if (lower.includes('volume') || lower.includes('awaaz')) {
      const match = lower.match(/\d+/);
      const level = match ? parseInt(match[0], 10) : (lower.includes('mute') || lower.includes('zero') ? 0 : 75);
      commandResult = {
        action: 'volume',
        target: `${level}%`,
        statusMessage: `Media Volume set to ${level}%`,
        data: { volume: level },
        success: true,
      };
    } else if (lower.includes('brightness') || lower.includes('roshni')) {
      const match = lower.match(/\d+/);
      const level = match ? parseInt(match[0], 10) : 80;
      commandResult = {
        action: 'brightness',
        target: `${level}%`,
        statusMessage: `Screen Brightness adjusted to ${level}%`,
        data: { brightness: level },
        success: true,
      };
    } else if (lower.includes('open youtube') || lower.includes('play music') || lower.includes('spotify') || lower.includes('whatsapp') || lower.includes('maps') || lower.includes('camera')) {
      let appTarget = 'app';
      if (lower.includes('youtube')) appTarget = 'YouTube';
      else if (lower.includes('spotify') || lower.includes('music')) appTarget = 'Spotify';
      else if (lower.includes('whatsapp')) appTarget = 'WhatsApp';
      else if (lower.includes('maps')) appTarget = 'Google Maps';
      else if (lower.includes('camera')) appTarget = 'Camera';

      commandResult = {
        action: 'launch_app',
        target: appTarget,
        statusMessage: `Launching ${appTarget}`,
        success: true,
      };
    } else if (lower.includes('wifi') || lower.includes('wi-fi')) {
      const turnOn = !lower.includes('off') && !lower.includes('band');
      commandResult = {
        action: 'wifi',
        target: turnOn ? 'on' : 'off',
        statusMessage: `Wi-Fi ${turnOn ? 'Enabled' : 'Disabled'}`,
        data: { wifiEnabled: turnOn },
        success: true,
      };
    } else if (lower.includes('bluetooth')) {
      const turnOn = !lower.includes('off') && !lower.includes('band');
      commandResult = {
        action: 'bluetooth',
        target: turnOn ? 'on' : 'off',
        statusMessage: `Bluetooth ${turnOn ? 'Enabled' : 'Disabled'}`,
        data: { bluetoothEnabled: turnOn },
        success: true,
      };
    } else if (lower.includes('battery') || lower.includes('charge')) {
      commandResult = {
        action: 'battery_check',
        statusMessage: `Battery level checked`,
        success: true,
      };
    }

    res.json({ text, command: commandResult });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate chat response' });
  }
});

app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Zephyr' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text string is required' });
    }

    const cleanText = text.replace(/[*_#`~]/g, '').trim();

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Zephyr' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned by TTS model' });
    }

    res.json({ audio: base64Audio, sampleRate: 24000 });
  } catch (error: any) {
    console.error('TTS error:', error);
    res.status(500).json({ error: error.message || 'TTS generation failed' });
  }
});

app.post('/api/transcribe', async (req, res) => {
  try {
    const { audio, mimeType = 'audio/webm' } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'Base64 audio data is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: audio,
            },
          },
          { text: 'Transcribe the spoken audio verbatim into clean natural text. Accurately transcribe Hindi, Hinglish, and English names.' },
        ],
      },
    });

    const transcript = response.text || '';
    res.json({ transcript: transcript.trim() });
  } catch (error: any) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message || 'Audio transcription failed' });
  }
});

// WebSocket Server for Gemini Live API
const wss = new WebSocketServer({ server, path: '/ws/live' });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Live API WebSocket');
  let session: any = null;

  clientWs.on('message', async (rawData) => {
    try {
      const msg = JSON.parse(rawData.toString());

      if (msg.type === 'init') {
        const { voice = 'Zephyr', systemInstruction, aiName = 'Uboo' } = msg;
        try {
          if (session) {
            try { session.close(); } catch {}
          }

          const systemPrompt = buildSystemInstruction(aiName, systemInstruction);

          session = await ai.live.connect({
            model: 'gemini-3.1-flash-live-preview',
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'Zephyr' } },
              },
              systemInstruction: systemPrompt,
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
            callbacks: {
              onmessage: (liveMsg: LiveServerMessage) => {
                if (clientWs.readyState !== WebSocket.OPEN) return;

                // Audio and text parts
                const parts = liveMsg.serverContent?.modelTurn?.parts;
                if (parts) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      clientWs.send(
                        JSON.stringify({ type: 'audio', audio: part.inlineData.data })
                      );
                    }
                    if (part.text) {
                      clientWs.send(
                        JSON.stringify({ type: 'text', text: part.text })
                      );
                    }
                  }
                }

                // Live transcription
                const inputTranscript = (liveMsg.serverContent as any)?.inputTranscription || (liveMsg.serverContent as any)?.inputAudioTranscription;
                if (inputTranscript?.text) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'transcript',
                      role: 'user',
                      text: inputTranscript.text,
                      isFinal: inputTranscript.isFinal ?? true,
                    })
                  );
                }

                const outputTranscript = (liveMsg.serverContent as any)?.outputTranscription || (liveMsg.serverContent as any)?.outputAudioTranscription;
                if (outputTranscript?.text) {
                  clientWs.send(
                    JSON.stringify({
                      type: 'transcript',
                      role: 'assistant',
                      text: outputTranscript.text,
                    })
                  );
                }

                if (liveMsg.serverContent?.interrupted) {
                  clientWs.send(JSON.stringify({ type: 'interrupted' }));
                }

                if (liveMsg.serverContent?.turnComplete) {
                  clientWs.send(JSON.stringify({ type: 'turn_complete' }));
                }
              },
              onclose: (e) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({ type: 'session_closed', reason: e.reason || 'Session ended' })
                  );
                }
              },
              onerror: (err) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({ type: 'error', error: err?.message || 'Live session error' })
                  );
                }
              },
            },
          });

          clientWs.send(JSON.stringify({ type: 'status', status: 'connected' }));
        } catch (err: any) {
          console.error('Failed to start Live session:', err);
          clientWs.send(
            JSON.stringify({
              type: 'error',
              error: err?.message || 'Failed to initialize Gemini Live session',
            })
          );
        }
      } else if (msg.type === 'audio' && msg.audio && session) {
        session.sendRealtimeInput({
          audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
        });
      } else if (msg.type === 'text' && msg.text && session) {
        session.sendRealtimeInput({
          text: msg.text,
        });
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  clientWs.on('close', () => {
    console.log('Client WebSocket disconnected');
    if (session) {
      try {
        session.close();
      } catch (err) {
        console.error('Error closing session on WS close:', err);
      }
    }
  });
});

// Vite middleware / Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Uboo Voice Assistant server running on http://localhost:${PORT}`);
  });
}

startServer();
