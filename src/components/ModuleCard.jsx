'use client';

const CompassSVG = ({ active }) => (
  <svg className={`absolute top-1/2 -translate-y-1/2 right-5 w-28 h-28 ${active ? 'text-indigo-300' : 'text-slate-400'}`} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1.5 3"/>
    <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.6"/>
    <line x1="50" y1="6" x2="50" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="50" y1="86" x2="50" y2="94" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <line x1="6" y1="50" x2="14" y2="50" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <line x1="86" y1="50" x2="94" y2="50" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <g transform="rotate(-28 50 50)">
      <polygon points="50,18 56,50 44,50" fill={active ? 'rgb(99 102 241)' : 'rgb(15 23 42)'}/>
      <polygon points="50,82 56,50 44,50" fill={active ? 'rgb(165 180 252)' : 'rgb(203 213 225)'}/>
    </g>
    <circle cx="50" cy="50" r="3.5" fill="white" stroke={active ? 'rgb(99 102 241)' : 'rgb(51 65 85)'} strokeWidth="1.25"/>
    <circle cx="50" cy="50" r="0.8" fill={active ? 'rgb(99 102 241)' : 'rgb(51 65 85)'}/>
  </svg>
);

const TargetSVG = ({ active }) => (
  <svg className={`absolute top-1/2 -translate-y-1/2 right-5 w-28 h-28 ${active ? 'text-indigo-300' : 'text-slate-400'}`} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1.5 3"/>
    <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="1"/>
    <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1"/>
    <line x1="6" y1="50" x2="14" y2="50" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <line x1="86" y1="50" x2="94" y2="50" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <line x1="50" y1="6" x2="50" y2="14" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <line x1="50" y1="86" x2="50" y2="94" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <circle cx="50" cy="50" r="8" fill={active ? 'rgb(99 102 241)' : 'rgb(15 23 42)'}/>
    <circle cx="50" cy="50" r="3.5" fill="white"/>
  </svg>
);

const PersonasSVG = () => (
  <>
    <div className="absolute bottom-5 right-5 flex items-center">
      <div className="h-11 w-11 rounded-full bg-white border border-slate-200 grid place-items-center text-[11px] font-semibold text-slate-700 shadow-sm">CEO</div>
      <div className="h-11 w-11 rounded-full bg-slate-900 grid place-items-center text-[11px] font-semibold text-white shadow-sm -ml-3">CFO</div>
      <div className="h-11 w-11 rounded-full bg-white border border-slate-200 grid place-items-center text-[11px] font-semibold text-slate-700 shadow-sm -ml-3">HR</div>
      <div className="h-9 w-9 rounded-full bg-slate-200 grid place-items-center text-[11px] font-semibold text-slate-600 shadow-sm -ml-3">+9</div>
    </div>
    <div className="absolute top-6 right-[118px] flex items-center gap-1 bg-white border border-slate-200 rounded-full pl-2.5 pr-2.5 py-1.5 shadow-sm">
      <span className="h-1 w-1 rounded-full bg-slate-400"/>
      <span className="h-1 w-1 rounded-full bg-slate-400 animate-pulse" style={{animationDelay:'120ms'}}/>
      <span className="h-1 w-1 rounded-full bg-slate-400 animate-pulse" style={{animationDelay:'240ms'}}/>
      <span className="absolute -bottom-1 right-4 w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45"/>
    </div>
  </>
);

const ArrowIcon = () => (
  <svg className="w-4 h-4 transition group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M5 12h14M13 6l6 6-6 6"/>
  </svg>
);

export default function ModuleCard({ id, number, title, description, active, onClick }) {
  const bgActive = active
    ? 'bg-gradient-to-br from-indigo-100 to-indigo-50'
    : 'bg-gradient-to-br from-slate-100 to-slate-50';

  return (
    <button
      onClick={onClick}
      className={[
        'group text-left rounded-2xl transition-all duration-200 hover:-translate-y-0.5 overflow-hidden',
        active
          ? 'bg-white border-2 border-indigo-600 shadow-card-h ring-4 ring-indigo-100'
          : 'bg-white border border-slate-200 shadow-card hover:shadow-card-h hover:border-slate-300',
      ].join(' ')}
    >
      {/* Illustration header */}
      <div className={`relative h-36 ${bgActive} overflow-hidden`}>
        <span className={`absolute top-5 left-6 text-6xl font-semibold tracking-tighter leading-none transition ${active ? 'text-indigo-300' : 'text-slate-300 group-hover:text-indigo-300'}`}>
          {number}
        </span>
        {id === 'routing' && <CompassSVG active={active} />}
        {id === 'auftragsklarung' && <TargetSVG active={active} />}
        {id === 'persona' && <PersonasSVG />}
        {active && (
          <div className="absolute top-3 right-3 text-xs font-semibold text-indigo-600 inline-flex items-center gap-1 bg-white/70 backdrop-blur px-2 py-1 rounded-md">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"/>Aktiv
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 pt-5">
        <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{description}</p>
        <div className={`mt-4 inline-flex items-center gap-1 text-sm font-medium transition ${active ? 'text-indigo-600 font-semibold' : 'text-slate-700 group-hover:text-indigo-600'}`}>
          {active ? 'Fortsetzen' : 'Starten'}
          <ArrowIcon />
        </div>
      </div>
    </button>
  );
}
