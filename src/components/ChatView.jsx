'use client';

import { useEffect, useRef } from 'react';

export default function ChatView({ messages, loading, persona }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) return null;

  const personaInitials = persona?.name
    ? persona.name.split('/')[0].trim().slice(0, 3).toUpperCase()
    : 'KI';

  return (
    <div className="space-y-5">
      {messages.map((msg, i) => (
        msg.role === 'user' ? (
          <div key={i} className="flex gap-3 max-w-[80%] ml-auto flex-row-reverse">
            <div className="h-8 w-8 shrink-0 rounded-full bg-slate-200 grid place-items-center text-slate-700 text-xs font-semibold">
              DU
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1 text-right">Du</div>
              <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          </div>
        ) : (
          <div key={i} className="flex gap-3 max-w-[80%]">
            <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-600 grid place-items-center text-white text-xs font-semibold">
              {personaInitials}
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1 font-medium text-slate-700">
                {persona ? persona.name.split('/')[0].trim() : 'KITEKO'}
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-[15px] leading-relaxed text-slate-800 shadow-sm whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          </div>
        )
      ))}

      {loading && (
        <div className="flex gap-3 max-w-[80%]">
          <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-600 grid place-items-center text-white text-xs font-semibold">
            {personaInitials}
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
