'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Shield,
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  CalendarDays,
  Home,
  Coffee,
  Sparkles,
  BarChart3,
  BookOpen,
  RefreshCw,
  Settings,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  pagePermissions: string[];
  image: string | null;
  createdAt: string;
}

// ─── Page definitions ────────────────────────────────────────────────────────

const ALL_PAGES = [
  { key: '/', label: 'Dashboard', icon: LayoutDashboard },
  { key: '/messages', label: 'Messages', icon: MessageSquare },
  { key: '/tasks', label: 'Tasks', icon: CheckSquare },
  { key: '/calendar', label: 'Calendar', icon: CalendarDays },
  { key: '/properties', label: 'Properties', icon: Home },
  { key: '/concierge', label: 'Concierge', icon: Coffee },
  { key: '/cleaning', label: 'Cleaning', icon: Sparkles },
  { key: '/analytics', label: 'Analytics', icon: BarChart3 },
  { key: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { key: '/sync', label: 'Sync', icon: RefreshCw },
  { key: '/settings', label: 'Settings', icon: Settings },
  { key: '/users', label: 'Users', icon: UserCog },
];

const ROLES = ['ADMIN', 'MANAGER', 'VIEWER'];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-blue/10 text-blue-700 border border-blue/20',
  MANAGER: 'bg-green/10 text-green-700 border border-green/20',
  VIEWER: 'bg-gray-100 text-gray-600 border border-gray-200',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(user: User): string {
  if (user.name) {
    return user.name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return user.email.slice(0, 2).toUpperCase();
}

function avatarColor(email: string): string {
  const colors = [
    'bg-blue',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Permission Editor ───────────────────────────────────────────────────────

function PermissionEditor({
  permissions,
  onChange,
}: {
  permissions: string[];
  onChange: (p: string[]) => void;
}) {
  const all = permissions.length === ALL_PAGES.length;

  function toggle(key: string) {
    if (permissions.includes(key)) {
      onChange(permissions.filter((p) => p !== key));
    } else {
      onChange([...permissions, key]);
    }
  }

  function toggleAll() {
    onChange(all ? [] : ALL_PAGES.map((p) => p.key));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Page Access
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-blue-600 hover:underline font-medium"
        >
          {all ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {ALL_PAGES.map(({ key, label, icon: Icon }) => {
          const active = permissions.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                active
                  ? 'border-blue/40 bg-blue/8 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all',
                  active ? 'bg-blue border-blue' : 'border-gray-300 bg-white'
                )}
              >
                {active && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              <Icon size={13} className="flex-shrink-0 opacity-70" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────

function AddUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (u: User) => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('MANAGER');
  const [permissions, setPermissions] = useState<string[]>(ALL_PAGES.map((p) => p.key));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || null, role, pagePermissions: permissions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create user');
      onCreated(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue/10 flex items-center justify-center">
              <Plus size={16} className="text-blue" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Add New User</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-6 space-y-5">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Email <span className="text-red">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
            <div className="flex gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'flex-1 py-2 rounded-lg border text-xs font-semibold transition-all',
                    role === r
                      ? 'border-blue bg-blue text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <PermissionEditor permissions={permissions} onChange={setPermissions} />

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────

function EditDrawer({
  user,
  onClose,
  onSaved,
  onDeleted,
}: {
  user: User;
  onClose: () => void;
  onSaved: (u: User) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(user.name ?? '');
  const [role, setRole] = useState(user.role);
  const [permissions, setPermissions] = useState<string[]>(user.pagePermissions);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || null, role, pagePermissions: permissions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      onSaved(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      onDeleted(user.id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
                avatarColor(user.email)
              )}
            >
              {initials(user)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {user.name ?? user.email}
              </p>
              {user.name && (
                <p className="text-xs text-gray-400 leading-tight">{user.email}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
            <div className="flex gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'flex-1 py-2 rounded-lg border text-xs font-semibold transition-all',
                    role === r
                      ? 'border-blue bg-blue text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <PermissionEditor permissions={permissions} onChange={setPermissions} />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 space-y-2">
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-blue text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Remove User
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={remove}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Removing…' : 'Confirm Remove'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  onEdit,
}: {
  user: User;
  onEdit: (u: User) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const grantedPages = ALL_PAGES.filter((p) => user.pagePermissions.includes(p.key));
  const allGranted = grantedPages.length === ALL_PAGES.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Avatar */}
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
            avatarColor(user.email)
          )}
        >
          {user.image ? (
            <img src={user.image} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            initials(user)
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user.name ?? user.email}
            </p>
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
                ROLE_COLORS[user.role] ?? ROLE_COLORS.VIEWER
              )}
            >
              <Shield size={9} />
              {user.role}
            </span>
          </div>
          {user.name && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
          )}
        </div>

        {/* Page count */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
          <span className="font-medium text-gray-700">
            {allGranted ? 'All pages' : `${grantedPages.length} / ${ALL_PAGES.length} pages`}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="View permissions"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button
            onClick={() => onEdit(user)}
            className="p-1.5 rounded-lg hover:bg-blue/8 text-gray-400 hover:text-blue transition-colors"
            title="Edit user"
          >
            <Pencil size={15} />
          </button>
        </div>
      </div>

      {/* Expanded permissions */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100 pt-3">
          {grantedPages.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No page access granted.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {grantedPages.map(({ key, label, icon: Icon }) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue/8 border border-blue/20 text-[11px] font-medium text-blue-700"
                >
                  <Icon size={10} />
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const matchSearch =
      search === '' ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  function handleCreated(u: User) {
    setUsers((prev) => [...prev, u]);
    setShowAdd(false);
  }

  function handleSaved(u: User) {
    setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
    setEditing(null);
  }

  function handleDeleted(id: string) {
    setUsers((prev) => prev.filter((x) => x.id !== id));
    setEditing(null);
  }

  const counts = ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = users.filter((u) => u.role === r).length;
    return acc;
  }, {});

  return (
    <>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage team members and control their page access.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={16} />
            Add User
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-500">Total Users</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
          {ROLES.map((r) => (
            <div key={r} className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500">{r}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{counts[r] ?? 0}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue/50 bg-white shadow-sm"
          />
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm flex-shrink-0">
            {['ALL', ...ROLES].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={cn(
                  'px-3 py-2 text-xs font-medium transition-colors',
                  roleFilter === r
                    ? 'bg-blue text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* User list */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            Loading users…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Users size={22} className="text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">
                {search || roleFilter !== 'ALL' ? 'No users match your filters' : 'No users yet'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {search || roleFilter !== 'ALL'
                  ? 'Try adjusting the search or filter'
                  : 'Click "Add User" to invite your first team member'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((u) => (
              <UserRow key={u.id} user={u} onEdit={setEditing} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <AddUserModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />
      )}
      {editing && (
        <EditDrawer
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
