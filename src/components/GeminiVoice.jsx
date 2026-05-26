'use client';

import { useEffect, useRef, useState } from 'react';

export default function GeminiVoice({ systemPrompt, onText, apiKey, model }) {
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);

  const GEMINI_MODEL = model || 'gemini-3.5-flash';
  const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

  const stop = () => {
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current?.close();
    audioCtxRef.current?.close();
    processorRef.current = null;
    streamRef.current = null;
    wsRef.current = null;
    audioCtxRef.current = null;
    setStatus('idle');
  };

  const start = async () => {
    if (!apiKey) {
      setErrorMsg('Kein API Key eingegeben.');
      setStatus('error');
      return;
    }
    setErrorMsg('');

    try {
      setStatus('connecting');

      // Mikrofon-Zugriff anfragen
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        throw new Error(`Mikrofon-Zugriff verweigert: ${err.message}`);
      }
      streamRef.current = stream;

      // AudioContext mit explizitem resume() (Browser-Autoplay-Policy)
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      await audioCtx.resume();
      audioCtxRef.current = audioCtx;

      // WebSocket zu Gemini Live API
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
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
        try {
          const text = event.data instanceof Blob ? await event.data.text() : event.data;
          data = JSON.parse(text);
        } catch {
          return;
        }

        if (data.setupComplete) {
          setStatus('active');
          startMicStream(audioCtx, ws);
        }

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

        // API-Fehler sichtbar machen
        if (data.error) {
          setErrorMsg(`API-Fehler: ${data.error.message || JSON.stringify(data.error)}`);
          setStatus('error');
          stop();
        }
      };

      ws.onerror = (e) => {
        setErrorMsg('WebSocket-Verbindung fehlgeschlagen. API Key prüfen.');
        setStatus('error');
      };

      ws.onclose = (e) => {
        if (status !== 'idle') {
          if (e.code !== 1000) setErrorMsg(`Verbindung getrennt (Code ${e.code})`);
          setStatus('idle');
        }
      };

    } catch (err) {
      console.error('GeminiVoice:', err);
      setErrorMsg(err.message || 'Unbekannter Fehler');
      setStatus('error');
      stop();
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
          mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: base64 }],
        },
      }));
    };

    // GainNode auf 0 verhindert Mikrofon-Feedback über Lautsprecher,
    // aber ScriptProcessor feuert trotzdem (braucht eine Verbindung zu destination)
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0;
    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioCtx.destination);
  };

  const playAudioChunk = (audioCtx, base64Data) => {
    try {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;
      const buffer = audioCtx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(audioCtx.destination);
      src.start();
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

  useEffect(() => () => stop(), []);

  const STATUS_LABELS = {
    idle: 'Live Voice-Dialog starten',
    connecting: 'Verbinde...',
    active: 'Aktiv — jetzt sprechen',
    speaking: 'Persona spricht...',
    error: 'Fehler — neu versuchen',
  };

  const STATUS_COLORS = {
    idle: 'bg-purple-600 hover:bg-purple-700 text-white',
    connecting: 'bg-gray-300 text-gray-600 cursor-wait',
    active: 'bg-green-500 text-white ring-4 ring-green-200 animate-pulse',
    speaking: 'bg-indigo-500 text-white',
    error: 'bg-red-500 hover:bg-red-600 text-white',
  };

  const handleClick = () => {
    if (status === 'idle' || status === 'error') start();
    else if (status === 'active' || status === 'speaking') stop();
  };

  return (
    <div className="flex flex-col gap-2">
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
      {errorMsg && (
        <p className="text-xs text-red-600 px-1">{errorMsg}</p>
      )}
    </div>
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
