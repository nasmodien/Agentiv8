'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, ChevronDown, Check, TrendingUp, DollarSign, Calendar } from 'lucide-react';

interface Property { id: string; name: string; unitNumber: string | null }
interface Summary {
  grossRevenue: number; netRevenue: number; cleaningFees: number; otaFees: number;
  taxes: number; hostServiceFees: number; totalDeductions: number;
  totalBookings: number; totalNights: number; adr: number; revPAR: number;
  occupancyRate: number; avgStayLength: number; hasFinancials: boolean;
}
interface ChannelStat { channel: string; count: number; gross: number; net: number; pct: number }
interface PropertyStat { id: string; name: string; unitNumber: string | null; gross: number; net: number; bookings: number; nights: number; cleaning: number; otaFees: number }
interface MonthlyPoint { month: string; gross: number; net: number; bookings: number }
interface ForecastPoint { month: string; bookings: number; nights: number; projectedRevenue: number; projectedGross: number; occupancy: number }
interface AnalyticsData {
  summary: Summary; channels: ChannelStat[]; propertyStats: PropertyStat[];
  monthlyRevenue: MonthlyPoint[]; forecast: ForecastPoint[]; properties: Property[];
}

const ZAR = (n: number) => `ZAR ${Math.round(n).toLocaleString('en-ZA')}`;
const CHANNEL_COLORS: Record<string, string> = {
  AIRBNB: '#ff5a5f', BOOKING_COM: '#003580', DIRECT: '#2563eb', WHATSAPP: '#25d366', SMS: '#6b7280',
};
const BAR_COLORS = ['#2563eb','#16a34a','#ea580c','#7c3aed','#be185d','#0891b2'];

function toInputDate(d: Date) { return d.toISOString().split('T')[0]; }

function StatCard({ label, value, sub, color = 'text-navy', hint }: { label: string; value: string; sub?: string; color?: string; hint?: string }) {
  return (
    <div className="bg-white rounded-[10px] p-4" style={{ boxShadow: 'var(--shadow)' }}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {hint && <p className="text-[10px] text-amber-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function BarChart({ data, useGross }: { data: MonthlyPoint[]; useGross: boolean }) {
  const key = useGross ? 'gross' : 'net';
  const vals = data.map(d => d[key] > 0 ? d[key] : d.bookings);
  const max = Math.max(...vals, 1);
  const usesRevenue = data.some(d => d.gross > 0 || d.net > 0);
  return (
    <div className="mt-4">
      <div className="flex items-end gap-1" style={{ height: '100px' }}>
        {data.map((d, i) => {
          const val = usesRevenue ? d[key] : d.bookings;
          const h = val > 0 ? Math.max((val / max) * 100, 4) : 0;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end group relative" style={{ height: '100px' }}>
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-navy text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                {usesRevenue ? ZAR(d[key]) : `${d.bookings} bkgs`}{d.bookings > 0 ? ` · ${d.bookings}bkgs` : ''}
              </div>
              <div className="w-full rounded-t bg-blue hover:bg-blue-light transition-colors"
                style={{ height: `${h}%` }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[9px] text-gray-400">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: ChannelStat[] }) {
  const r = 40; const cx = 60; const cy = 60;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const total = data.reduce((s, d) => s + d.count, 0);
  const segments = data.map(d => {
    const fraction = total > 0 ? d.count / total : 0;
    const dashArray = `${fraction * circumference} ${circumference}`;
    const rotate = offset * 360 - 90;
    offset += fraction;
    return { ...d, dashArray, rotate, displayPct: Math.round(fraction * 100) };
  });
  return (
    <div className="flex items-center gap-4 mt-3">
      <svg width="110" height="110" viewBox="0 0 120 120" className="flex-shrink-0">
        {segments.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={CHANNEL_COLORS[s.channel] ?? '#9ca3af'}
            strokeWidth="18" strokeDasharray={s.dashArray}
            transform={`rotate(${s.rotate} ${cx} ${cy})`} />
        ))}
        <circle cx={cx} cy={cy} r="28" fill="white" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e2a4a">{total}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill="#9ca3af">bookings</text>
      </svg>
      <div className="space-y-1.5 flex-1 min-w-0">
        {segments.map(s => (
          <div key={s.channel} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CHANNEL_COLORS[s.channel] ?? '#9ca3af' }} />
            <span className="text-xs text-gray-600 truncate flex-1">{s.channel.replace('_', '.')}</span>
            <span className="text-xs font-semibold text-navy">{s.displayPct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PropertyFilter({ properties, selected, onChange }: {
  properties: Property[]; selected: string[]; onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  const isAll = selected.length === 0;
  const label = isAll ? 'All Properties' : selected.length === 1
    ? (properties.find(p => p.id === selected[0])?.unitNumber ?? properties.find(p => p.id === selected[0])?.name ?? '1 property')
    : `${selected.length} properties`;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-navy bg-white hover:bg-gray-50 min-w-[160px] justify-between">
        <span className="truncate">{label}</span>
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[220px] max-h-72 overflow-y-auto">
          <button onClick={() => onChange([])} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-navy">
            <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isAll ? 'bg-blue border-blue' : 'border-gray-300'}`}>
              {isAll && <Check size={10} className="text-white" />}
            </span>
            All Properties
          </button>
          {properties.map(p => {
            const checked = selected.includes(p.id);
            return (
              <button key={p.id} onClick={() => toggle(p.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-blue border-blue' : 'border-gray-300'}`}>
                  {checked && <Check size={10} className="text-white" />}
                </span>
                <span className="truncate text-navy">{p.unitNumber ?? p.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [showGross, setShowGross] = useState(true);

  const defaultEnd = new Date();
  const defaultStart = new Date(); defaultStart.setMonth(defaultStart.getMonth() - 3);
  const [startDate, setStartDate] = useState(toInputDate(defaultStart));
  const [endDate, setEndDate] = useState(toInputDate(defaultEnd));

  const fetchAnalytics = async (propIds: string[], start: string, end: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ orgId: 'default', startDate: start, endDate: end });
      propIds.forEach(id => params.append('propertyId', id));
      const res = await fetch(`/api/analytics?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (err) {
      console.error('Analytics error:', err);
      setData(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAnalytics(selectedProperties, startDate, endDate); }, [selectedProperties, startDate, endDate]);

  const s = data?.summary;

  const PRESETS = [
    { label: '1M', months: 1 }, { label: '3M', months: 3 },
    { label: '6M', months: 6 }, { label: '1Y', months: 12 }, { label: '2Y', months: 24 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500">{s ? `${s.totalBookings} bookings` : '...'} · {startDate} → {endDate}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESETS.map(p => {
            const s2 = new Date(); s2.setMonth(s2.getMonth() - p.months);
            const active = startDate === toInputDate(s2) && endDate === toInputDate(new Date());
            return (
              <button key={p.label} onClick={() => { setStartDate(toInputDate(s2)); setEndDate(toInputDate(new Date())); }}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${active ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {p.label}
              </button>
            );
          })}
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
            <span className="text-xs text-gray-400">From</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-xs text-navy bg-transparent focus:outline-none" />
            <span className="text-xs text-gray-400">To</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-xs text-navy bg-transparent focus:outline-none" />
          </div>
          {data && <PropertyFilter properties={data.properties} selected={selectedProperties} onChange={setSelectedProperties} />}
          <button className="flex items-center gap-2 px-3 py-1.5 bg-navy text-white text-sm font-medium rounded-lg hover:opacity-90">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-16 text-gray-400"><RefreshCw size={20} className="animate-spin mr-2" /> Loading...</div>}

      {!loading && !data && (
        <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-6 text-center">
          <p className="text-amber-800 font-medium mb-2">Database migration required</p>
          <code className="block mt-3 bg-white border border-amber-200 rounded px-4 py-2 text-sm font-mono">
            ALTER TABLE &quot;Booking&quot; ADD COLUMN IF NOT EXISTS &quot;totalPrice&quot; DOUBLE PRECISION;
          </code>
        </div>
      )}

      {!loading && data && s && (
        <>
          {/* Revenue toggle */}
          {s.hasFinancials && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Show:</span>
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => setShowGross(true)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${showGross ? 'bg-white text-navy shadow-sm' : 'text-gray-500'}`}>Gross Revenue</button>
                <button onClick={() => setShowGross(false)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${!showGross ? 'bg-white text-navy shadow-sm' : 'text-gray-500'}`}>Net Revenue</button>
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {s.hasFinancials ? (
              <>
                <StatCard label="Gross Revenue" value={ZAR(s.grossRevenue)} sub="Total guest payments" color="text-blue" />
                <StatCard label="Net Revenue (Host)" value={ZAR(s.netRevenue)} sub="After all deductions" color="text-green" />
                <StatCard label="Total Deductions" value={ZAR(s.totalDeductions)} sub="Fees, OTA, taxes" color="text-red" />
                <StatCard label="Avg Daily Rate" value={ZAR(s.adr)} sub={`RevPAR: ${ZAR(s.revPAR)}`} />
              </>
            ) : (
              <>
                <StatCard label="Total Bookings" value={String(s.totalBookings)} color="text-blue" />
                <StatCard label="Total Nights" value={String(s.totalNights)} />
                <StatCard label="Avg Stay" value={`${s.avgStayLength} nights`} />
                <StatCard label="Occupancy Rate" value={`${s.occupancyRate}%`} color={s.occupancyRate > 70 ? 'text-green' : 'text-orange'} hint="Sync for revenue data" />
              </>
            )}
          </div>

          {/* Secondary cards */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <StatCard label="Total Bookings" value={String(s.totalBookings)} />
            <StatCard label="Total Nights" value={String(s.totalNights)} />
            <StatCard label="Occupancy" value={`${s.occupancyRate}%`} color={s.occupancyRate > 70 ? 'text-green' : 'text-navy'} />
            <StatCard label="Avg Stay" value={`${s.avgStayLength}n`} />
            <StatCard label="ADR" value={s.hasFinancials ? ZAR(s.adr) : '—'} />
            <StatCard label="RevPAR" value={s.hasFinancials ? ZAR(s.revPAR) : '—'} />
          </div>

          {/* Deductions breakdown */}
          {s.hasFinancials && s.totalDeductions > 0 && (
            <div className="bg-white rounded-[10px] p-5" style={{ boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={16} className="text-red" />
                <h2 className="text-sm font-semibold text-navy">Revenue Breakdown & Deductions</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                  { label: 'Gross Revenue', value: s.grossRevenue, color: 'text-blue', bg: 'bg-blue/5' },
                  { label: 'OTA/Platform Fees', value: -s.otaFees, color: 'text-red', bg: 'bg-red/5' },
                  { label: 'Taxes (VAT etc.)', value: -s.taxes, color: 'text-orange', bg: 'bg-orange/5' },
                  { label: 'Host Service Fees', value: -s.hostServiceFees, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map(item => (
                  <div key={item.label} className={`rounded-lg p-3 ${item.bg}`}>
                    <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                    <p className={`text-base font-bold ${item.color}`}>
                      {item.value >= 0 ? '' : '−'}{ZAR(Math.abs(item.value))}
                    </p>
                  </div>
                ))}
              </div>
              {/* Waterfall visual */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                {[
                  { label: 'Gross Revenue', value: s.grossRevenue, cumulative: s.grossRevenue },
                  { label: '− OTA/Platform Fees', value: s.otaFees, cumulative: s.grossRevenue - s.otaFees, deduction: true },
                  { label: '− Taxes & VAT', value: s.taxes, cumulative: s.grossRevenue - s.otaFees - s.taxes, deduction: true },
                  { label: '− Host Service Fees', value: s.hostServiceFees, cumulative: s.netRevenue, deduction: true },
                  { label: '= Net Revenue (Host Payout)', value: s.netRevenue, cumulative: s.netRevenue, net: true },
                ].map((row, i) => (
                  <div key={i} className={`flex justify-between items-center text-sm py-1.5 ${row.net ? 'border-t-2 border-gray-300 font-bold' : ''}`}>
                    <span className={row.deduction ? 'text-red text-xs' : row.net ? 'text-navy font-semibold' : 'text-gray-600 text-xs'}>{row.label}</span>
                    <span className={row.deduction ? 'text-red text-xs' : row.net ? 'text-green font-bold' : 'text-blue text-xs font-medium'}>
                      {row.deduction ? `−${ZAR(row.value)}` : ZAR(row.value)}
                    </span>
                  </div>
                ))}
                {s.cleaningFees > 0 && (
                  <div className="flex justify-between items-center text-xs text-gray-500 pt-1 border-t border-dashed border-gray-200">
                    <span>Cleaning Fees (charged to guests)</span>
                    <span>{ZAR(s.cleaningFees)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-[10px] p-5" style={{ boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-navy">{s.hasFinancials ? (showGross ? 'Gross Revenue by Month' : 'Net Revenue by Month') : 'Bookings by Month'}</h2>
              </div>
              <p className="text-xs text-gray-400">{s.hasFinancials ? 'ZAR revenue per month' : 'Booking count (sync for revenue)'}</p>
              <BarChart data={data.monthlyRevenue} useGross={showGross} />
            </div>

            <div className="bg-white rounded-[10px] p-5" style={{ boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-blue" />
                <h2 className="text-sm font-semibold text-navy">Booking Sources</h2>
              </div>
              <DonutChart data={data.channels} />
              {s.hasFinancials && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                  {data.channels.map(c => (
                    <div key={c.channel} className="flex justify-between text-xs">
                      <span className="text-gray-500">{c.channel.replace('_', '.')}</span>
                      <div className="text-right">
                        <span className="font-semibold text-navy">{ZAR(showGross ? c.gross : c.net)}</span>
                        <span className="text-gray-400 ml-2">({c.count} bkgs)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Per-property breakdown */}
          <div className="bg-white rounded-[10px] p-5" style={{ boxShadow: 'var(--shadow)' }}>
            <h2 className="text-sm font-semibold text-navy mb-4">{s.hasFinancials ? 'Revenue per Property' : 'Bookings per Property'}</h2>
            <div className="space-y-4">
              {data.propertyStats.map((p, i) => {
                const displayVal = s.hasFinancials ? (showGross ? p.gross : p.net) : p.bookings;
                const maxVal = s.hasFinancials ? (showGross ? data.propertyStats[0]?.gross : data.propertyStats[0]?.net) : data.propertyStats[0]?.bookings;
                const pct = (maxVal ?? 0) > 0 ? ((displayVal) / (maxVal ?? 1)) * 100 : 0;
                return (
                  <div key={p.id}>
                    <div className="flex justify-between text-xs mb-1 flex-wrap gap-1">
                      <span className="text-gray-700 font-medium truncate max-w-[180px]">{p.unitNumber ?? p.name}</span>
                      <div className="flex items-center gap-3 text-gray-400 flex-shrink-0">
                        {s.hasFinancials && p.gross > 0 && (
                          <>
                            <span>Gross: {ZAR(p.gross)}</span>
                            {p.otaFees > 0 && <span className="text-red">OTA: −{ZAR(p.otaFees)}</span>}
                            {p.cleaning > 0 && <span>Clean: {ZAR(p.cleaning)}</span>}
                          </>
                        )}
                        <span>{p.bookings} bkgs · {p.nights}n</span>
                        <span className="font-semibold text-navy">{s.hasFinancials ? ZAR(showGross ? p.gross : p.net) : `${p.bookings}`}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Forecast */}
          <div className="bg-white rounded-[10px] p-5" style={{ boxShadow: 'var(--shadow)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-blue" />
              <h2 className="text-sm font-semibold text-navy">12-Month Forecast</h2>
              <span className="text-xs text-gray-400 ml-1">Confirmed future bookings</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {data.forecast.map((f, i) => (
                <div key={i} className={`rounded-lg p-3 border ${i === 0 ? 'border-blue bg-blue/5' : 'border-gray-100 bg-gray-50'}`}>
                  <p className="text-xs font-semibold text-navy mb-2">{f.month}</p>
                  <p className="text-lg font-bold text-navy">{f.bookings}</p>
                  <p className="text-[10px] text-gray-400 mb-1">bookings · {f.nights}n</p>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-blue rounded-full" style={{ width: `${f.occupancy}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-500">{f.occupancy}% occ.</p>
                  {f.projectedRevenue > 0 && (
                    <p className="text-[10px] font-medium text-green mt-1">{ZAR(f.projectedRevenue)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
