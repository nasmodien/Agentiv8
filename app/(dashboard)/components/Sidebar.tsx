'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  CalendarDays,
  Home,
  Coffee,
  Sparkles,
  BarChart3,
  Settings,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  CheckSquare,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavChild {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  dot?: boolean;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Messages', href: '/messages', icon: MessageSquare, badge: 5 },
  {
    label: 'Tasks', href: '/tasks', icon: CheckSquare,
    children: [
      { label: 'All Tasks', href: '/tasks' },
      { label: 'By Property', href: '/tasks?view=property' },
      { label: 'Calendar', href: '/tasks?view=calendar' },
    ],
  },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays },
  { label: 'Properties', href: '/properties', icon: Home },
  {
    label: 'Concierge', href: '/concierge', icon: Coffee,
    children: [
      { label: 'All Services', href: '/concierge' },
      { label: 'Wine & Dine', href: '/concierge?cat=wine' },
      { label: 'Local Tours', href: '/concierge?cat=tours' },
      { label: 'In-House', href: '/concierge?cat=inhouse' },
    ],
  },
  {
    label: 'Cleaning', href: '/cleaning', icon: Sparkles,
    children: [
      { label: 'Tasks', href: '/cleaning?tab=tasks' },
      { label: 'Calendar', href: '/cleaning?tab=calendar' },
      { label: 'By Property', href: '/cleaning?tab=schedule' },
      { label: 'Cleaners', href: '/cleaning?tab=cleaners' },
      { label: 'Checklists', href: '/cleaning?tab=checklists' },
      { label: 'Pay', href: '/cleaning?tab=pay' },
    ],
  },
  {
    label: 'Analytics', href: '/analytics', icon: BarChart3,
    children: [
      { label: 'Overview', href: '/analytics' },
      { label: 'Revenue', href: '/analytics?section=revenue' },
      { label: 'Occupancy', href: '/analytics?section=occupancy' },
    ],
  },
  {
    label: 'AI Replies', href: '/ai', icon: Bot,
    children: [
      { label: 'General', href: '/ai' },
      { label: 'Knowledge Base', href: '/ai?tab=kb' },
    ],
  },
  { label: 'Sync', href: '/sync', icon: RefreshCw },
  {
    label: 'Settings', href: '/settings', icon: Settings,
    children: [
      { label: 'Integrations', href: '/settings' },
      { label: 'AI Config', href: '/settings?section=ai' },
      { label: 'Notifications', href: '/settings?section=notifications' },
      { label: 'Authentication', href: '/settings?section=auth' },
      { label: 'Revenue', href: '/settings?section=revenue' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());

  useEffect(() => {
    const toOpen = new Set<string>();
    navItems.forEach((item) => {
      if (item.children) {
        const parentActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        if (parentActive) toOpen.add(item.href);
      }
    });
    setOpenMenus(toOpen);
  }, [pathname]);

  const toggleMenu = (href: string) => {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-40 transition-colors duration-200"
      style={{ width: 'var(--sidebar-w)', background: 'var(--sidebar-bg)', boxShadow: 'var(--shadow-sidebar)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-[58px] flex-shrink-0" style={{ borderBottom: '1px solid var(--border-col)' }}>
        {/* Network icon using brand colors */}
        <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="2.5" fill="#22d3ee" />
            <circle cx="10" cy="3" r="1.5" fill="#93c5fd" />
            <circle cx="10" cy="17" r="1.5" fill="#60a5fa" />
            <circle cx="3" cy="10" r="1.5" fill="#1d4ed8" />
            <circle cx="17" cy="10" r="1.5" fill="#3b82f6" />
            <circle cx="4.5" cy="4.5" r="1.2" fill="#1e40af" />
            <circle cx="15.5" cy="15.5" r="1.2" fill="#2563eb" />
            <line x1="10" y1="10" x2="10" y2="4.5" stroke="#93c5fd" strokeWidth="1" />
            <line x1="10" y1="10" x2="10" y2="15.5" stroke="#60a5fa" strokeWidth="1" />
            <line x1="10" y1="10" x2="4.5" y2="10" stroke="#3b82f6" strokeWidth="1" />
            <line x1="10" y1="10" x2="15.5" y2="10" stroke="#3b82f6" strokeWidth="1" />
            <line x1="10" y1="10" x2="5.2" y2="5.2" stroke="#1e40af" strokeWidth="1" />
            <line x1="10" y1="10" x2="14.8" y2="14.8" stroke="#2563eb" strokeWidth="1" />
          </svg>
        </div>
        <span className="text-[17px] font-bold text-navy tracking-tight">
          Agenti<span className="text-orange">v8</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const isOpen = openMenus.has(item.href);
          const Icon = item.icon;
          const hasChildren = !!item.children?.length;

          return (
            <div key={item.href} className="mb-0.5">
              {/* Parent row */}
              <div className={cn(
                'flex items-center rounded-xl transition-all',
                active
                  ? 'bg-navy dark:bg-[#2d3748] shadow-sm'
                  : 'hover:bg-[var(--bg-hover)]'
              )}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex-1 flex items-center gap-3 text-sm font-medium px-3 py-2.5 rounded-xl',
                    active ? 'text-white' : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                  )}
                >
                  <Icon size={17} className="flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className={cn(
                      'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold',
                      active ? 'bg-white/20 text-white' : 'bg-orange/15 text-orange'
                    )}>
                      {item.badge}
                    </span>
                  )}
                  {item.dot && (
                    <span className="w-2 h-2 rounded-full bg-red flex-shrink-0" />
                  )}
                </Link>
                {hasChildren && (
                  <button
                    onClick={() => toggleMenu(item.href)}
                    className={cn(
                      'pr-3 pl-1 py-2.5 transition-colors flex-shrink-0',
                      active ? 'text-white/60 hover:text-white' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
                    )}
                    aria-label={isOpen ? 'Collapse' : 'Expand'}
                  >
                    <ChevronDown
                      size={13}
                      className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
                    />
                  </button>
                )}
              </div>

              {/* Sub-items */}
              {hasChildren && isOpen && (
                <div className="ml-4 mt-0.5 mb-1 pl-3 space-y-0.5" style={{ borderLeft: '2px solid var(--border-col)' }}>
                  {item.children!.map((child) => {
                    const childActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                          childActive
                            ? 'text-orange font-semibold bg-orange/10'
                            : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)]'
                        )}
                      >
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full flex-shrink-0',
                          childActive ? 'bg-orange' : 'bg-gray-300'
                        )} />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Escalation Box */}
      <div className="px-3 pb-4 flex-shrink-0">
        <div className="bg-red/8 border border-red/15 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-red/15 flex items-center justify-center">
              <AlertTriangle size={12} className="text-red" />
            </div>
            <span className="text-xs font-semibold text-red">New Escalations</span>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red/10 text-red text-[11px] font-semibold">
            2 Tasks Overdue
          </span>
        </div>
      </div>
    </aside>
  );
}
