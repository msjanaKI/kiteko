'use client';

const SUBTITLES = {
  '01': 'Vision & Strategie',
  '02': 'ROI & Budget',
  '03': 'People & Kultur',
  '04': 'Compliance & Recht',
  '05': 'Roadmap & UX',
  '06': 'Architektur & Tech',
  '07': 'Vertrieb & Kunden',
  '08': 'Zahlen & Steuerung',
  '09': 'Rendite & Wachstum',
  '10': 'Governance & Beirat',
  '11': 'Mitbestimmung',
  '12': 'Prozesse & Support',
};

const INITIALS = {
  '01': 'CEO', '02': 'CFO', '03': 'HR', '04': 'LG',
  '05': 'PM',  '06': 'IT',  '07': 'SL', '08': 'CO',
  '09': 'INV', '10': 'AB',  '11': 'BR', '12': 'SV',
};

// Active banner shown separately (replaces old PersonaCard usage)
export function ActivePersonaBanner({ persona, onClose }) {
  if (!persona) return null;
  const initials = INITIALS[persona.id] || persona.id;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-card">
      <div className="h-8 w-8 rounded-lg bg-indigo-600 grid place-items-center text-white text-xs font-semibold shrink-0">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 truncate">{persona.name}</div>
        <div className="text-xs text-indigo-600 truncate">{SUBTITLES[persona.id]}</div>
      </div>
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Online
      </span>
      <button
        onClick={onClose}
        className="ml-2 text-xs text-slate-400 hover:text-slate-700 transition"
      >
        Beenden
      </button>
    </div>
  );
}

// Grid card for persona selection
export default function PersonaCard({ persona, selected, onClick }) {
  const initials = INITIALS[persona.id] || persona.id;
  const subtitle = SUBTITLES[persona.id] || '';

  return (
    <button
      onClick={onClick}
      className={[
        'group flex items-center gap-3 text-left rounded-xl p-4 transition-all relative',
        selected
          ? 'bg-indigo-50 border-2 border-indigo-600'
          : 'bg-white border border-slate-200 hover:border-slate-300 shadow-card hover:shadow-card-h',
      ].join(' ')}
    >
      <div className={`h-10 w-10 rounded-lg grid place-items-center text-sm font-semibold shrink-0 ${selected ? 'bg-indigo-600 text-white' : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700'}`}>
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 truncate leading-tight">{persona.name}</div>
        <div className={`text-xs truncate mt-0.5 ${selected ? 'text-indigo-700' : 'text-slate-500'}`}>{subtitle}</div>
      </div>
      {selected && (
        <svg className="absolute top-2 right-2 w-4 h-4 text-indigo-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M5 13l4 4L19 7"/>
        </svg>
      )}
    </button>
  );
}
