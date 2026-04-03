'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, CalendarDays, Home, BarChart3, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const mainNav = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays },
  { label: 'Properties', href: '/properties', icon: Home },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
];

const moreNav = [
  { label: 'Concierge', href: '/concierge' },
  { label: 'Knowledge Base', href: '/knowledge' },
  { label: 'Sync', href: '/sync' },
  { label: 'Settings', href: '/settings' },
];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* More drawer backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer */}
      {moreOpen && (
        <div className="fixed bottom-[var(--mobile-nav-h)] left-0 right-0 bg-white border-t border-gray-200 rounded-t-2xl z-50 py-4 px-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          {moreNav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-blue-subtle text-blue'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-stretch"
        style={{ height: 'var(--mobile-nav-h)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {mainNav.map(item => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                active ? 'text-blue' : 'text-gray-400'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className={cn('text-[10px] font-medium', active ? 'text-blue' : 'text-gray-400')}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
            moreOpen ? 'text-blue' : 'text-gray-400'
          )}
        >
          <MoreHorizontal size={20} strokeWidth={1.8} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </>
  );
}
