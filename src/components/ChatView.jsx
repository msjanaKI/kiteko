'use client';

import { useEffect, useRef } from 'react';

const INITIALS = {
  '01': 'CEO', '02': 'CFO', '03': 'HR', '04': 'LG',
  '05': 'PM',  '06': 'IT',  '07': 'SL', '08': 'CO',
  '09': 'INV', '10': 'AB',  '11': 'BR', '12': 'SV',
};

export default function ChatView({ messages, loading, persona, boardPersonas = [] }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) return null;

  // Build a map for quick persona lookup in board mode
  const boardMap = Object.fromEntries(boardPersonas.map(p => [p.id, p]));
  const isBoard = boardPersonas.length > 0;

  const getPersonaDisplay = (msg) => {
    if (msg.personaId && boardMap[msg.personaId]) {
      const p = boardMap[msg.personaId];
      return { initials: INITIALS[msg.personaId] || msg.personaId, name: p.name.split('/')[0].trim() };
    }
    if (msg.personaId && persona?.id === msg.personaId) {
      return { initials: INITIALS[msg.personaId] || 'KI', name: persona.name.split('/')[0].trim() };
    }
    if (persona) {
      return { initials: INITIALS[persona.id] || persona.name.slice(0,3).toUpperCase(), name: persona.name.split('/')[0].trim() };
    }
    return { initials: 'KI', name: 'KITEKO' };
  };

  // Color cycling for board mode participants
  const BOARD_COLORS = [
    'bg-indigo-600', 'bg-violet-600', 'bg-sky-600',
    'bg-emerald-600', 'bg-amber-600', 'bg-rose-600',
  ];
  const boardColorIndex = boardPersonas.reduce((acc, p, i) => { acc[p.id] = i; return acc; }, {});

  return (
    <div className="space-y-5">
      {messages.map((msg, i) => {
        if (msg.role === 'user') {
          return (
            <div key={i} className="flex gap-3 max-w-[80%] ml-auto flex-row-reverse">
              <div className="h-8 w-8 shrink-0 rounded-full bg-slate-200 grid place-items-center text-slate-700 text-xs font-semibold">DU</div>
              <div>
                <div className="text-xs text-slate-500 mb-1 text-right">Du</div>
                <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            </div>
          );
        }

        const { initials, name } = getPersonaDisplay(msg);
        const avatarColor = isBoard && msg.personaId && boardColorIndex[msg.personaId] !== undefined
          ? BOARD_COLORS[boardColorIndex[msg.personaId]]
          : 'bg-indigo-600';

        return (
          <div key={i} className="flex gap-3 max-w-[85%]">
            <div className={`h-8 w-8 shrink-0 rounded-full ${avatarColor} grid place-items-center text-white text-[10px] font-bold`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-500 mb-1 font-medium text-slate-700">{name}</div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-[15px] leading-relaxed text-slate-800 shadow-sm whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          </div>
        );
      })}

      {loading && (
        <div className="flex gap-3 max-w-[80%]">
          <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-600 grid place-items-center text-white text-[10px] font-bold">
            {isBoard ? '···' : (persona ? (INITIALS[persona.id] || 'KI') : 'KI')}
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{animationDelay:'0ms'}}/>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{animationDelay:'120ms'}}/>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{animationDelay:'240ms'}}/>
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
