'use client';

import { useState, useEffect, useRef } from 'react';
import ModuleCard from '@/components/ModuleCard';
import ChatView from '@/components/ChatView';
import PersonaCard, { ActivePersonaBanner } from '@/components/PersonaCard';
import VoiceButton from '@/components/VoiceButton';

const MODULES = [
  {
    id: 'routing',
    number: '01',
    title: 'Freie Eingabe',
    description: 'Stelle eigene Fragen, ohne Vorgaben.',
  },
  {
    id: 'auftragsklarung',
    number: '02',
    title: 'Auftragsklärung',
    description: 'Schärfe Scope, Ziele und Erfolgskriterien.',
  },
  {
    id: 'persona',
    number: '03',
    title: 'Persona-Simulation',
    description: 'Übe Gespräche mit realistischen Stakeholdern.',
  },
];

const PERSONAS = [
  { id: '01', name: 'CEO / Geschäftsführer' },
  { id: '02', name: 'CFO / Finanzvorstand' },
  { id: '03', name: 'HR-Leitung' },
  { id: '04', name: 'Legal / Datenschutz' },
  { id: '05', name: 'Produktmanagement' },
  { id: '06', name: 'IT-Leitung' },
  { id: '07', name: 'Vertrieb / Sales' },
  { id: '08', name: 'Controlling' },
  { id: '09', name: 'Investor' },
  { id: '10', name: 'Advisory Board' },
  { id: '11', name: 'Betriebsrat' },
  { id: '12', name: 'Service / Sachbearbeitung' },
];

export default function Home() {
  const [mode, setMode] = useState('routing');
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const [listenState, setListenState] = useState('idle'); // idle | listening | speaking
  const voiceModeRef = useRef(false);
  const loadingRef = useRef(false);
  const messagesRef = useRef([]);
  const modeRef = useRef('routing');
  const selectedPersonaRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { selectedPersonaRef.current = selectedPersona; }, [selectedPersona]);

  useEffect(() => {
    const stored = localStorage.getItem('KITEKO_GEMINI_KEY');
    if (stored) setGeminiKey(stored);
  }, []);

  const saveKey = (key) => {
    setGeminiKey(key);
    localStorage.setItem('KITEKO_GEMINI_KEY', key);
  };

  const stopListening = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListenState((s) => s === 'listening' ? 'idle' : s);
  };

  const startListening = () => {
    if (!voiceModeRef.current || loadingRef.current) return;
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) return;
    const r = new SR();
    r.lang = 'de-DE';
    r.continuous = false;
    r.interimResults = false;
    r.onstart = () => setListenState('listening');
    r.onresult = (e) => {
      const transcript = e.results[0][0].transcript.trim();
      if (transcript) sendMessageInternal(transcript);
    };
    r.onerror = () => setListenState('idle');
    r.onend = () => {
      recognitionRef.current = null;
      // only restart if we ended without a result (no message was sent)
      if (voiceModeRef.current && !loadingRef.current) {
        setTimeout(() => { if (voiceModeRef.current && !loadingRef.current) startListening(); }, 300);
      }
    };
    recognitionRef.current = r;
    try { r.start(); } catch { recognitionRef.current = null; }
  };

  const speakText = (text, onDone) => {
    if (!voiceModeRef.current || typeof window === 'undefined' || !window.speechSynthesis) {
      onDone?.();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = 1.0;
    u.onend = () => { setListenState('idle'); onDone?.(); };
    u.onerror = () => { setListenState('idle'); onDone?.(); };
    setListenState('speaking');
    window.speechSynthesis.speak(u);
  };

  // Core send — uses refs so safe to call from STT callbacks
  const sendMessageInternal = async (text) => {
    if (!text.trim() || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    stopListening();
    const userMessage = { role: 'user', content: text };
    const newMessages = [...messagesRef.current, userMessage];
    messagesRef.current = newMessages;
    setMessages(newMessages);
    setInput('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          mode: selectedPersonaRef.current ? 'persona' : modeRef.current,
          personaId: selectedPersonaRef.current?.id || null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.text }]);
      if (data.route === 'persona_simulation' && data.personaId && !selectedPersonaRef.current) {
        const persona = PERSONAS.find((p) => p.id === data.personaId);
        if (persona) { selectedPersonaRef.current = persona; setSelectedPersona(persona); }
      }
      if (data.route === 'auftragsklarung' && modeRef.current === 'routing') setMode('auftragsklarung');
      speakText(data.text, () => { if (voiceModeRef.current) startListening(); });
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Fehler: ${err.message}` }]);
      if (voiceModeRef.current) startListening();
    } finally {
      loadingRef.current = false;
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const sendMessage = (text) => sendMessageInternal(text ?? input);

  const toggleVoiceMode = () => {
    const next = !voiceMode;
    voiceModeRef.current = next;
    setVoiceMode(next);
    if (next) {
      startListening();
    } else {
      stopListening();
      window.speechSynthesis?.cancel();
      setListenState('idle');
    }
  };

  const resetChat = () => {
    stopListening();
    window.speechSynthesis?.cancel();
    setMessages([]);
    messagesRef.current = [];
    setSelectedPersona(null);
    selectedPersonaRef.current = null;
    setListenState('idle');
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    modeRef.current = newMode;
    resetChat();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessageInternal(input); }
  };

  const hasChat = messages.length > 0 || loading;
  const showPersonaGrid = mode === 'persona' && !selectedPersona && messages.length === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 grid place-items-center text-white font-bold tracking-tight text-sm">
              K
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-semibold tracking-tight text-slate-900">KITEKO</span>
              <span className="text-xs text-slate-500">Stakeholder-Trainingstool</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChat && (
              <button
                onClick={resetChat}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>
                </svg>
                Neu starten
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">

        {/* API Key Setup */}
        {!geminiKey && (
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
            <p className="text-sm font-semibold text-amber-900 mb-3">Gemini API Key erforderlich</p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIza..."
                className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                onKeyDown={(e) => { if (e.key === 'Enter') saveKey(e.target.value); }}
              />
              <button
                onClick={(e) => saveKey(e.target.previousSibling.value)}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition"
              >
                Speichern
              </button>
            </div>
            <p className="text-xs text-amber-600 mt-2">Wird nur lokal in deinem Browser gespeichert.</p>
          </div>
        )}

        {/* SCHRITT 1 — Modus */}
        <section className="space-y-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">Schritt 1 — Modus wählen</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Wofür möchtest du trainieren?</h1>
            <p className="mt-2 text-slate-600 leading-relaxed text-sm">
              Wähle einen Modus, um dein Stakeholder-Gespräch realistisch zu üben.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MODULES.map((m) => (
              <ModuleCard
                key={m.id}
                id={m.id}
                number={m.number}
                title={m.title}
                description={m.description}
                active={mode === m.id && !selectedPersona}
                onClick={() => handleModeChange(m.id)}
              />
            ))}
          </div>
        </section>

        {/* SCHRITT 2 — Persona-Auswahl */}
        {showPersonaGrid && (
          <section className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">Schritt 2</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Persona auswählen</h2>
              </div>
              <span className="text-sm text-slate-500">12 verfügbar</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {PERSONAS.map((p) => (
                <PersonaCard
                  key={p.id}
                  persona={p}
                  selected={selectedPersona?.id === p.id}
                  onClick={() => setSelectedPersona(p)}
                />
              ))}
            </div>
          </section>
        )}

        {/* SCHRITT 3 — Chat */}
        {(selectedPersona || mode !== 'persona') && (
          <section className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">
                  {showPersonaGrid ? 'Schritt 3' : selectedPersona ? 'Schritt 2' : 'Schritt 2'}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Gesprächsverlauf</h2>
              </div>
              {selectedPersona && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"/>
                  {selectedPersona.name.split('/')[0].trim()} · bereit
                </div>
              )}
            </div>

            {/* Active Persona Banner */}
            {selectedPersona && (
              <ActivePersonaBanner
                persona={selectedPersona}
                onClose={() => { setSelectedPersona(null); resetChat(); }}
              />
            )}

            {/* Chat Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">

              {/* Voice Mode Banner */}
              {voiceMode && (
                <div className="px-6 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-medium text-indigo-700">
                    {listenState === 'listening' && <><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"/>Höre zu…</>}
                    {listenState === 'speaking' && <><span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"/>Persona spricht…</>}
                    {listenState === 'idle' && <><span className="h-2 w-2 rounded-full bg-slate-400"/>Bereit</>}
                  </span>
                  <button onClick={toggleVoiceMode} className="text-xs text-indigo-500 hover:text-indigo-700 transition">
                    Beenden
                  </button>
                </div>
              )}

              {/* Chat Body */}
              <div className="p-6 min-h-[240px] max-h-[420px] overflow-y-auto bg-gradient-to-b from-slate-50/40 to-white">
                {!hasChat ? (
                  <div className="flex items-center justify-center h-40 text-sm text-slate-400">
                    {mode === 'routing'
                      ? 'Beschreibe deine Situation — ich finde den richtigen Ansatz.'
                      : mode === 'auftragsklarung'
                      ? 'Erzähl mir von deinem Projekt — wir klären gemeinsam den Auftrag.'
                      : selectedPersona
                      ? `${selectedPersona.name.split('/')[0].trim()} wartet. Starte das Gespräch.`
                      : 'Wähle eine Persona oben.'}
                  </div>
                ) : (
                  <ChatView messages={messages} loading={loading} persona={selectedPersona} />
                )}
              </div>

              {/* Input Bar */}
              <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
                <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100 transition p-2">
                  {voiceMode ? (
                    <div className="h-10 w-10 shrink-0 grid place-items-center rounded-lg">
                      {listenState === 'listening' && (
                        <span className="flex gap-0.5 items-end h-5">
                          {[0,80,160,240,160].map((d,i) => (
                            <span key={i} className="w-1 rounded-full bg-emerald-500 animate-bounce" style={{height:`${8+i%3*4}px`,animationDelay:`${d}ms`}}/>
                          ))}
                        </span>
                      )}
                      {listenState === 'speaking' && (
                        <span className="flex gap-0.5 items-end h-5">
                          {[0,120,240,120,0].map((d,i) => (
                            <span key={i} className="w-1 rounded-full bg-indigo-500 animate-bounce" style={{height:`${6+i%3*5}px`,animationDelay:`${d}ms`}}/>
                          ))}
                        </span>
                      )}
                      {listenState === 'idle' && <span className="h-2 w-2 rounded-full bg-slate-300"/>}
                    </div>
                  ) : (
                    <VoiceButton
                      disabled={loading || !geminiKey}
                      iconOnly
                      onTranscript={(text) => { setInput(text); sendMessageInternal(text); }}
                    />
                  )}
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading || !geminiKey}
                    placeholder={
                      !geminiKey ? 'API Key eingeben...' :
                      selectedPersona ? `Schreibe an ${selectedPersona.name.split('/')[0].trim()}…` :
                      'Deine Nachricht… (Enter zum Senden)'
                    }
                    rows={1}
                    className="flex-1 resize-none bg-transparent outline-none px-2 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 leading-relaxed max-h-40 disabled:opacity-50"
                  />
                  {geminiKey && (
                    <button
                      onClick={toggleVoiceMode}
                      title={voiceMode ? 'Sprachausgabe beenden' : 'Sprachausgabe aktivieren'}
                      className={`h-10 w-10 shrink-0 grid place-items-center rounded-lg transition ${voiceMode ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => sendMessageInternal(input)}
                    disabled={loading || !input.trim() || !geminiKey}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-200 disabled:text-slate-400 transition shrink-0"
                  >
                    Senden
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>
                    </svg>
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between px-1">
                  <span className="text-xs text-slate-400">⌘ Enter zum Senden</span>
                  {geminiKey && (
                    <button
                      onClick={() => { setGeminiKey(''); localStorage.removeItem('KITEKO_GEMINI_KEY'); }}
                      className="text-xs text-slate-400 hover:text-slate-600 transition"
                    >
                      Key zurücksetzen
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-8 text-xs text-slate-400">
        KITEKO · KI-gestütztes Stakeholder-Training
      </footer>
    </div>
  );
}
