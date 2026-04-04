'use client';

import { useState, useEffect } from 'react';
import { Bell, User, ChevronDown } from 'lucide-react';

interface Property { id: string; name: string; unitNumber: string | null }
interface Stats { totalProperties: number; bookedProperties: number; checkInsToday: number; escalations: number }

export function Topbar() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selected, setSelected] = useState<Property | null>(null);
  const [stats, setStats] = useState<Stats>({ totalProperties: 0, bookedProperties: 0, checkInsToday: 0, escalations: 0 });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/properties?orgId=default')
      .then(r => r.json())
      .then(data => {
        const props: Property[] = data.properties ?? [];
        setProperties(props);
        if (props.length > 0 && !selected) setSelected(props[0]);
        const today = new Date().toISOString().split('T')[0];
        let booked = 0; let checkIns = 0;
        for (const p of props) {
          for (const b of (p as unknown as { bookings?: { checkIn: string; status: string }[] }).bookings ?? []) {
            if (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') booked++;
            if (new Date(b.checkIn).toISOString().split('T')[0] === today) checkIns++;
          }
        }
        fetch('/api/messages').then(r => r.json()).then(d => {
          const escalations = (d.conversations ?? []).filter((c: { status: string }) => c.status === 'ESCALATED').length;
          setStats({ totalProperties: props.length, bookedProperties: booked, checkInsToday: checkIns, escalations });
        }).catch(() => setStats({ totalProperties: props.length, bookedProperties: booked, checkInsToday: checkIns, escalations: 0 }));
      }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const displayName = selected ? (selected.unitNumber ?? selected.name) : 'Select Property';

  return (
    <>
      <header
        className="fixed top-0 right-0 z-30 flex items-center bg-white border-b border-gray-200 px-3 md:px-6"
        style={{ left: 0, height: 'var(--topbar-h)' }}
      >
        {/* Mobile: Logo */}
        <div className="flex md:hidden items-center gap-2 mr-3" style={{ marginLeft: 0 }}>
          <div className="w-7 h-7 rounded-lg bg-[#1a2744] flex items-center justify-center flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="3" fill="white" />
              <path d="M9 1.5v1.5M9 15v1.5M1.5 9H3M15 9h1.5M3.697 3.697l1.06 1.06M13.243 13.243l1.06 1.06M3.697 14.303l1.06-1.06M13.243 4.757l1.06-1.06" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold text-[#1a2744] tracking-tight">
            Agenti<span className="text-blue-500">v8</span>
          </span>
        </div>

        {/* Desktop offset for sidebar */}
        <div className="hidden md:block" style={{ width: 'var(--sidebar-w)' }} />

        {/* Property selector */}
        <div className="relative flex-1 md:flex-none">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs md:text-sm font-medium text-navy hover:bg-gray-100 transition-colors max-w-[160px] md:max-w-none"
          >
            <span className="w-2 h-2 rounded-full bg-green flex-shrink-0" />
            <span className="truncate">{displayName}</span>
            <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[220px] z-50 max-h-64 overflow-y-auto">
              {properties.map(p => (
                <button key={p.id} onClick={() => { setSelected(p); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-navy">
                  {p.unitNumber ?? p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats — desktop only */}
        <div className="hidden md:flex items-center gap-6 mx-6">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-gray-500">Properties Booked:</span>
            <span className="text-sm font-semibold text-navy">{stats.bookedProperties} / {stats.totalProperties}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-gray-500">Check-Ins Today:</span>
            <span className="text-sm font-semibold text-blue">{stats.checkInsToday}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-gray-500">Escalations:</span>
            <span className="text-sm font-semibold text-orange">{stats.escalations}</span>
          </div>
        </div>

        {/* Mobile stats — compact */}
        <div className="flex md:hidden items-center gap-3 mx-2 text-xs text-gray-500">
          {stats.checkInsToday > 0 && (
            <span className="font-semibold text-blue">{stats.checkInsToday} check-in{stats.checkInsToday > 1 ? 's' : ''}</span>
          )}
          {stats.escalations > 0 && (
            <span className="font-semibold text-red">{stats.escalations} escalation{stats.escalations > 1 ? 's' : ''}</span>
          )}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <Bell size={18} className="text-gray-600" />
            {stats.escalations > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red border-2 border-white" />
            )}
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
          </button>
        </div>
      </header>

      {/* Mobile property sheet backdrop */}
      {open && (
        <div className="fixed inset-0 z-20 md:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
