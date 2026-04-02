'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const COLORS = [
  '#2563eb','#16a34a','#ea580c','#7c3aed','#db2777','#0891b2','#65a30d','#d97706','#dc2626','#9333ea',
];

interface Booking {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  property: { id: string; name: string; unitNumber: string | null };
}

export default function CalendarPage() {
  const today = new Date();
  const [current, setCurrent] = useState({ month: today.getMonth(), year: today.getFullYear() });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyColors, setPropertyColors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/bookings?orgId=default')
      .then(r => r.json())
      .then(data => {
        const bkgs: Booking[] = data.bookings ?? [];
        setBookings(bkgs);
        // Assign stable colors per property
        const ids = [...new Set(bkgs.map(b => b.property.id))];
        const colorMap: Record<string, string> = {};
        ids.forEach((id, i) => { colorMap[id] = COLORS[i % COLORS.length]; });
        setPropertyColors(colorMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const prevMonth = () => setCurrent(c => c.month === 0 ? { month: 11, year: c.year - 1 } : { month: c.month - 1, year: c.year });
  const nextMonth = () => setCurrent(c => c.month === 11 ? { month: 0, year: c.year + 1 } : { month: c.month + 1, year: c.year });

  const firstDay = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  // Build events per day
  const eventsForDay = (day: number) => {
    const date = new Date(current.year, current.month, day);
    const dateStr = date.toISOString().split('T')[0];

    return bookings
      .filter(b => b.status !== 'CANCELLED')
      .filter(b => {
        const checkIn = new Date(b.checkIn).toISOString().split('T')[0];
        const checkOut = new Date(b.checkOut).toISOString().split('T')[0];
        return dateStr >= checkIn && dateStr <= checkOut;
      })
      .map(b => {
        const checkIn = new Date(b.checkIn).toISOString().split('T')[0];
        const checkOut = new Date(b.checkOut).toISOString().split('T')[0];
        const type = dateStr === checkIn ? 'check-in' : dateStr === checkOut ? 'check-out' : 'occupied';
        return {
          id: b.id,
          guest: b.guestName,
          unit: b.property.unitNumber ?? b.property.name,
          color: propertyColors[b.property.id] ?? '#6b7280',
          type,
          propertyId: b.property.id,
        };
      });
  };

  // Unique properties for legend
  const uniqueProperties = [...new Map(bookings.map(b => [b.property.id, b.property])).values()];

  return (
    <div className="max-w-5xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center">
            <CalendarDays size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">Booking Calendar</h1>
            <p className="text-sm text-gray-500">
              {loading ? 'Loading...' : `${bookings.filter(b => b.status !== 'CANCELLED').length} active bookings across ${uniqueProperties.length} properties`}
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw size={20} className="animate-spin mr-2" /> Loading bookings...
        </div>
      )}

      {!loading && (
        <>
          <div className="bg-white rounded-[10px] border border-gray-200 overflow-hidden" style={{ boxShadow: 'var(--shadow)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <ChevronLeft size={18} />
              </button>
              <h2 className="font-bold text-navy text-base">{MONTHS[current.month]} {current.year}</h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const isToday = day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();
                const events = day ? eventsForDay(day) : [];
                return (
                  <div key={i} className="min-h-[90px] border-r border-b border-gray-50 p-1.5 last:border-r-0">
                    {day && (
                      <>
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1 ${isToday ? 'bg-blue text-white' : 'text-gray-600'}`}>
                          {day}
                        </span>
                        <div className="space-y-0.5">
                          {events.slice(0, 3).map((ev, ei) => (
                            <div
                              key={ei}
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate text-white"
                              style={{ backgroundColor: ev.color }}
                              title={`${ev.unit} · ${ev.guest}`}
                            >
                              {ev.type === 'check-in' ? '▶' : ev.type === 'check-out' ? '◀' : '—'} {ev.unit.split(' ').slice(-1)[0]}
                            </div>
                          ))}
                          {events.length > 3 && (
                            <div className="text-[10px] text-gray-400 px-1.5">+{events.length - 3} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          {uniqueProperties.length > 0 && (
            <div className="bg-white rounded-[10px] border border-gray-200 px-5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2" style={{ boxShadow: 'var(--shadow)' }}>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Properties</span>
              {uniqueProperties.map(p => (
                <div key={p.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: propertyColors[p.id] }} />
                  {p.unitNumber ?? p.name}
                </div>
              ))}
              <div className="flex items-center gap-3 ml-auto text-xs text-gray-500">
                <span>▶ Check-in</span>
                <span>— Occupied</span>
                <span>◀ Check-out</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
