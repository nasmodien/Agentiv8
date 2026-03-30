'use client';

import {
  MessageSquare,
  Wrench,
  Coffee,
  Sparkles,
  Clock,
  Shield,
  Star,
} from 'lucide-react';

function StatCard({
  label,
  value,
  color,
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  color: 'blue' | 'orange' | 'green';
  icon: React.ElementType;
  href: string;
}) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-subtle',
      text: 'text-blue',
      icon: 'text-blue',
      border: 'border-blue/20',
    },
    orange: {
      bg: 'bg-orange-50',
      text: 'text-orange',
      icon: 'text-orange',
      border: 'border-orange/20',
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green',
      icon: 'text-green',
      border: 'border-green/20',
    },
  };
  const c = colorMap[color];

  return (
    <a
      href={href}
      className="bg-white rounded-[10px] p-5 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer block"
      style={{ boxShadow: 'var(--shadow)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-2">{label}</p>
          <p className={`text-3xl font-bold ${c.text}`}>{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon size={20} className={c.icon} />
        </div>
      </div>
    </a>
  );
}

function OpsCard({
  label,
  value,
  sublabel,
  color,
}: {
  label: string;
  value: number;
  sublabel: string;
  color: string;
}) {
  return (
    <div
      className="bg-white rounded-[10px] p-5 flex-1"
      style={{ boxShadow: 'var(--shadow)' }}
    >
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color} mb-0.5`}>{value}</p>
      <p className="text-xs text-gray-500">{sublabel}</p>
    </div>
  );
}

function AutoStat({
  value,
  label,
  icon: Icon,
  color,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center text-center py-2">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-navy mb-0.5">{value}</p>
      <p className="text-xs text-gray-500 leading-snug">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-navy">Good morning, Noer 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">Here&apos;s what&apos;s happening across your properties today.</p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Messages"
          value={14}
          color="blue"
          icon={MessageSquare}
          href="/messages"
        />
        <StatCard
          label="Operations"
          value={12}
          color="orange"
          icon={Wrench}
          href="/operations"
        />
        <StatCard
          label="Concierge Revenue"
          value="R37,150"
          color="green"
          icon={Coffee}
          href="/concierge"
        />
      </div>

      {/* Operations Center */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Operations Center
        </h2>
        <div className="flex gap-4">
          <OpsCard
            label="Upcoming Check-Ins"
            value={7}
            sublabel="Today"
            color="text-blue"
          />
          <OpsCard
            label="Cleaning Tasks"
            value={9}
            sublabel="Scheduled"
            color="text-green"
          />
          <OpsCard
            label="Maintenance Issues"
            value={3}
            sublabel="Pending"
            color="text-orange"
          />
        </div>
      </div>

      {/* AI Automation Stats */}
      <div
        className="bg-white rounded-[10px] p-6"
        style={{ boxShadow: 'var(--shadow)' }}
      >
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg bg-blue flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <h2 className="text-sm font-semibold text-navy">AI Automation Stats</h2>
          <span className="ml-auto text-xs text-gray-400">Last 30 days</span>
        </div>
        <div className="grid grid-cols-4 gap-4 divide-x divide-gray-100">
          <AutoStat
            value="74%"
            label="Automation Rate"
            icon={Shield}
            color="bg-blue"
          />
          <AutoStat
            value="28s"
            label="Avg Response Time"
            icon={Clock}
            color="bg-green"
          />
          <AutoStat
            value="3.2h"
            label="Saved Daily"
            icon={Sparkles}
            color="bg-orange"
          />
          <AutoStat
            value="4.87"
            label={`Guest Rating ⭐`}
            icon={Star}
            color="bg-yellow"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div
        className="bg-white rounded-[10px] p-5"
        style={{ boxShadow: 'var(--shadow)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-navy">Recent Activity</h2>
          <a href="/messages" className="text-xs text-blue hover:underline">View all →</a>
        </div>
        <div className="space-y-3">
          {[
            { name: 'Sarah Mitchell', action: 'asked for WiFi password', time: '2m ago', status: 'AI Handled', statusColor: 'text-green' },
            { name: 'Tom & Lisa', action: 'requested late checkout', time: '5m ago', status: 'Needs Review', statusColor: 'text-red' },
            { name: 'Anna Patel', action: 'asked for check-in info', time: '10m ago', status: 'AI Handled', statusColor: 'text-green' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center">
                  <span className="text-white text-[11px] font-semibold">
                    {item.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-navy">{item.name}</span>
                  <span className="text-sm text-gray-500"> {item.action}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium ${item.statusColor}`}>{item.status}</span>
                <span className="text-xs text-gray-400">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
