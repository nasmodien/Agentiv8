'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const mockEvents: Record<number, { unit: string; guest: string; color: string; type: string }[]> = {
  10: [{ unit: 'Unit 5', guest: 'Sarah Mitchell', color: '#2563eb', type: 'check-in' }],
  11: [{ unit: 'Unit 8', guest: 'David Cole', color: '#16a34a', type: 'occupied' }],
  12: [{ unit: 'Unit 3', guest: 'Anna Patel', color: '#ea580c', type: 'check-in' }],
  13: [{ unit: 'Unit 5', guest: 'Sarah Mitchell', color: '#2563eb', type: 'occupied' }, { unit: 'Unit 9', guest: 'Maria Kim', color: '#7c3aed', type: 'check-in' }],
  14: [{ unit: 'Unit 5', guest: 'Sarah Mitchell', color: '#2563eb', type: 'check-out' }],
  15: [{ unit: 'Unit 3', guest: 'Anna Patel', color: '#ea580c', type: 'check-out' }],
};

export default function CalendarPage() {
  const today = new Date();
  const [current, setCurrent] = useState({ month: today.getMonth(), year: today.getFullYear() });

  const firstDay = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrent((c) =>
      c.month === 0 ? { month: 11, year: c.year - 1 } : { month: c.month - 1, year: c.year }
    );
  };
  const nextMonth = () => {
    setCurrent((c) =>
      c.month === 11 ? { month: 0, year: c.year + 1 } : { month: c.month + 1, year: c.year }
    );
  };

  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center">
          <CalendarDays size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy">Booking Calendar</h1>
          <p className="text-sm text-gray-500">View check-ins, check-outs, and occupied dates</p>
        </div>
      </div>

      <div className="bg-white rounded-[10px] border border-gray-200 overflow-hidden" style={{ boxShadow: 'var(--shadow)' }}>
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-bold text-navy text-base">
            {MONTHS[current.month]} {current.year}
          </h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();
            const events = day ? mockEvents[day] ?? [] : [];

            return (
              <div
                key={i}
                className="min-h-[90px] border-r border-b border-gray-50 p-1.5 last:border-r-0"
              >
                {day && (
                  <>
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1 ${
                        isToday ? 'bg-blue text-white' : 'text-gray-600'
                      }`}
                    >
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {events.map((ev, ei) => (
                        <div
                          key={ei}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate text-white"
                          style={{ backgroundColor: ev.color }}
                        >
                          {ev.unit} · {ev.type === 'check-in' ? '▶' : ev.type === 'check-out' ? '◀' : '—'} {ev.guest.split(' ')[0]}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 bg-white rounded-[10px] border border-gray-200 px-5 py-3" style={{ boxShadow: 'var(--shadow)' }}>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Legend</span>
        {[
          { color: '#2563eb', label: 'Unit 5' },
          { color: '#16a34a', label: 'Unit 8' },
          { color: '#ea580c', label: 'Unit 3' },
          { color: '#7c3aed', label: 'Unit 9' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
            {l.label}
          </div>
        ))}
        <div className="flex items-center gap-3 ml-auto text-xs text-gray-500">
          <span>▶ Check-in</span>
          <span>— Occupied</span>
          <span>◀ Check-out</span>
        </div>
      </div>
    </div>
  );
}
