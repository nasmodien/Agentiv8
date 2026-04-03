import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Topbar } from './components/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Topbar */}
      <Topbar />

      {/* Main content */}
      <main
        className="md:ml-[var(--sidebar-w)]"
        style={{ paddingTop: 'var(--topbar-h)', paddingBottom: 'var(--mobile-nav-h)' }}
      >
        <div className="md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav — hidden on desktop */}
      <div className="block md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
