'use client';

import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function StatCard({
  label,
  value,
  trend,
  trendValue,
  color,
}: {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-[10px] p-5" style={{ boxShadow: 'var(--shadow)' }}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {trend && trendValue && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium mb-0.5 ${
              trend === 'up' ? 'text-green' : trend === 'down' ? 'text-red' : 'text-gray-400'
            }`}
          >
            {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : <Minus size={12} />}
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

// Simple bar chart using divs
function BarChart() {
  const data = [
    { month: 'Jan', value: 60 },
    { month: 'Feb', value: 75 },
    { month: 'Mar', value: 85 },
    { month: 'Apr', value: 100 },
  ];
  const max = Math.max(...data.map((d) => d.value));

  return (
    <div className="flex items-end gap-3 h-32 mt-4">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-blue rounded-t-sm transition-all"
            style={{ height: `${(d.value / max) * 100}%` }}
          />
          <span className="text-[10px] text-gray-500">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

// Donut chart SVG
function DonutChart() {
  // Airbnb 55%, Booking.com 30%, Direct 15%
  // SVG donut: circumference = 2π*40 ≈ 251.2
  const r = 40;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * r;

  const segments = [
    { pct: 0.55, color: '#2563eb', label: 'Airbnb', value: '55%' },
    { pct: 0.30, color: '#93c5fd', label: 'Booking.com', value: '30%' },
    { pct: 0.15, color: '#f59e0b', label: 'Direct', value: '15%' },
  ];

  let offset = 0;
  const paths = segments.map((seg) => {
    const dashArray = `${seg.pct * circumference} ${circumference}`;
    const rotate = offset * 360 - 90;
    offset += seg.pct;
    return { ...seg, dashArray, rotate };
  });

  return (
    <div className="flex items-center gap-6 mt-4">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {paths.map((p, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={p.color}
            strokeWidth="16"
            strokeDasharray={p.dashArray}
            transform={`rotate(${p.rotate} ${cx} ${cy})`}
          />
        ))}
        <circle cx={cx} cy={cy} r="28" fill="white" />
      </svg>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-xs text-gray-600">{seg.label}</span>
            <span className="text-xs font-semibold text-navy ml-auto">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Owner Reporting Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Performance metrics for December 2024</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-light transition-colors">
          <Download size={14} />
          Export Report
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Revenue This Month" value="R185,000" trend="up" trendValue="↑12%" color="text-blue" />
        <StatCard label="Occupancy Rate" value="82%" trend="stable" trendValue="Stable" color="text-navy" />
        <StatCard label="Avg Daily Rate" value="R2,450" color="text-navy" />
        <StatCard label="Guest Rating" value="4.87 ⭐" color="text-yellow" />
      </div>

      {/* 2x2 Grid of Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Monthly Revenue */}
        <div className="bg-white rounded-[10px] p-5" style={{ boxShadow: 'var(--shadow)' }}>
          <h2 className="text-sm font-semibold text-navy">Monthly Revenue</h2>
          <BarChart />
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Unit 5</span>
              <span className="font-semibold text-navy">R150,000</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Unit 8</span>
              <span className="font-semibold text-navy">R170,000</span>
            </div>
          </div>
        </div>

        {/* Booking Sources */}
        <div className="bg-white rounded-[10px] p-5" style={{ boxShadow: 'var(--shadow)' }}>
          <h2 className="text-sm font-semibold text-navy">Booking Sources</h2>
          <DonutChart />
        </div>

        {/* Concierge Revenue */}
        <div className="bg-white rounded-[10px] p-5" style={{ boxShadow: 'var(--shadow)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-navy">Concierge Revenue</h2>
            <span className="text-sm font-bold text-green">R45,550</span>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Wine Tours', amount: 'R21,000', pct: 46, color: 'bg-blue' },
              { name: 'Airport Transfers', amount: 'R16,150', pct: 35, color: 'bg-blue-light' },
              { name: 'Private Chef', amount: 'R8,400', pct: 19, color: 'bg-orange' },
            ].map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{item.name}</span>
                  <span className="font-semibold text-navy">{item.amount}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => alert('Downloading owner report...')}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-light transition-colors"
          >
            <Download size={13} />
            Download Owner Report
          </button>
        </div>

        {/* Property Health */}
        <div className="bg-white rounded-[10px] p-5" style={{ boxShadow: 'var(--shadow)' }}>
          <h2 className="text-sm font-semibold text-navy mb-4">Property Health</h2>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Cleaning Issues', value: 2, color: 'text-orange' },
              { label: 'Maintenance Issues', value: 1, color: 'text-red' },
              { label: 'Guest Complaints', value: 0, color: 'text-green' },
            ].map((item) => (
              <div key={item.label} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Guest Insights</p>
            <div className="space-y-2.5">
              {[
                { label: 'Communication', rating: 4.9 },
                { label: 'Cleanliness', rating: 4.8 },
                { label: 'Location', rating: 4.95 },
                { label: 'Check-in Process', rating: 4.7 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-32 flex-shrink-0">{item.label}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow rounded-full"
                      style={{ width: `${(item.rating / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-navy w-8 text-right">{item.rating}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
