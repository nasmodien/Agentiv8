'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  CalendarDays,
  Home,
  Coffee,
  BarChart3,
  BookOpen,
  Settings,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Messages', href: '/messages', icon: MessageSquare, badge: 5 },
  { label: 'Tasks', href: '/tasks', icon: Calendar },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays },
  { label: 'Properties', href: '/properties', icon: Home },
  { label: 'Concierge', href: '/concierge', icon: Coffee },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Knowledge Base', href: '/knowledge', icon: BookOpen, dot: true },
  { label: 'Sync', href: '/sync', icon: RefreshCw },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-40"
      style={{ width: 'var(--sidebar-w)', background: 'var(--navy)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-[58px] border-b border-white/10 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="3" fill="white" />
            <path
              d="M9 1.5v1.5M9 15v1.5M1.5 9H3M15 9h1.5M3.697 3.697l1.06 1.06M13.243 13.243l1.06 1.06M3.697 14.303l1.06-1.06M13.243 4.757l1.06-1.06"
              stroke="white"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="text-[17px] font-semibold text-white tracking-tight">
          Agenti<span className="text-blue-light">v8</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all text-sm font-medium relative',
                active
                  ? 'bg-white/10 text-white border-l-[3px] border-l-blue-light pl-[calc(0.75rem-3px)]'
                  : 'text-white/60 hover:text-white/90 hover:bg-white/5'
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue text-white text-[10px] font-semibold">
                  {item.badge}
                </span>
              )}
              {item.dot && (
                <span className="w-2 h-2 rounded-full bg-red flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Escalation Box */}
      <div className="px-3 pb-4 flex-shrink-0">
        <div className="bg-red/15 border border-red/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-red" />
            <span className="text-xs font-semibold text-red">New Escalations</span>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red/20 text-red text-xs font-medium">
            2 Tasks Overdue
          </span>
        </div>
      </div>
    </aside>
  );
}
