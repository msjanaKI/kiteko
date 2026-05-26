'use client';

const PERSONA_COLORS = {
  '01': 'bg-blue-100 text-blue-800',
  '02': 'bg-green-100 text-green-800',
  '03': 'bg-purple-100 text-purple-800',
  '04': 'bg-red-100 text-red-800',
  '05': 'bg-yellow-100 text-yellow-800',
  '06': 'bg-cyan-100 text-cyan-800',
  '07': 'bg-orange-100 text-orange-800',
  '08': 'bg-teal-100 text-teal-800',
  '09': 'bg-indigo-100 text-indigo-800',
  '10': 'bg-pink-100 text-pink-800',
  '11': 'bg-rose-100 text-rose-800',
  '12': 'bg-lime-100 text-lime-800',
};

export default function PersonaCard({ persona, onClose }) {
  if (!persona) return null;
  const colorClass = PERSONA_COLORS[persona.id] || 'bg-gray-100 text-gray-800';

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className={`px-2 py-1 rounded text-xs font-semibold ${colorClass}`}>
        Aktiv
      </div>
      <div className="text-sm font-medium text-gray-800">{persona.name}</div>
      <button
        onClick={onClose}
        className="ml-auto text-xs text-gray-400 hover:text-gray-600"
      >
        Rolle beenden
      </button>
    </div>
  );
}
