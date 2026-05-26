import { getAllProfiles } from '@/lib/prompts';

export async function GET() {
  const profiles = getAllProfiles().map(({ id, filename, name }) => ({ id, filename, name }));
  return Response.json({ profiles });
}
