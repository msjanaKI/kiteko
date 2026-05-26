import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function readFile(relativePath) {
  return fs.readFileSync(path.join(DATA_DIR, relativePath), 'utf-8');
}

export function getRoutingPrompt() {
  return readFile('routing-einstieg.md');
}

export function getScsCoverdalePrompt() {
  return readFile('scs-coverdale.md');
}

export function getPersonaProfile(id) {
  const files = fs.readdirSync(path.join(DATA_DIR, 'profiles'));
  const match = files.find((f) => f.startsWith(id));
  if (!match) throw new Error(`Profil nicht gefunden: ${id}`);
  return readFile(path.join('profiles', match));
}

export function getAllProfiles() {
  const dir = path.join(DATA_DIR, 'profiles');
  return fs.readdirSync(dir)
    .sort()
    .map((file) => {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const idMatch = file.match(/^(\d+)/);
      const titleMatch = content.match(/^## Archetyp: (.+)$/m);
      return {
        id: idMatch ? idMatch[1] : file,
        filename: file,
        name: titleMatch ? titleMatch[1] : file,
        content,
      };
    });
}

export function buildRoutingSystemPrompt() {
  const routing = getRoutingPrompt();
  return `Du bist ein erfahrener KI-Consultant-Assistent mit drei Spezialgebieten:

1. **Auftragsklärung** (SCS + Coverdale): Strukturierte Klärung von Projektaufträgen
2. **Persona-Simulation**: Gespräche aus der Perspektive von Stakeholder-Archetypen (CEO, CFO, HR, etc.)
3. **Archetyp-Lookup**: Informationen über Entscheidungslogik und Kommunikation verschiedener Rollen

Hier ist die Routing-Logik, nach der du arbeitest:

---
${routing}
---

**Wichtig für das Routing:**
Antworte immer mit einem JSON-Block am Anfang deiner Antwort in diesem Format:
\`\`\`json
{
  "route": "auftragsklarung" | "persona_simulation" | "archetyp_lookup",
  "persona_id": null | "01" | "02" | ... | "12",
  "message": "Deine Antwort an den Nutzer auf Deutsch"
}
\`\`\`

Danach kannst du frei antworten. Halte die Konversation natürlich und führe den Nutzer Schritt für Schritt.`;
}

export function buildPersonaSystemPrompt(profile) {
  return `Du bist jetzt vollständig in der Rolle des folgenden Stakeholder-Archetyps. Bleibe konsequent in dieser Rolle — du bist diese Person, nicht ein Assistent der sie beschreibt.

Hier ist dein Profil:

---
${profile.content}
---

**Anweisungen:**
- Antworte ALS diese Person, in der ersten Person ("Ich finde...", "Das sehe ich so...")
- Nutze den beschriebenen Kommunikationsstil konsequent
- Zeige die typischen Einwände und Haltungen aus dem Profil
- Bleibe in der Rolle auch wenn der Nutzer aus dem Gespräch heraustreten will
- Wenn der Nutzer explizit "Stop" oder "Ende" sagt, verlasse die Rolle und bestätige das

Starte das Gespräch mit einer typischen Eröffnung dieser Persona (z.B. knapp und ergebnisorientiert beim CEO, analytisch beim CFO, etc.)`;
}

export function buildScsSystemPrompt() {
  const scs = getScsCoverdalePrompt();
  return `Du führst eine strukturierte Auftragsklärung durch. Hier ist der Ablauf:

---
${scs}
---

Führe den Nutzer schrittweise durch die zwei Phasen:
- Phase 1: SCS-Analyse (Situation → Complication → Solution)
- Phase 2: Coverdale-Zielscheibe (Stakeholder, Sinn/Zweck, Endergebnis, Kriterien)

Stelle immer nur eine Frage auf einmal. Fasse am Ende jeder Phase zusammen was du verstanden hast und frage ob es passt, bevor du weitermachst.`;
}
