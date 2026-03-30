'use client';

import { CheckCircle, RefreshCw, Send, Eye, Wrench, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'orange' | 'red';
}) {
  const colorMap = {
    blue: 'text-blue bg-blue-subtle',
    green: 'text-green bg-green-50',
    orange: 'text-orange bg-orange-50',
    red: 'text-red bg-red-50',
  };
  return (
    <div className="bg-white rounded-[10px] p-5 flex items-center gap-4" style={{ boxShadow: 'var(--shadow)' }}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold ${colorMap[color]}`}>
        {value}
      </div>
      <p className="text-sm font-medium text-gray-600">{label}</p>
    </div>
  );
}

export default function OperationsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-navy">Operations Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track check-ins, cleaning, and maintenance across all properties.</p>
      </div>

      {/* Stat Boxes */}
      <div className="grid grid-cols-4 gap-4">
        <StatBox label="Check-Ins Today" value={12} color="blue" />
        <StatBox label="Cleaning Tasks" value={9} color="green" />
        <StatBox label="Maintenance Issues" value={3} color="orange" />
        <StatBox label="Overdue Tasks" value={2} color="red" />
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Column 1: Upcoming Check-Ins */}
        <div className="bg-white rounded-[10px] overflow-hidden" style={{ boxShadow: 'var(--shadow)' }}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-blue" />
              <h2 className="text-sm font-semibold text-navy">Upcoming Check-Ins</h2>
            </div>
            <span className="text-xs text-gray-400">7 today</span>
          </div>
          <div className="divide-y divide-gray-50">
            {/* Check-in 1 */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-navy">Unit 5</p>
                  <p className="text-xs text-gray-500">Sarah Mitchell</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-navy">Today · 15:00</p>
                  <Badge variant="today">Today</Badge>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => alert('Instructions sent to Sarah Mitchell')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-blue text-white rounded-lg hover:bg-blue-light transition-colors"
                >
                  <Send size={11} /> Send Instructions
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                  <Eye size={11} /> View Guest
                </button>
              </div>
            </div>
            {/* Check-in 2 */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-navy">Unit 8</p>
                  <p className="text-xs text-gray-500">David Cole</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-navy">Today · 16:00</p>
                  <Badge variant="today">Today</Badge>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => alert('Instructions sent to David Cole')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-blue text-white rounded-lg hover:bg-blue-light transition-colors"
                >
                  <Send size={11} /> Send Instructions
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                  <Eye size={11} /> View Guest
                </button>
              </div>
            </div>
            {/* Check-in 3 */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-navy">Unit 3</p>
                  <p className="text-xs text-gray-500">Anna Patel</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-navy">Tomorrow</p>
                  <Badge variant="tomorrow">Tomorrow</Badge>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => alert('Instructions sent to Anna Patel')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-blue text-white rounded-lg hover:bg-blue-light transition-colors"
                >
                  <Send size={11} /> Send Instructions
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                  <Eye size={11} /> View Guest
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Cleaning Tasks */}
        <div className="bg-white rounded-[10px] overflow-hidden" style={{ boxShadow: 'var(--shadow)' }}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green" />
              <h2 className="text-sm font-semibold text-navy">Cleaning Tasks</h2>
            </div>
            <span className="text-xs text-gray-400">9 scheduled</span>
          </div>
          <div className="divide-y divide-gray-50">
            {/* Task 1 */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-navy">Unit 5</p>
                  <p className="text-xs text-gray-500">Maria · 11:30</p>
                </div>
                <Badge variant="progress">In Progress</Badge>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => alert('Task marked as complete!')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-green text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  <CheckCircle size={11} /> Mark Complete
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                  <RefreshCw size={11} /> Reassign
                </button>
              </div>
            </div>
            {/* Task 2 */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-navy">Unit 8</p>
                  <p className="text-xs text-gray-500">Cleaning Team A · 13:00</p>
                </div>
                <Badge variant="pending">Pending</Badge>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => alert('Task marked as complete!')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-green text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  <CheckCircle size={11} /> Mark Complete
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                  <RefreshCw size={11} /> Reassign
                </button>
              </div>
            </div>
            {/* Task 3 */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-navy">Unit 9</p>
                  <p className="text-xs text-gray-500">Cleaning Team B · 15:30</p>
                </div>
                <Badge variant="pending">Pending</Badge>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => alert('Task marked as complete!')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-green text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  <CheckCircle size={11} /> Mark Complete
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                  <RefreshCw size={11} /> Reassign
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Maintenance Issues */}
        <div className="bg-white rounded-[10px] overflow-hidden" style={{ boxShadow: 'var(--shadow)' }}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-orange" />
              <h2 className="text-sm font-semibold text-navy">Maintenance Issues</h2>
            </div>
            <span className="text-xs text-gray-400">3 pending</span>
          </div>
          <div className="divide-y divide-gray-50">
            {/* Issue 1 */}
            <div className="px-5 py-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm font-semibold text-navy">Unit 3 · Faucet Leaking</p>
                  <p className="text-xs text-gray-500 mt-0.5">Anna Patel · 8:32 AM</p>
                </div>
                <Badge variant="urgent">Urgent</Badge>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => alert('Vendor assignment initiated')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-orange text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Wrench size={11} /> Assign Vendor
                </button>
                <button
                  onClick={() => alert('Repair scheduled')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Calendar size={11} /> Schedule Repair
                </button>
              </div>
            </div>
            {/* Issue 2 */}
            <div className="px-5 py-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm font-semibold text-navy">Unit 9 · Aircon Not Working</p>
                  <p className="text-xs text-gray-500 mt-0.5">2 hours ago</p>
                </div>
                <Badge variant="new">New</Badge>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => alert('Vendor assignment initiated')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-orange text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Wrench size={11} /> Assign Vendor
                </button>
                <button
                  onClick={() => alert('Repair scheduled')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Calendar size={11} /> Schedule Repair
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
