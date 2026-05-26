'use client';

import { useState, useEffect, useRef } from 'react';
import ModuleCard from '@/components/ModuleCard';
import ChatView from '@/components/ChatView';
import PersonaCard from '@/components/PersonaCard';
import VoiceButton from '@/components/VoiceButton';
import GeminiVoice from '@/components/GeminiVoice';

const MODULES = [
  {
    id: 'routing',
    icon: '🧭',
    title: 'Freie Eingabe',
    description: 'Beschreibe deine Situation — die KI erkennt automatisch welcher Pfad passt.',
  },
  {
    id: 'auftragsklarung',
    icon: '🎯',
    title: 'Auftragsklärung',
    description: 'Strukturierte Klärung mit SCS-Analyse und Coverdale-Zielscheibe.',
  },
  {
    id: 'persona',
    icon: '🎭',
    title: 'Persona-Simulation',
    description: 'Gespräch mit einem Stakeholder-Archetyp — CEO, CFO, HR und mehr.',
  },
];

const PERSONAS = [
  { id: '01', name: 'CEO / Geschäftsführer', icon: '👔' },
  { id: '02', name: 'CFO / Finanzvorstand', icon: '📊' },
  { id: '03', name: 'HR-Leitung', icon: '👥' },
  { id: '04', name: 'Legal / Datenschutz', icon: '⚖️' },
  { id: '05', name: 'Produktmanagement', icon: '🗂️' },
  { id: '06', name: 'IT-Leitung', icon: '💻' },
  { id: '07', name: 'Vertrieb / Sales', icon: '📈' },
  { id: '08', name: 'Controlling', icon: '🔢' },
  { id: '09', name: 'Investor', icon: '💼' },
  { id: '10', name: 'Advisory Board', icon: '🧠' },
  { id: '11', name: 'Betriebsrat', icon: '🤝' },
  { id: '12', name: 'Service / Sachbearbeitung', icon: '📋' },
];

export default function Home() {
  const [mode, setMode] = useState('routing');
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [showVoiceLive, setShowVoiceLive] = useState(false);
  const [systemPromptForVoice, setSystemPromptForVoice] = useState('');
  const inputRef = useRef(null);

  // Load stored API key
  useEffect(() => {
    const stored = localStorage.getItem('KITEKO_GEMINI_KEY');
    if (stored) setGeminiKey(stored);
  }, []);

  const saveKey = (key) => {
    setGeminiKey(key);
    localStorage.setItem('KITEKO_GEMINI_KEY', key);
  };

  const resetChat = () => {
    setMessages([]);
    setSelectedPersona(null);
    setShowVoiceLive(false);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    resetChat();
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const body = {
        messages: newMessages,
        mode: selectedPersona ? 'persona' : mode,
        personaId: selectedPersona?.id || null,
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: 'assistant', content: data.text }]);

      // Auto-routing: if Gemini detected a persona
      if (data.route === 'persona_simulation' && data.personaId && !selectedPersona) {
        const persona = PERSONAS.find((p) => p.id === data.personaId);
        if (persona) setSelectedPersona(persona);
      }
      if (data.route === 'auftragsklarung' && mode === 'routing') {
        setMode('auftragsklarung');
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Fehler: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const startLiveVoice = async () => {
    // Fetch system prompt server-side via a small helper
    const res = await fetch('/api/voice-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: selectedPersona ? 'persona' : mode, personaId: selectedPersona?.id }),
    });
    const data = await res.json();
    setSystemPromptForVoice(data.systemPrompt);
    setShowVoiceLive(true);
  };

  const activeModule = MODULES.find((m) => m.id === mode);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">KITEKO</h1>
            <p className="text-xs text-gray-500">KI-gestütztes Stakeholder-Training</p>
          </div>
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button
                onClick={resetChat}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Neu starten
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* API Key Setup */}
        {!geminiKey && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-medium text-amber-800 mb-2">Gemini API Key erforderlich</p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIza..."
                className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveKey(e.target.value);
                }}
              />
              <button
                onClick={(e) => saveKey(e.target.previousSibling.value)}
                className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
              >
                Speichern
              </button>
            </div>
            <p className="text-xs text-amber-600 mt-1">Wird nur lokal in deinem Browser gespeichert.</p>
          </div>
        )}

        {/* Module Selection */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {MODULES.map((m) => (
            <ModuleCard
              key={m.id}
              icon={m.icon}
              title={m.title}
              description={m.description}
              active={mode === m.id && !selectedPersona}
              onClick={() => handleModeChange(m.id)}
            />
          ))}
        </div>

        {/* Persona Selection (only in persona mode) */}
        {mode === 'persona' && !selectedPersona && messages.length === 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Mit wem möchtest du sprechen?</p>
            <div className="grid grid-cols-3 gap-2">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-left"
                >
                  <span>{p.icon}</span>
                  <span className="text-gray-700 text-xs leading-tight">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Persona Banner */}
        {selectedPersona && (
          <div className="mb-4">
            <PersonaCard
              persona={selectedPersona}
              onClose={() => {
                setSelectedPersona(null);
                resetChat();
              }}
            />
          </div>
        )}

        {/* Live Voice Mode */}
        {showVoiceLive && geminiKey && (
          <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-indigo-800">
                Live Voice-Modus{selectedPersona ? ` — ${selectedPersona.name}` : ''}
              </p>
              <button
                onClick={() => setShowVoiceLive(false)}
                className="text-xs text-indigo-500 hover:text-indigo-700"
              >
                Beenden
              </button>
            </div>
            <GeminiVoice
              systemPrompt={systemPromptForVoice}
              apiKey={geminiKey}
              model="gemini-3.5-flash"
              onText={(text) =>
                setMessages((prev) => [...prev, { role: 'assistant', content: text }])
              }
            />
            <p className="text-xs text-indigo-500 mt-2">
              Sprich direkt — die Persona antwortet mit ihrer Stimme.
            </p>
          </div>
        )}

        {/* Chat Area */}
        <div className="bg-gray-50 rounded-xl min-h-[200px] max-h-[50vh] overflow-y-auto px-2">
          {messages.length === 0 && !loading && (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
              {mode === 'routing'
                ? 'Beschreibe deine Situation — ich finde den richtigen Ansatz.'
                : mode === 'auftragsklarung'
                ? 'Erzähl mir von deinem Projekt — wir klären gemeinsam den Auftrag.'
                : selectedPersona
                ? `${selectedPersona.name} wartet auf dich. Starte das Gespräch.`
                : 'Wähle eine Persona oben.'}
            </div>
          )}
          <ChatView messages={messages} loading={loading} />
        </div>

        {/* Input Area */}
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || !geminiKey}
              placeholder={
                !geminiKey
                  ? 'API Key oben eingeben...'
                  : selectedPersona
                  ? `Schreibe an ${selectedPersona.name}...`
                  : 'Deine Nachricht... (Enter zum Senden)'
              }
              rows={2}
              className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim() || !geminiKey}
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm self-end"
            >
              Senden
            </button>
          </div>

          {/* Voice Controls */}
          {geminiKey && (
            <div className="flex items-center gap-3">
              <VoiceButton
                disabled={loading}
                onTranscript={(text) => {
                  setInput(text);
                  sendMessage(text);
                }}
              />
              {!showVoiceLive && (selectedPersona || mode !== 'routing') && (
                <button
                  onClick={startLiveVoice}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors"
                >
                  <span>🔊</span>
                  <span>Live Voice-Dialog</span>
                </button>
              )}
              {geminiKey && (
                <button
                  onClick={() => { setGeminiKey(''); localStorage.removeItem('KITEKO_GEMINI_KEY'); }}
                  className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                >
                  Key zurücksetzen
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
