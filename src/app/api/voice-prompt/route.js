import {
  buildRoutingSystemPrompt,
  buildPersonaSystemPrompt,
  buildScsSystemPrompt,
  getAllProfiles,
} from '@/lib/prompts';

export async function POST(request) {
  const { mode, personaId } = await request.json();

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

  return Response.json({ systemPrompt });
}
