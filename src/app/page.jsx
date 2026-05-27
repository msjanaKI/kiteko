'use client';

import { useState, useEffect, useRef } from 'react';
import ModuleCard from '@/components/ModuleCard';
import ChatView from '@/components/ChatView';
import PersonaCard, { ActivePersonaBanner } from '@/components/PersonaCard';
import VoiceButton from '@/components/VoiceButton';

const MODULES = [
  { id: 'routing', number: '01', title: 'Freie Eingabe', description: 'Stelle eigene Fragen, ohne Vorgaben.' },
  { id: 'auftragsklarung', number: '02', title: 'Auftragsklärung', description: 'Schärfe Scope, Ziele und Erfolgskriterien.' },
  { id: 'persona', number: '03', title: 'Persona-Simulation', description: 'Übe Gespräche mit einem Stakeholder-Archetyp.' },
  { id: 'board', number: '04', title: 'Board Meeting', description: 'Diskutiere mit 2–6 Stakeholdern gleichzeitig.' },
  { id: 'realstakeholder', number: '05', title: 'Realer Stakeholder', description: 'Simuliere eine echte Person — mit deinen Infos.' },
  { id: 'sparring', number: '06', title: 'Sparringspartner', description: 'Eine KI-Gegenstimme die deine blinden Flecken sieht.' },
];

const VOICE_PROFILE = {
  // CEO tief, ruhit, autoritativ
  '01': { pitch: 0.80, rate: 0.88, voiceHint: ['Google Deutsch', 'Microsoft Katja', 'Microsoft Hedda', 'Anna', 'Alex'] },
  // CFO analytisch, präzise, etwas höher
  '02': { pitch: 0.85, rate: 0.83, voiceHint: ['Google Deutsch', 'Microsoft Katja', 'Samantha', 'Anna'] },
  // HR empathisch, warm, mittelhoch
  '03': { pitch: 1.15, rate: 1.02, voiceHint: ['Samantha', 'Anna', 'Google Deutsch', 'Microsoft Katja'] },
  // Legal vorsichtig, bedacht, niedrig
  '04': { pitch: 0.90, rate: 0.78, voiceHint: ['Microsoft Hedda', 'Anna', 'Google Deutsch', 'Alex'] },
  // Produktmanagement enthusiastisch, schnell
  '05': { pitch: 1.20, rate: 1.12, voiceHint: ['Samantha', 'Google Deutsch', 'Anna', 'Microsoft Katja'] },
  // IT technisch, neutral
  '06': { pitch: 0.95, rate: 0.93, voiceHint: ['Google Deutsch', 'Microsoft Katja', 'Alex', 'Anna'] },
  // Vertrieb energisch, schnell, hoch
  '07': { pitch: 1.25, rate: 1.18, voiceHint: ['Samantha', 'Anna', 'Google Deutsch', 'Microsoft Katja'] },
  // Controlling detailorientiert, langsam, niedrig
  '08': { pitch: 0.88, rate: 0.85, voiceHint: ['Microsoft Hedda', 'Google Deutsch', 'Anna', 'Alex'] },
  // Investor ernst, tief, bedacht
  '09': { pitch: 0.82, rate: 0.90, voiceHint: ['Microsoft Hedda', 'Google Deutsch', 'Alex', 'Anna'] },
  // Advisory Board weise, tief, langsam
  '10': { pitch: 0.78, rate: 0.85, voiceHint: ['Microsoft Hedda', 'Alex', 'Google Deutsch', 'Anna'] },
  // Betriebsrat direkt, mittel
  '11': { pitch: 1.00, rate: 0.88, voiceHint: ['Google Deutsch', 'Microsoft Katja', 'Samantha', 'Anna'] },
  // Service freundlich, warm
  '12': { pitch: 1.12, rate: 1.05, voiceHint: ['Samantha', 'Anna', 'Google Deutsch', 'Microsoft Katja'] },
};

// --- Voice Selection Helper ---
let cachedVoices = [];
let voicesLoaded = false;

// Stimmen asynchron laden – sie sind erst nach DOMContentLoad verfügbar
if (typeof window !== 'undefined' && window.speechSynthesis) {
  const loadVoices = () => {
    cachedVoices = window.speechSynthesis.getVoices();
    if (cachedVoices.length > 0) voicesLoaded = true;
  };
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/**
 * Finde die beste verfügbare deutsche Stimme basierend auf einer Priorisierungsliste.
 * Nutzt Caching und Fallback-Logik.
 * @param {string[]} hints - Priorisierte Liste von Stimmnamen-Substrings
 * @returns {SpeechSynthesisVoice|null}
 */
function selectVoice(hints) {
  if (!cachedVoices.length) {
    cachedVoices = typeof window !== 'undefined' && window.speechSynthesis
      ? window.speechSynthesis.getVoices() : [];
  }
  if (!cachedVoices.length) return null;

  const german = cachedVoices.filter(v => v.lang.startsWith('de'));

  // 1. Versuche jede Hint-Sprache in Prioritätsreihenfolge
  for (const hint of hints) {
    const match = german.find(v => v.name.includes(hint));
    if (match) return match;
  }

  // 2. Bevorzuge Nicht-localService (Cloud/hochwertig) statt OS-Standard
  const cloud = german.find(v => !v.localService);
  if (cloud) return cloud;

  // 3. Fallback: Erste deutsche Stimme
  return german[0] || null;
}

export const INITIALS = {
  '01': 'CEO', '02': 'CFO', '03': 'HR', '04': 'LG',
  '05': 'PM',  '06': 'IT',  '07': 'SL', '08': 'CO',
  '09': 'INV', '10': 'AB',  '11': 'BR', '12': 'SV',
};

const PERSONAS = [
  { id: '01', name: 'CEO / Geschäftsführer' }, { id: '02', name: 'CFO / Finanzvorstand' },
  { id: '03', name: 'HR-Leitung' },            { id: '04', name: 'Legal / Datenschutz' },
  { id: '05', name: 'Produktmanagement' },      { id: '06', name: 'IT-Leitung' },
  { id: '07', name: 'Vertrieb / Sales' },       { id: '08', name: 'Controlling' },
  { id: '09', name: 'Investor' },               { id: '10', name: 'Advisory Board' },
  { id: '11', name: 'Betriebsrat' },            { id: '12', name: 'Service / Sachbearbeitung' },
];

const LS_SPARRING = 'KITEKO_SPARRING_PROFILE';
const LS_KEY = 'KITEKO_GEMINI_KEY';

export default function Home() {
  const [mode, setMode] = useState('routing');

  // Single persona
  const [selectedPersona, setSelectedPersona] = useState(null);

  // Board
  const [boardPersonas, setBoardPersonas] = useState([]);
  const [boardStarted, setBoardStarted] = useState(false);

  // Real Stakeholder
  const [rsReady, setRsReady] = useState(false);   // guided phase complete
  const [rsProfile, setRsProfile] = useState('');   // collected description
  const [rsName, setRsName] = useState('');         // name/role

  // Sparring
  const [sparringReady, setSparringReady] = useState(false);
  const [sparringProfile, setSparringProfile] = useState('');

  // Chat
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Reflection (Feature 1)
  const [reflection, setReflection] = useState('');
  const [loadingReflection, setLoadingReflection] = useState(false);

  // API key + voice
  const [geminiKey, setGeminiKey] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const [listenState, setListenState] = useState('idle');

  // Refs for stale-closure safety
  const voiceModeRef = useRef(false);
  const loadingRef = useRef(false);
  const messagesRef = useRef([]);
  const modeRef = useRef('routing');
  const selectedPersonaRef = useRef(null);
  const boardPersonasRef = useRef([]);
  const boardStartedRef = useRef(false);
  const rsReadyRef = useRef(false);
  const rsProfileRef = useRef('');
  const rsNameRef = useRef('');
  const sparringReadyRef = useRef(false);
  const sparringProfileRef = useRef('');
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { selectedPersonaRef.current = selectedPersona; }, [selectedPersona]);
  useEffect(() => { boardPersonasRef.current = boardPersonas; }, [boardPersonas]);
  useEffect(() => { boardStartedRef.current = boardStarted; }, [boardStarted]);
  useEffect(() => { rsReadyRef.current = rsReady; }, [rsReady]);
  useEffect(() => { rsProfileRef.current = rsProfile; }, [rsProfile]);
  useEffect(() => { rsNameRef.current = rsName; }, [rsName]);
  useEffect(() => { sparringReadyRef.current = sparringReady; }, [sparringReady]);
  useEffect(() => { sparringProfileRef.current = sparringProfile; }, [sparringProfile]);

  useEffect(() => {
    const key = localStorage.getItem(LS_KEY);
    if (key) setGeminiKey(key);
    const sp = localStorage.getItem(LS_SPARRING);
    if (sp) setSparringProfile(sp);
  }, []);

  const saveKey = (key) => { setGeminiKey(key); localStorage.setItem(LS_KEY, key); };

  // ─── Voice ──────────────────────────────────────────────────────────────────

  const stopListening = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListenState(s => s === 'listening' ? 'idle' : s);
  };

  const startListening = () => {
    if (!voiceModeRef.current || loadingRef.current) return;
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) return;
    const r = new SR();
    r.lang = 'de-DE'; r.continuous = false; r.interimResults = false;
    r.onstart = () => setListenState('listening');
    r.onresult = (e) => { const t = e.results[0][0].transcript.trim(); if (t) sendMessageInternal(t); };
    r.onerror = () => setListenState('idle');
    r.onend = () => {
      recognitionRef.current = null;
      if (voiceModeRef.current && !loadingRef.current)
        setTimeout(() => { if (voiceModeRef.current && !loadingRef.current) startListening(); }, 300);
    };
    recognitionRef.current = r;
    try { r.start(); } catch { recognitionRef.current = null; }
  };

  const speakText = (text, personaId, onDone) => {
    if (!voiceModeRef.current || typeof window === 'undefined' || !window.speechSynthesis) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    const p = VOICE_PROFILE[personaId] || { pitch: 1.0, rate: 1.0, voiceHint: [] };
    u.pitch = p.pitch; u.rate = p.rate;

    // Wähle die beste verfügbare Stimme für diese Persona
    const voice = selectVoice(p.voiceHint || []);
    if (voice) u.voice = voice;

    u.onend = () => { setListenState('idle'); onDone?.(); };
    u.onerror = () => { setListenState('idle'); onDone?.(); };
    setListenState('speaking');
    window.speechSynthesis.speak(u);
  };

  const speakSequence = (msgs, index) => {
    if (index >= msgs.length) { if (voiceModeRef.current) startListening(); return; }
    const msg = msgs[index];
    speakText(msg.content, msg.personaId, () => setTimeout(() => speakSequence(msgs, index + 1), 400));
  };

  const toggleVoiceMode = () => {
    const next = !voiceMode;
    voiceModeRef.current = next;
    setVoiceMode(next);
    if (next) startListening();
    else { stopListening(); window.speechSynthesis?.cancel(); setListenState('idle'); }
  };

  // ─── Reflection (Feature 1) ──────────────────────────────────────────────────

  const handleReflection = async () => {
    setLoadingReflection(true);
    setReflection('');
    const personaIds = mode === 'board'
      ? boardPersonasRef.current.map(p => p.id)
      : selectedPersonaRef.current ? [selectedPersonaRef.current.id] : [];
    if (!personaIds.length) { setLoadingReflection(false); return; }
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesRef.current, mode: 'reflection', personaIds }),
      });
      const data = await res.json();
      setReflection(data.text || data.error || '');
    } catch (err) {
      setReflection(`Fehler: ${err.message}`);
    } finally {
      setLoadingReflection(false);
    }
  };

  // ─── Board ───────────────────────────────────────────────────────────────────

  const buildPersonaHistory = (allMsgs, personaId) =>
    allMsgs.filter(m => m.role === 'user' || m.personaId === personaId)
           .map(m => ({ role: m.role, content: m.content }));

  const toggleBoardPersona = (p) => {
    setBoardPersonas(prev => {
      const exists = prev.find(x => x.id === p.id);
      if (exists) return prev.filter(x => x.id !== p.id);
      if (prev.length >= 6) return prev;
      return [...prev, p];
    });
  };

  const startBoardMeeting = () => {
    if (boardPersonas.length < 2) return;
    setBoardStarted(true); boardStartedRef.current = true;
  };

  const sendBoardMessage = async (text) => {
    if (!text.trim() || loadingRef.current) return;
    loadingRef.current = true; setLoading(true); stopListening();
    const userMsg = { role: 'user', content: text };
    const current = [...messagesRef.current, userMsg];
    messagesRef.current = current; setMessages(current); setInput('');
    try {
      const personas = boardPersonasRef.current;
      const responses = await Promise.all(personas.map(async (persona) => {
        const history = buildPersonaHistory(current, persona.id);
        const res = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, mode: 'persona', personaId: persona.id }),
        });
        const data = await res.json();
        return { role: 'assistant', content: data.text || data.error || '–', personaId: persona.id, personaName: persona.name };
      }));
      const updated = [...current, ...responses];
      messagesRef.current = updated; setMessages(updated);
      if (voiceModeRef.current) speakSequence(responses, 0);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Fehler: ${err.message}` }]);
      if (voiceModeRef.current) startListening();
    } finally {
      loadingRef.current = false; setLoading(false); inputRef.current?.focus();
    }
  };

  // ─── Core send ───────────────────────────────────────────────────────────────

  const sendMessageInternal = async (text) => {
    if (modeRef.current === 'board' && boardStartedRef.current) return sendBoardMessage(text);
    if (!text.trim() || loadingRef.current) return;

    loadingRef.current = true; setLoading(true); stopListening();
    const userMessage = { role: 'user', content: text };
    const newMessages = [...messagesRef.current, userMessage];
    messagesRef.current = newMessages; setMessages(newMessages); setInput('');

    // Determine API mode + extra params
    let apiMode = modeRef.current;
    let extraParams = {};
    const m = modeRef.current;

    if (m === 'persona' && selectedPersonaRef.current) {
      apiMode = 'persona';
      extraParams = { personaId: selectedPersonaRef.current.id };
    } else if (m === 'realstakeholder') {
      apiMode = rsReadyRef.current ? 'realstakeholder_sim' : 'realstakeholder_guided';
      if (rsReadyRef.current) extraParams = { customProfile: rsProfileRef.current, customName: rsNameRef.current };
    } else if (m === 'sparring') {
      apiMode = sparringReadyRef.current ? 'sparring_sim' : 'sparring_guided';
      if (!sparringReadyRef.current) extraParams = { sparringProfile: sparringProfileRef.current || null };
      else extraParams = { sparringProfile: sparringProfileRef.current };
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, mode: apiMode, ...extraParams }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const pid = selectedPersonaRef.current?.id || null;
      setMessages(prev => [...prev, { role: 'assistant', content: data.text, personaId: pid }]);

      // Handle routing signals
      if (data.route === 'persona_simulation' && data.personaId && !selectedPersonaRef.current) {
        const persona = PERSONAS.find(p => p.id === data.personaId);
        if (persona) { selectedPersonaRef.current = persona; setSelectedPersona(persona); }
      }
      if (data.route === 'auftragsklarung' && modeRef.current === 'routing') setMode('auftragsklarung');

      // Realer Stakeholder ready
      if (data.route === 'realstakeholder_ready' && data.profile) {
        setRsProfile(data.profile); rsProfileRef.current = data.profile;
        setRsName(data.name || 'Stakeholder'); rsNameRef.current = data.name || 'Stakeholder';
        setRsReady(true); rsReadyRef.current = true;
      }

      // Sparring ready
      if (data.route === 'sparring_ready' && data.profile) {
        setSparringProfile(data.profile); sparringProfileRef.current = data.profile;
        localStorage.setItem(LS_SPARRING, data.profile);
        setSparringReady(true); sparringReadyRef.current = true;
      }

      speakText(data.text, pid, () => { if (voiceModeRef.current) startListening(); });
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Fehler: ${err.message}` }]);
      if (voiceModeRef.current) startListening();
    } finally {
      loadingRef.current = false; setLoading(false); inputRef.current?.focus();
    }
  };

  // ─── Reset ───────────────────────────────────────────────────────────────────

  const resetChat = () => {
    stopListening(); window.speechSynthesis?.cancel();
    setMessages([]); messagesRef.current = [];
    setSelectedPersona(null); selectedPersonaRef.current = null;
    setBoardPersonas([]); boardPersonasRef.current = [];
    setBoardStarted(false); boardStartedRef.current = false;
    setRsReady(false); rsReadyRef.current = false;
    setRsProfile(''); rsProfileRef.current = '';
    setRsName(''); rsNameRef.current = '';
    setSparringReady(false); sparringReadyRef.current = false;
    setReflection('');
    setListenState('idle');
  };

  const handleModeChange = (newMode) => {
    setMode(newMode); modeRef.current = newMode;
    // For sparring: check if saved profile exists → pre-load
    if (newMode === 'sparring') {
      const saved = localStorage.getItem(LS_SPARRING);
      if (saved) { setSparringProfile(saved); sparringProfileRef.current = saved; }
    }
    resetChat();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessageInternal(input); }
  };

  // ─── Derived state ────────────────────────────────────────────────────────────

  const hasChat = messages.length > 0 || loading;
  const showPersonaGrid = mode === 'persona' && !selectedPersona && messages.length === 0;
  const showBoardGrid = mode === 'board' && !boardStarted;

  const showChat =
    (mode !== 'persona' && mode !== 'board') ||
    (mode === 'persona' && selectedPersona) ||
    (mode === 'board' && boardStarted);

  const canReflect =
    messages.filter(m => m.role === 'assistant').length >= 2 &&
    (selectedPersona || (mode === 'board' && boardStarted));

  const chatPlaceholder =
    mode === 'board' ? `${boardPersonas.map(p => p.name.split('/')[0].trim()).join(', ')} warten.` :
    mode === 'routing' ? 'Beschreibe deine Situation — ich finde den richtigen Ansatz.' :
    mode === 'auftragsklarung' ? 'Erzähl mir von deinem Projekt — wir klären gemeinsam den Auftrag.' :
    mode === 'realstakeholder' ? (rsReady ? `${rsName} wartet. Starte das Gespräch.` : 'Ich führe dich durch die Vorbereitung. Starte das Gespräch.') :
    mode === 'sparring' ? (sparringReady ? 'Dein Sparringspartner ist bereit.' : 'Ich konfiguriere deinen Sparringspartner.') :
    selectedPersona ? `${selectedPersona.name.split('/')[0].trim()} wartet.` : '';

  const inputPlaceholder =
    !geminiKey ? 'API Key eingeben...' :
    mode === 'board' && boardStarted ? 'Deine Frage an das Board…' :
    mode === 'realstakeholder' && rsReady ? `Schreibe an ${rsName}…` :
    mode === 'sparring' && sparringReady ? 'Deine These oder dein Thema…' :
    selectedPersona ? `Schreibe an ${selectedPersona.name.split('/')[0].trim()}…` :
    'Deine Nachricht… (Enter zum Senden)';

  // ─── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 grid place-items-center text-white font-bold tracking-tight text-sm">K</div>
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-semibold tracking-tight text-slate-900">KITEKO</span>
              <span className="text-xs text-slate-500">Stakeholder-Trainingstool</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChat && (
              <button onClick={resetChat} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition">
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

        {/* API Key */}
        {!geminiKey && (
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
            <p className="text-sm font-semibold text-amber-900 mb-3">Gemini API Key erforderlich</p>
            <div className="flex gap-2">
              <input type="password" placeholder="AIza..." className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                onKeyDown={(e) => { if (e.key === 'Enter') saveKey(e.target.value); }} />
              <button onClick={(e) => saveKey(e.target.previousSibling.value)} className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition">Speichern</button>
            </div>
            <p className="text-xs text-amber-600 mt-2">Wird nur lokal in deinem Browser gespeichert.</p>
          </div>
        )}

        {/* Schritt 1 — Modus */}
        <section className="space-y-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">Schritt 1 — Modus wählen</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Wofür möchtest du trainieren?</h1>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {MODULES.map((m) => (
              <ModuleCard key={m.id} id={m.id} number={m.number} title={m.title} description={m.description}
                active={mode === m.id && !selectedPersona && !boardStarted && !rsReady && !sparringReady}
                onClick={() => handleModeChange(m.id)} />
            ))}
          </div>
        </section>

        {/* Schritt 2 — Persona (Single) */}
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
              {PERSONAS.map(p => (
                <PersonaCard key={p.id} persona={p} selected={selectedPersona?.id === p.id} onClick={() => setSelectedPersona(p)} />
              ))}
            </div>
          </section>
        )}

        {/* Schritt 2 — Board Auswahl */}
        {showBoardGrid && (
          <section className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">Schritt 2 — Teilnehmer wählen</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Board Meeting zusammenstellen</h2>
                <p className="mt-1 text-sm text-slate-500">Wähle 2 bis 6 Stakeholder.</p>
              </div>
              <span className="text-sm font-medium text-slate-700">{boardPersonas.length} / 6</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {PERSONAS.map(p => (
                <PersonaCard key={p.id} persona={p} selected={boardPersonas.some(bp => bp.id === p.id)} onClick={() => toggleBoardPersona(p)} />
              ))}
            </div>
            <button onClick={startBoardMeeting} disabled={boardPersonas.length < 2}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition">
              Meeting starten
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
          </section>
        )}

        {/* Sparring — saved profile notice */}
        {mode === 'sparring' && !sparringReady && sparringProfile && messages.length === 0 && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-900">Gespeichertes Profil gefunden</p>
              <p className="text-xs text-indigo-600 mt-0.5 max-w-lg truncate">{sparringProfile}</p>
            </div>
            <button onClick={() => { setSparringProfile(''); sparringProfileRef.current = ''; localStorage.removeItem(LS_SPARRING); }}
              className="text-xs text-indigo-500 hover:text-indigo-700 shrink-0 ml-4">Neu erstellen</button>
          </div>
        )}

        {/* Chat section */}
        {showChat && (
          <section className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">
                  {showPersonaGrid || showBoardGrid ? 'Schritt 3' : 'Schritt 2'}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Gesprächsverlauf</h2>
              </div>
              {/* Reflexion Button */}
              {canReflect && (
                <button onClick={handleReflection} disabled={loadingReflection}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition">
                  {loadingReflection ? (
                    <><span className="h-3 w-3 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"/>Analysiere…</>
                  ) : (
                    <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Reflexion</>
                  )}
                </button>
              )}
            </div>

            {/* Active Persona Banner */}
            {selectedPersona && mode === 'persona' && (
              <ActivePersonaBanner persona={selectedPersona} onClose={() => { setSelectedPersona(null); resetChat(); }} />
            )}

            {/* Realer Stakeholder Banner */}
            {mode === 'realstakeholder' && rsReady && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-card">
                <div className="h-8 w-8 rounded-lg bg-slate-700 grid place-items-center text-white text-xs font-bold shrink-0">
                  {rsName.slice(0,2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">{rsName}</div>
                  <div className="text-xs text-slate-500 truncate">{rsProfile.slice(0,80)}…</div>
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Online
                </span>
                <button onClick={resetChat} className="ml-2 text-xs text-slate-400 hover:text-slate-700 transition shrink-0">Beenden</button>
              </div>
            )}

            {/* Sparring Banner */}
            {mode === 'sparring' && sparringReady && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-card">
                <div className="h-8 w-8 rounded-lg bg-violet-600 grid place-items-center text-white text-xs font-bold shrink-0">SP</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">Sparringspartner</div>
                  <div className="text-xs text-slate-500 truncate">{sparringProfile.slice(0,80)}…</div>
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Bereit
                </span>
                <button onClick={resetChat} className="ml-2 text-xs text-slate-400 hover:text-slate-700 transition shrink-0">Beenden</button>
              </div>
            )}

            {/* Board Banner */}
            {mode === 'board' && boardStarted && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-card">
                <div className="flex -space-x-2 shrink-0">
                  {boardPersonas.slice(0,5).map(p => (
                    <div key={p.id} className="h-8 w-8 rounded-lg border-2 border-white bg-indigo-600 grid place-items-center text-white text-[10px] font-bold">{INITIALS[p.id]}</div>
                  ))}
                  {boardPersonas.length > 5 && (
                    <div className="h-8 w-8 rounded-lg border-2 border-white bg-slate-200 grid place-items-center text-slate-600 text-[10px] font-semibold">+{boardPersonas.length - 5}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">Board Meeting</div>
                  <div className="text-xs text-slate-500 truncate">{boardPersonas.map(p => p.name.split('/')[0].trim()).join(' · ')}</div>
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Online
                </span>
                <button onClick={resetChat} className="ml-2 text-xs text-slate-400 hover:text-slate-700 transition shrink-0">Beenden</button>
              </div>
            )}

            {/* Chat Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
              {voiceMode && (
                <div className="px-6 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-medium text-indigo-700">
                    {listenState === 'listening' && <><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"/>Höre zu…</>}
                    {listenState === 'speaking' && <><span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"/>Spricht…</>}
                    {listenState === 'idle' && <><span className="h-2 w-2 rounded-full bg-slate-400"/>Bereit</>}
                  </span>
                  <button onClick={toggleVoiceMode} className="text-xs text-indigo-500 hover:text-indigo-700 transition">Beenden</button>
                </div>
              )}

              <div className="p-6 min-h-[240px] max-h-[480px] overflow-y-auto bg-gradient-to-b from-slate-50/40 to-white">
                {!hasChat ? (
                  <div className="flex items-center justify-center h-40 text-sm text-slate-400 text-center px-6">{chatPlaceholder}</div>
                ) : (
                  <ChatView messages={messages} loading={loading} persona={selectedPersona}
                    boardPersonas={mode === 'board' ? boardPersonas : []} />
                )}
              </div>

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
                    <VoiceButton disabled={loading || !geminiKey} iconOnly
                      onTranscript={(t) => { setInput(t); sendMessageInternal(t); }} />
                  )}
                  <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown} disabled={loading || !geminiKey}
                    placeholder={inputPlaceholder} rows={1}
                    className="flex-1 resize-none bg-transparent outline-none px-2 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 leading-relaxed max-h-40 disabled:opacity-50" />
                  {geminiKey && (
                    <button onClick={toggleVoiceMode} title={voiceMode ? 'Beenden' : 'Sprachausgabe'}
                      className={`h-10 w-10 shrink-0 grid place-items-center rounded-lg transition ${voiceMode ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                    </button>
                  )}
                  <button onClick={() => sendMessageInternal(input)} disabled={loading || !input.trim() || !geminiKey}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-200 disabled:text-slate-400 transition shrink-0">
                    Senden
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>
                    </svg>
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between px-1">
                  <span className="text-xs text-slate-400">Enter zum Senden</span>
                  {geminiKey && (
                    <button onClick={() => { setGeminiKey(''); localStorage.removeItem(LS_KEY); }}
                      className="text-xs text-slate-400 hover:text-slate-600 transition">Key zurücksetzen</button>
                  )}
                </div>
              </div>
            </div>

            {/* Reflexion Card (Feature 1) */}
            {reflection && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  <span className="text-sm font-semibold text-emerald-800">Reflexion & Coaching-Feedback</span>
                  <button onClick={() => setReflection('')} className="ml-auto text-xs text-emerald-600 hover:text-emerald-800">Schließen</button>
                </div>
                <div className="prose prose-sm prose-emerald max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap text-sm">
                  {reflection}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-8 text-xs text-slate-400">
        KITEKO · KI-gestütztes Stakeholder-Training
      </footer>
    </div>
  );
}
