'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Gemini Live API – bidirektionales Audio.
 * Nutzt direkte Browser-WebSocket-Verbindung zur Gemini Live API.
 * API Key kommt via props (aus localStorage oder env-exposed route).
 */
export default function GeminiVoice({ systemPrompt, onText, apiKey, model }) {
  const [status, setStatus] = useState('idle'); // idle | connecting | active | speaking | error
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);

  const GEMINI_MODEL = model || process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash';
  const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

  const stop = () => {
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current?.close();
    audioCtxRef.current?.close();
    setStatus('idle');
  };

  const start = async () => {
    if (!apiKey) {
      setStatus('error');
      return;
    }

    try {
      setStatus('connecting');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        // Initial setup message
        ws.send(JSON.stringify({
          setup: {
            model: `models/${GEMINI_MODEL}`,
            generation_config: {
              response_modalities: ['AUDIO'],
              speech_config: {
                voice_config: { prebuilt_voice_config: { voice_name: 'Aoede' } },
              },
            },
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
          },
        }));
      };

      ws.onmessage = async (event) => {
        let data;
        if (event.data instanceof Blob) {
          data = JSON.parse(await event.data.text());
        } else {
          data = JSON.parse(event.data);
        }

        // Setup confirmed
        if (data.setupComplete) {
          setStatus('active');
          startMicStream(audioCtx, ws);
        }

        // Audio response from Gemini (persona speaking)
        if (data.serverContent?.modelTurn?.parts) {
          for (const part of data.serverContent.modelTurn.parts) {
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              playAudioChunk(audioCtx, part.inlineData.data);
              setStatus('speaking');
            }
            if (part.text && onText) {
              onText(part.text);
            }
          }
        }

        if (data.serverContent?.turnComplete) {
          setStatus('active');
        }
      };

      ws.onerror = () => setStatus('error');
      ws.onclose = () => setStatus('idle');
    } catch (err) {
      console.error('GeminiVoice error:', err);
      setStatus('error');
    }
  };

  const startMicStream = (audioCtx, ws) => {
    const source = audioCtx.createMediaStreamSource(streamRef.current);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const float32 = e.inputBuffer.getChannelData(0);
      const pcm16 = float32ToPcm16(float32);
      const base64 = arrayBufferToBase64(pcm16.buffer);

      ws.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: 'audio/pcm;rate=16000',
            data: base64,
          }],
        },
      }));
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
  };

  const playAudioChunk = (audioCtx, base64Data) => {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;

    const buffer = audioCtx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
  };

  useEffect(() => () => stop(), []);

  const STATUS_LABELS = {
    idle: 'Voice-Modus starten',
    connecting: 'Verbinde...',
    active: 'Aktiv — sprechen',
    speaking: 'Persona spricht...',
    error: 'Fehler — neu versuchen',
  };

  const STATUS_COLORS = {
    idle: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    connecting: 'bg-gray-300 text-gray-600 cursor-wait',
    active: 'bg-green-500 hover:bg-red-500 text-white ring-4 ring-green-200',
    speaking: 'bg-indigo-400 text-white cursor-default',
    error: 'bg-red-500 hover:bg-red-600 text-white',
  };

  const handleClick = () => {
    if (status === 'idle' || status === 'error') start();
    else if (status === 'active' || status === 'speaking') stop();
  };

  return (
    <button
      onClick={handleClick}
      disabled={status === 'connecting'}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all select-none ${STATUS_COLORS[status]}`}
    >
      <span>
        {status === 'active' ? '🟢' :
         status === 'speaking' ? '🔊' :
         status === 'connecting' ? '⏳' :
         status === 'error' ? '⚠️' : '🎙️'}
      </span>
      <span>{STATUS_LABELS[status]}</span>
    </button>
  );
}

function float32ToPcm16(float32) {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = clamped * 32767;
  }
  return pcm16;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
