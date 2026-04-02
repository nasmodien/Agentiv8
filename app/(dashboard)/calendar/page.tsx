'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const COLORS = [
  '#0e7490','#1d4ed8','#15803d','#b45309','#7c3aed','#be185d','#0369a1','#4d7c0f','#c2410c','#6d28d9',
];

interface Booking {
  id: string;
  guestName: string;
  adults: number;
  checkIn: string;
  checkOut: string;
  status: string;
  channel: string;
  property: { id: string; name: string; unitNumber: string | null };
}

interface Property {
  id: string;
  name: string;
  unitNumber: string | null;
}

interface Rate {
  date: string;
  price: number | null;
  isAvailable: boolean;
}

type ViewMode = 'multi' | 'monthly';

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function formatZAR(price: number | null) {
  if (!price) return '';
  return `ZAR ${price.toLocaleString()}`;
}

const PROPERTY_COLORS: Record<string, string> = {};
function getColor(id: string, allIds: string[]) {
  if (!PROPERTY_COLORS[id]) {
    const idx = allIds.indexOf(id);
    PROPERTY_COLORS[id] = COLORS[idx % COLORS.length];
  }
  return PROPERTY_COLORS[id];
}

export default function CalendarPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [view, setView] = useState<ViewMode>('multi');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [multiStart, setMultiStart] = useState(today);
  const [monthDate, setMonthDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [rates, setRates] = useState<Record<string, Rate[]>>({});
  const [ratesLoading, setRatesLoading] = useState(false);

  const MULTI_DAYS = 14;

  useEffect(() => {
    fetch('/api/bookings?orgId=default')
      .then(r => r.json())
      .then(data => {
        const bkgs: Booking[] = data.bookings ?? [];
        setBookings(bkgs);
        const propMap = new Map<string, Property>();
        bkgs.forEach(b => propMap.set(b.property.id, b.property));
        setProperties(Array.from(propMap.values()));
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchRates = useCallback(async (propIds: string[], startDate: Date, endDate: Date) => {
    setRatesLoading(true);
    const start = toDateStr(startDate);
    const end = toDateStr(endDate);
    const newRates: Record<string, Rate[]> = { ...rates };
    await Promise.all(
      propIds.map(async (pid) => {
        try {
          const res = await fetch(`/api/hostaway/rates?orgId=default&propertyId=${pid}&startDate=${start}&endDate=${end}`);
          const data = await res.json();
          newRates[pid] = data.rates ?? [];
        } catch { /* skip */ }
      })
    );
    setRates(newRates);
    setRatesLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch rates when view/dates change
  useEffect(() => {
    if (properties.length === 0) return;
    const propIds = selectedPropertyId === 'all' ? properties.map(p => p.id) : [selectedPropertyId];
    if (view === 'multi') {
      fetchRates(propIds, multiStart, addDays(multiStart, MULTI_DAYS));
    } else {
      const start = new Date(monthDate.year, monthDate.month, 1);
      const end = new Date(monthDate.year, monthDate.month + 1, 0);
      fetchRates(propIds, start, end);
    }
  }, [view, multiStart, monthDate, properties, selectedPropertyId, fetchRates]);

  const getRateForDate = (propertyId: string, dateStr: string): Rate | null => {
    return rates[propertyId]?.find(r => r.date === dateStr) ?? null;
  };

  const getBookingsForCell = (propertyId: string, dateStr: string) => {
    return bookings.filter(b => {
      if (b.property.id !== propertyId) return false;
      if (b.status === 'CANCELLED') return false;
      const ci = toDateStr(new Date(b.checkIn));
      const co = toDateStr(new Date(b.checkOut));
      return dateStr >= ci && dateStr <= co;
    });
  };

  const allPropertyIds = properties.map(p => p.id);

  // ── MULTI VIEW ────────────────────────────────────────────────
  const renderMultiView = () => {
    const days = Array.from({ length: MULTI_DAYS }, (_, i) => addDays(multiStart, i));
    const visibleProps = selectedPropertyId === 'all'
      ? properties
      : properties.filter(p => p.id === selectedPropertyId);

    return (
      <div className="bg-white rounded-[10px] border border-gray-200 overflow-hidden" style={{ boxShadow: 'var(--shadow)' }}>
        {/* Header nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button onClick={() => setMultiStart(s => addDays(s, -7))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-navy text-sm">
              {days[0].toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' – '}
              {days[days.length - 1].toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={() => setMultiStart(today)}
              className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
            >
              Today
            </button>
            {ratesLoading && <RefreshCw size={14} className="animate-spin text-gray-400" />}
          </div>
          <button onClick={() => setMultiStart(s => addDays(s, 7))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: `${200 + MULTI_DAYS * 80}px` }}>
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-[200px] min-w-[200px] px-4 py-2 text-left text-xs font-semibold text-gray-500 bg-gray-50 border-r border-gray-100">
                  Property
                </th>
                {days.map(d => {
                  const isToday = toDateStr(d) === toDateStr(today);
                  return (
                    <th key={toDateStr(d)} className={`w-20 px-1 py-2 text-center border-r border-gray-50 last:border-r-0 ${isToday ? 'bg-blue/5' : 'bg-gray-50'}`}>
                      <div className={`text-[10px] font-medium ${isToday ? 'text-blue' : 'text-gray-400'}`}>
                        {DAYS_SHORT[d.getDay()]}
                      </div>
                      <div className={`text-xs font-bold ${isToday ? 'text-blue' : 'text-gray-700'}`}>
                        {d.getDate()}
                      </div>
                      <div className="text-[9px] text-gray-400">{MONTHS[d.getMonth()].slice(0,3)}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleProps.map(prop => (
                <tr key={prop.id} className="border-b border-gray-50 hover:bg-gray-50/30">
                  <td className="px-4 py-2 border-r border-gray-100 bg-white">
                    <div className="font-medium text-xs text-navy truncate max-w-[180px]">{prop.unitNumber ?? prop.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{prop.id}</div>
                  </td>
                  {days.map(d => {
                    const dateStr = toDateStr(d);
                    const cellBookings = getBookingsForCell(prop.id, dateStr);
                    const rate = getRateForDate(prop.id, dateStr);
                    const isToday = dateStr === toDateStr(today);
                    const booking = cellBookings[0];

                    if (booking) {
                      const checkInStr = toDateStr(new Date(booking.checkIn));
                      const isCheckIn = dateStr === checkInStr;
                      const isCheckOut = dateStr === toDateStr(new Date(booking.checkOut));
                      const color = getColor(prop.id, allPropertyIds);
                      return (
                        <td key={dateStr} className={`px-0 py-1 border-r border-gray-50 last:border-r-0 align-middle ${isToday ? 'bg-blue/5' : ''}`}
                          style={{ height: '52px' }}>
                          <div
                            className="mx-0 h-7 flex items-center px-1.5 relative overflow-hidden"
                            style={{
                              backgroundColor: color,
                              borderRadius: isCheckIn ? '6px 0 0 6px' : isCheckOut ? '0 6px 6px 0' : '0',
                              marginLeft: isCheckIn ? '2px' : '0',
                              marginRight: isCheckOut ? '2px' : '0',
                            }}
                          >
                            {isCheckIn && (
                              <span className="text-white text-[10px] font-medium truncate whitespace-nowrap">
                                {booking.guestName.split(' ')[0]} · {booking.adults}g
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={dateStr} className={`px-1 py-1 border-r border-gray-50 last:border-r-0 text-center align-middle ${isToday ? 'bg-blue/5' : ''}`}
                        style={{ height: '52px' }}>
                        {rate?.price ? (
                          <div className="text-[10px] text-gray-500 font-medium">
                            ZAR {Number(rate.price).toLocaleString()}
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-200">—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── MONTHLY VIEW ──────────────────────────────────────────────
  const renderMonthlyView = () => {
    const { year, month } = monthDate;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

    const filteredProp = properties.find(p => p.id === selectedPropertyId);
    const propId = filteredProp?.id;

    return (
      <div className="bg-white rounded-[10px] border border-gray-200 overflow-hidden" style={{ boxShadow: 'var(--shadow)' }}>
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <button onClick={() => setMonthDate(d => d.month === 0 ? { year: d.year - 1, month: 11 } : { ...d, month: d.month - 1 })}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-navy text-base">{MONTHS[month]} {year}</h2>
            <button
              onClick={() => setMonthDate({ year: today.getFullYear(), month: today.getMonth() })}
              className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
            >
              Today
            </button>
            {ratesLoading && <RefreshCw size={14} className="animate-spin text-gray-400" />}
          </div>
          <button onClick={() => setMonthDate(d => d.month === 11 ? { year: d.year + 1, month: 0 } : { ...d, month: d.month + 1 })}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS_SHORT.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
            const cellBookings = day && propId ? getBookingsForCell(propId, dateStr) : [];
            const rate = propId ? getRateForDate(propId, dateStr) : null;

            return (
              <div key={i} className={`min-h-[90px] border-r border-b border-gray-50 p-1.5 last:border-r-0 ${isToday ? 'bg-blue/5' : ''}`}>
                {day && (
                  <>
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1 ${isToday ? 'bg-blue text-white' : 'text-gray-600'}`}>
                      {day}
                    </span>
                    <div className="space-y-0.5 mb-1">
                      {cellBookings.slice(0, 2).map((b) => {
                        const ci = toDateStr(new Date(b.checkIn));
                        const co = toDateStr(new Date(b.checkOut));
                        const isCI = dateStr === ci;
                        const isCO = dateStr === co;
                        const color = getColor(b.property.id, allPropertyIds);
                        return (
                          <div
                            key={b.id}
                            className="text-[10px] font-medium px-1.5 py-0.5 truncate text-white"
                            style={{
                              backgroundColor: color,
                              borderRadius: isCI ? '4px 0 0 4px' : isCO ? '0 4px 4px 0' : '0',
                            }}
                            title={`${b.guestName} · ${b.adults} guests`}
                          >
                            {isCI ? `▶ ${b.guestName.split(' ')[0]} · ${b.adults}g` : (isCO ? '◀ Check-out' : '— Occupied')}
                          </div>
                        );
                      })}
                    </div>
                    {rate?.price && (
                      <div className="text-[10px] text-gray-500 font-medium">{formatZAR(rate.price)}</div>
                    )}
                    {rate && !rate.isAvailable && cellBookings.length === 0 && (
                      <div className="text-[10px] text-red-400">Blocked</div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-var(--topbar-h))] text-gray-400">
      <RefreshCw size={20} className="animate-spin mr-2" /> Loading calendar...
    </div>
  );

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center">
            <CalendarDays size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">Booking Calendar</h1>
            <p className="text-sm text-gray-500">
              {bookings.filter(b => b.status !== 'CANCELLED').length} active bookings · {properties.length} properties
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setView('multi')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'multi' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Multi
            </button>
            <button
              onClick={() => setView('monthly')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'monthly' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Monthly
            </button>
          </div>

          {/* Property filter */}
          <select
            value={selectedPropertyId}
            onChange={e => setSelectedPropertyId(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-navy bg-white focus:outline-none focus:ring-2 focus:ring-blue/20"
          >
            <option value="all">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.unitNumber ?? p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {view === 'multi' ? renderMultiView() : renderMonthlyView()}

      {/* Legend */}
      {properties.length > 0 && (
        <div className="bg-white rounded-[10px] border border-gray-200 px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2" style={{ boxShadow: 'var(--shadow)' }}>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Properties</span>
          {properties.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: getColor(p.id, allPropertyIds) }} />
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
    </div>
  );
}
