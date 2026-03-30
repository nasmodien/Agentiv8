import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <Sidebar />
      <Topbar />
      <main
        style={{
          marginLeft: 'var(--sidebar-w)',
          paddingTop: 'var(--topbar-h)',
          minHeight: '100vh',
        }}
      >
        {children}
      </main>
    </div>
  );
}
