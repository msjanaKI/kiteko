'use client';

import { useEffect, useRef, useState } from 'react';

export default function VoiceButton({ onTranscript, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
  }, []);

  const startRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setError('');
    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };

    recognition.onend = () => setIsRecording(false);

    recognition.onerror = (e) => {
      setIsRecording(false);
      if (e.error === 'not-allowed') {
        setError('Mikrofon-Zugriff verweigert — Einstellungen prüfen.');
      } else if (e.error === 'no-speech') {
        setError('Keine Sprache erkannt — nochmal versuchen.');
      } else {
        setError(`Fehler: ${e.error}`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  if (!supported) return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all select-none ${
          isRecording
            ? 'bg-red-500 text-white ring-4 ring-red-200 animate-pulse'
            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <span>{isRecording ? '🔴' : '🎙️'}</span>
        <span>{isRecording ? 'Sprechen...' : 'Halten zum Sprechen'}</span>
      </button>
      {error && <p className="text-xs text-red-600 px-1">{error}</p>}
    </div>
  );
}
