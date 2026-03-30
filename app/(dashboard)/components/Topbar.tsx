'use client';

import { useState } from 'react';
import { Bell, User, ChevronDown } from 'lucide-react';

const properties = [
  'Ocean Vista Rentals',
  'Unit 5 – Ocean Vista',
  'Unit 8 – Ocean Vista',
  'Unit 3 – Ocean Vista',
];

export function Topbar() {
  const [selectedProperty, setSelectedProperty] = useState('Ocean Vista Rentals');
  const [open, setOpen] = useState(false);

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center justify-between bg-white border-b border-gray-200 px-6"
      style={{
        left: 'var(--sidebar-w)',
        height: 'var(--topbar-h)',
      }}
    >
      {/* Left: Property Selector */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-navy hover:bg-gray-100 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-green flex-shrink-0" />
          <span>{selectedProperty}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px] z-50">
            {properties.map((p) => (
              <button
                key={p}
                onClick={() => { setSelectedProperty(p); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-navy"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Center: Stats */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-500">Properties Booked:</span>
          <span className="text-sm font-semibold text-navy">18 / 24</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-500">Check-Ins Today:</span>
          <span className="text-sm font-semibold text-blue">12</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-500">Escalations:</span>
          <span className="text-sm font-semibold text-orange">3</span>
        </div>
      </div>

      {/* Right: Bell + User */}
      <div className="flex items-center gap-2">
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <Bell size={18} className="text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red border-2 border-white" />
        </button>
        <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
        </button>
      </div>
    </header>
  );
}
