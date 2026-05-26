'use client';

export default function ModuleCard({ icon, title, description, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
        active
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
      }`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-semibold text-gray-900 mb-1">{title}</div>
      <div className="text-sm text-gray-500">{description}</div>
    </button>
  );
}
