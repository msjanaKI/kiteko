import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildRoutingSystemPrompt,
  buildPersonaSystemPrompt,
  buildScsSystemPrompt,
  buildReflectionSystemPrompt,
  buildRealStakeholderGuidedPrompt,
  buildRealStakeholderSimulationPrompt,
  buildSparringGuidedPrompt,
  buildSparringSystemPrompt,
  getAllProfiles,
} from '@/lib/prompts';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

export async function POST(request) {
  const body = await request.json();
  const { messages, mode, personaId, personaIds, customProfile, customName, sparringProfile } = body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: 'GEMINI_API_KEY nicht gesetzt' }, { status: 500 });

  const genAI = new GoogleGenerativeAI(apiKey);

  let systemPrompt;

  if (mode === 'reflection') {
    const allProfiles = getAllProfiles();
    const ids = personaIds?.length ? personaIds : (personaId ? [personaId] : []);
    const profiles = ids.map(id => allProfiles.find(p => p.id === id)).filter(Boolean);
    if (!profiles.length) return Response.json({ error: 'Kein Profil für Reflexion' }, { status: 400 });
    systemPrompt = buildReflectionSystemPrompt(profiles);

  } else if (mode === 'persona' && personaId) {
    const profiles = getAllProfiles();
    const profile = profiles.find(p => p.id === personaId);
    if (!profile) return Response.json({ error: 'Profil nicht gefunden' }, { status: 404 });
    systemPrompt = buildPersonaSystemPrompt(profile);

  } else if (mode === 'auftragsklarung') {
    systemPrompt = buildScsSystemPrompt();

  } else if (mode === 'realstakeholder_guided') {
    systemPrompt = buildRealStakeholderGuidedPrompt();

  } else if (mode === 'realstakeholder_sim') {
    if (!customProfile) return Response.json({ error: 'Kein Profil übergeben' }, { status: 400 });
    systemPrompt = buildRealStakeholderSimulationPrompt(customProfile, customName || 'Stakeholder');

  } else if (mode === 'sparring_guided') {
    systemPrompt = buildSparringGuidedPrompt(sparringProfile || null);

  } else if (mode === 'sparring_sim') {
    if (!sparringProfile) return Response.json({ error: 'Kein Nutzerprofil übergeben' }, { status: 400 });
    systemPrompt = buildSparringSystemPrompt(sparringProfile);

  } else {
    systemPrompt = buildRoutingSystemPrompt();
  }

  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: systemPrompt });

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const lastMessage = messages[messages.length - 1];

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);
  const text = result.response.text();

  // Extract JSON routing signals
  const jsonMatch = text.match(/```json\n([\s\S]+?)\n```/);
  let routeData = null;
  if (jsonMatch) {
    try { routeData = JSON.parse(jsonMatch[1]); } catch { /* ignore */ }
  }

  const cleanText = routeData
    ? text.replace(/```json\n[\s\S]+?\n```\n?/, '').trim()
    : text;

  return Response.json({
    text: cleanText || routeData?.message || text,
    route: routeData?.route || null,
    personaId: routeData?.persona_id || null,
    // For realstakeholder + sparring ready signals
    profile: routeData?.profile || null,
    name: routeData?.name || null,
  });
}
