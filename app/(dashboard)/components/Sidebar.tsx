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

  // Auto-expand menus whose path matches current pathname
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
          const isOpen = openMenus.has(item.href);
          const Icon = item.icon;
          const hasChildren = !!item.children?.length;

          return (
            <div key={item.href}>
              {/* Parent row */}
              <div
                className={cn(
                  'flex items-center rounded-lg mb-0.5 transition-all relative',
                  active
                    ? 'bg-white/10 border-l-[3px] border-l-blue-light'
                    : 'hover:bg-white/5'
                )}
              >
                <Link
                  href={item.href}
                  className={cn(
                    'flex-1 flex items-center gap-3 text-sm font-medium py-2.5',
                    active ? 'text-white pl-[calc(0.75rem-3px)]' : 'text-white/60 hover:text-white/90 px-3'
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
                {hasChildren && (
                  <button
                    onClick={() => toggleMenu(item.href)}
                    className="pr-3 pl-1 py-2.5 text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
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
                <div className="ml-3 mb-1 pl-4 border-l border-white/10 space-y-0.5">
                  {item.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-white/50 hover:text-white/90 hover:bg-white/5 transition-all"
                    >
                      <span className="w-1 h-1 rounded-full bg-white/30 flex-shrink-0" />
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
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
