import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildRoutingSystemPrompt,
  buildPersonaSystemPrompt,
  buildScsSystemPrompt,
  getPersonaProfile,
  getAllProfiles,
} from '@/lib/prompts';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

export async function POST(request) {
  const { messages, mode, personaId } = await request.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GEMINI_API_KEY nicht gesetzt' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  let systemPrompt;
  if (mode === 'persona' && personaId) {
    const profiles = getAllProfiles();
    const profile = profiles.find((p) => p.id === personaId);
    if (!profile) return Response.json({ error: 'Profil nicht gefunden' }, { status: 404 });
    systemPrompt = buildPersonaSystemPrompt(profile);
  } else if (mode === 'auftragsklarung') {
    systemPrompt = buildScsSystemPrompt();
  } else {
    systemPrompt = buildRoutingSystemPrompt();
  }

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: systemPrompt,
  });

  // Convert message history to Gemini format
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);
  const text = result.response.text();

  // Try to extract routing info if in routing mode
  let routeData = null;
  if (mode === 'routing' || !mode) {
    const jsonMatch = text.match(/```json\n([\s\S]+?)\n```/);
    if (jsonMatch) {
      try {
        routeData = JSON.parse(jsonMatch[1]);
      } catch {
        // ignore parse errors
      }
    }
  }

  // Clean the response text (remove JSON block if present)
  const cleanText = routeData
    ? text.replace(/```json\n[\s\S]+?\n```\n?/, '').trim()
    : text;

  return Response.json({
    text: cleanText || routeData?.message || text,
    route: routeData?.route || null,
    personaId: routeData?.persona_id || null,
  });
}
