'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, TrendingUp, BarChart2, RefreshCw, ChevronDown, Check } from 'lucide-react';

interface Property { id: string; name: string; unitNumber: string | null }
interface Summary {
  totalRevenue: number; totalBookings: number; totalNights: number;
  avgDailyRate: number; occupancyRate: number; avgStayLength: number;
}
interface ChannelStat { channel: string; count: number; revenue: number; pct: number }
interface PropertyStat { id: string; name: string; unitNumber: string | null; revenue: number; bookings: number; nights: number }
interface MonthlyPoint { month: string; revenue: number; bookings: number }
interface AnalyticsData {
  summary: Summary; channels: ChannelStat[]; propertyStats: PropertyStat[];
  monthlyRevenue: MonthlyPoint[]; properties: Property[];
}

const ZAR = (n: number) => `ZAR ${Math.round(n).toLocaleString('en-ZA')}`;
const CHANNEL_COLORS: Record<string, string> = {
  AIRBNB: '#ff5a5f', BOOKING_COM: '#003580', DIRECT: '#2563eb', WHATSAPP: '#25d366', SMS: '#6b7280',
};

function StatCard({ label, value, sub, color = 'text-navy' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-[10px] p-5" style={{ boxShadow: 'var(--shadow)' }}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarChart({ data }: { data: MonthlyPoint[] }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div className="flex items-end gap-1 h-28 mt-4">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-navy text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
            {d.revenue > 0 ? ZAR(d.revenue) : `${d.bookings} bookings`}
          </div>
          <div className="w-full rounded-t-sm transition-all bg-blue hover:bg-blue-light"
            style={{ height: `${Math.max((d.revenue / max) * 100, d.bookings > 0 ? 5 : 0)}%`, minHeight: d.bookings > 0 ? '3px' : '0' }} />
          <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }: { data: ChannelStat[] }) {
  const r = 40; const cx = 60; const cy = 60;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const total = data.reduce((s, d) => s + d.count, 0);
  const segments = data.map(d => {
    const pct = total > 0 ? d.count / total : 0;
    const dashArray = `${pct * circumference} ${circumference}`;
    const rotate = offset * 360 - 90;
    offset += pct;
    return { ...d, pct, dashArray, rotate };
  });
  return (
    <div className="flex items-center gap-5 mt-3">
      <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
        {segments.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={CHANNEL_COLORS[s.channel] ?? '#9ca3af'}
            strokeWidth="18" strokeDasharray={s.dashArray}
            transform={`rotate(${s.rotate} ${cx} ${cy})`} />
        ))}
        <circle cx={cx} cy={cy} r="28" fill="white" />
        <text x={cx} y={cy - 4} textAnchor="middle" className="text-xs" fontSize="11" fontWeight="bold" fill="#1e2a4a">{total}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill="#9ca3af">bookings</text>
      </svg>
      <div className="space-y-1.5 flex-1 min-w-0">
        {segments.map(s => (
          <div key={s.channel} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CHANNEL_COLORS[s.channel] ?? '#9ca3af' }} />
            <span className="text-xs text-gray-600 truncate flex-1">{s.channel.replace('_', '.')}</span>
            <span className="text-xs font-semibold text-navy">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Multi-select property dropdown
function PropertyFilter({ properties, selected, onChange }: {
  properties: Property[]; selected: string[]; onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };
  const isAll = selected.length === 0;
  const label = isAll ? 'All Properties' : selected.length === 1
    ? (properties.find(p => p.id === selected[0])?.unitNumber ?? properties.find(p => p.id === selected[0])?.name ?? '1 property')
    : `${selected.length} properties`;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-navy bg-white hover:bg-gray-50 min-w-[180px] justify-between">
        <span className="truncate">{label}</span>
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[220px] max-h-72 overflow-y-auto">
          <button onClick={() => onChange([])}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-navy">
            <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isAll ? 'bg-blue border-blue' : 'border-gray-300'}`}>
              {isAll && <Check size={10} className="text-white" />}
            </span>
            All Properties
          </button>
          {properties.map(p => {
            const checked = selected.includes(p.id);
            return (
              <button key={p.id} onClick={() => toggle(p.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left">
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
  const [period, setPeriod] = useState('12');

  const fetchAnalytics = async (propIds: string[], p: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ orgId: 'default', period: p });
      propIds.forEach(id => params.append('propertyId', id));
      const res = await fetch(`/api/analytics?${params}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(selectedProperties, period); }, [selectedProperties, period]);

  const s = data?.summary;
  const hasRevenue = (s?.totalRevenue ?? 0) > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500">
            {data ? `${data.summary.totalBookings} bookings` : 'Loading...'} · Last {period} months
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={period} onChange={e => setPeriod(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-navy bg-white focus:outline-none">
            <option value="3">Last 3 months</option>
            <option value="6">Last 6 months</option>
            <option value="12">Last 12 months</option>
            <option value="24">Last 24 months</option>
          </select>
          {data && (
            <PropertyFilter
              properties={data.properties}
              selected={selectedProperties}
              onChange={setSelectedProperties}
            />
          )}
          <button className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:opacity-90">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw size={20} className="animate-spin mr-2" /> Loading analytics...
        </div>
      )}

      {!loading && !data && (
        <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-6 text-center">
          <p className="text-amber-800 font-medium mb-2">Database migration required</p>
          <p className="text-amber-700 text-sm">Run this SQL in your Neon dashboard, then reload:</p>
          <code className="block mt-3 bg-white border border-amber-200 rounded px-4 py-2 text-sm font-mono text-gray-800">
            ALTER TABLE &quot;Booking&quot; ADD COLUMN IF NOT EXISTS &quot;totalPrice&quot; DOUBLE PRECISION;
          </code>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Total Revenue" value={hasRevenue ? ZAR(data.summary.totalRevenue) : '—'} sub={hasRevenue ? undefined : 'Sync to get prices'} color="text-blue" />
            <StatCard label="Total Bookings" value={String(data.summary.totalBookings)} />
            <StatCard label="Occupancy Rate" value={`${data.summary.occupancyRate}%`} />
            <StatCard label="Total Nights" value={String(data.summary.totalNights)} />
            <StatCard label="Avg Stay" value={`${data.summary.avgStayLength}n`} />
            <StatCard label="Avg Daily Rate" value={hasRevenue ? ZAR(data.summary.avgDailyRate) : '—'} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Monthly Revenue */}
            <div className="bg-white rounded-[10px] p-5" style={{ boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 size={16} className="text-blue" />
                <h2 className="text-sm font-semibold text-navy">{hasRevenue ? 'Monthly Revenue' : 'Monthly Bookings'}</h2>
              </div>
              <p className="text-xs text-gray-400">{hasRevenue ? 'ZAR revenue by month' : 'Booking count by month (sync reservations for revenue)'}</p>
              <BarChart data={data.monthlyRevenue} />
            </div>

            {/* Booking Sources */}
            <div className="bg-white rounded-[10px] p-5" style={{ boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-blue" />
                <h2 className="text-sm font-semibold text-navy">Booking Sources</h2>
              </div>
              <p className="text-xs text-gray-400">Channel distribution</p>
              <DonutChart data={data.channels} />
              {hasRevenue && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                  {data.channels.map(c => (
                    <div key={c.channel} className="flex justify-between text-xs">
                      <span className="text-gray-500">{c.channel.replace('_', '.')}</span>
                      <span className="font-semibold text-navy">{ZAR(c.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revenue per Property */}
            <div className="bg-white rounded-[10px] p-5 col-span-2" style={{ boxShadow: 'var(--shadow)' }}>
              <h2 className="text-sm font-semibold text-navy mb-4">
                {hasRevenue ? 'Revenue per Property' : 'Bookings per Property'}
              </h2>
              <div className="space-y-3">
                {data.propertyStats.map((p, i) => {
                  const maxVal = data.propertyStats[0]?.[hasRevenue ? 'revenue' : 'bookings'] ?? 1;
                  const val = hasRevenue ? p.revenue : p.bookings;
                  const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                  const colors = ['bg-blue', 'bg-green', 'bg-orange', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500'];
                  return (
                    <div key={p.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 truncate max-w-[200px]">{p.unitNumber ?? p.name}</span>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="text-gray-400">{p.bookings} bookings · {p.nights}n</span>
                          <span className="font-semibold text-navy">{hasRevenue ? ZAR(p.revenue) : `${p.bookings} bkgs`}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {!hasRevenue && (
                <p className="text-xs text-amber-600 mt-4 bg-amber-50 px-3 py-2 rounded-lg">
                  💡 Revenue data will appear after you click <strong>Sync from Hostaway</strong> on the Properties page — this pulls pricing from your reservations.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
