'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  ChevronDown,
  FileText,
  Plus,
  Upload,
  Clock,
  ArrowUpRight,
  Trash2,
  RefreshCw,
  X,
  CheckCircle,
} from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { cn } from '@/lib/utils';

type Category =
  | 'all'
  | 'checkin'
  | 'rules'
  | 'wifi'
  | 'parking'
  | 'concierge'
  | 'access'
  | 'faq'
  | 'general';

const categoryItems: { key: Category; label: string }[] = [
  { key: 'all', label: 'All Content' },
  { key: 'checkin', label: 'Check-In Instructions' },
  { key: 'rules', label: 'House Rules' },
  { key: 'wifi', label: 'WiFi & Technology' },
  { key: 'parking', label: 'Parking & Transport' },
  { key: 'concierge', label: 'Concierge Info' },
  { key: 'access', label: 'Access Codes' },
  { key: 'faq', label: 'Guest FAQs' },
  { key: 'general', label: 'General' },
];

const CATEGORY_API_MAP: Record<Category, string> = {
  all: '',
  checkin: 'Check-In Instructions',
  rules: 'House Rules',
  wifi: 'WiFi & Technology',
  parking: 'Parking & Transport',
  concierge: 'Concierge Info',
  access: 'Access Codes',
  faq: 'Guest FAQs',
  general: 'General',
};

const CATEGORY_OPTIONS = [
  'Check-In Instructions',
  'House Rules',
  'WiFi & Technology',
  'Parking & Transport',
  'Concierge Info',
  'Access Codes',
  'Guest FAQs',
  'General',
];

interface KBItem {
  id: string;
  title: string;
  category: string;
  content: string | null;
  fileUrl: string | null;
  fileType: string | null;
  vectorId: string | null;
  enabled: boolean;
  createdAt: string;
}

// ─── Create / Edit Modal ────────────────────────────────────────────────────
interface ModalProps {
  onClose: () => void;
  onSaved: () => void;
  orgId: string;
  editItem?: KBItem | null;
}

function KBModal({ onClose, onSaved, orgId, editItem }: ModalProps) {
  const [tab, setTab] = useState<'text' | 'file'>(editItem ? 'text' : 'text');
  const [title, setTitle] = useState(editItem?.title ?? '');
  const [category, setCategory] = useState(editItem?.category ?? 'General');
  const [content, setContent] = useState(editItem?.content ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!title.trim() || !category) { setError('Title and category are required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editItem) {
        // PATCH existing
        const res = await fetch('/api/knowledge', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editItem.id, title, category, content }),
        });
        if (!res.ok) throw new Error('Failed to save');
      } else if (tab === 'file' && file) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('orgId', orgId);
        fd.append('category', category);
        const res = await fetch('/api/knowledge/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
      } else {
        if (!content.trim()) { setError('Content is required'); setSaving(false); return; }
        const res = await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId, title, category, content }),
        });
        if (!res.ok) throw new Error('Failed to create');
      }
      setSuccess(true);
      setTimeout(() => { onSaved(); onClose(); }, 700);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-navy">
            {editItem ? 'Edit Knowledge Item' : 'Add Knowledge Item'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Tab switcher (only for create) */}
          {!editItem && (
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['text', 'file'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'flex-1 py-1.5 rounded-md text-xs font-medium transition-colors',
                    tab === t ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {t === 'text' ? 'Write Text' : 'Upload File'}
                </button>
              ))}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Check-In Instructions for Unit 5"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 bg-white"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Content or File */}
          {(!editItem && tab === 'file') ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">File</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
                  file ? 'border-blue bg-blue-subtle' : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <Upload size={20} className="mx-auto mb-2 text-gray-400" />
                {file ? (
                  <p className="text-sm text-blue font-medium">{file.name}</p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500">Click to browse or drag a file</p>
                    <p className="text-[11px] text-gray-400 mt-1">PDF, DOCX, TXT — max 10 MB</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setFile(f);
                      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Content</label>
              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter the knowledge content that the AI will use to answer guest questions..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 resize-none"
              />
            </div>
          )}

          {error && <p className="text-xs text-red font-medium">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || success}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors',
              success
                ? 'bg-green text-white'
                : 'bg-blue text-white hover:bg-blue-light disabled:opacity-60'
            )}
          >
            {saving && <RefreshCw size={12} className="animate-spin" />}
            {success && <CheckCircle size={12} />}
            {success ? 'Saved!' : saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function KnowledgePage() {
  const ORG_ID = 'default'; // TODO: replace with session org

  const [items, setItems] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState('Recent');
  const [dragging, setDragging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<KBItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ orgId: ORG_ID });
      const catValue = CATEGORY_API_MAP[activeCategory];
      if (catValue) params.set('category', catValue);
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/knowledge?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [ORG_ID, activeCategory, debouncedSearch]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleToggle = async (item: KBItem) => {
    // Optimistic update
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, enabled: !i.enabled } : i)));
    await fetch('/api/knowledge', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, enabled: !item.enabled }),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this knowledge item?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDropUpload = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('orgId', ORG_ID);
    fd.append('category', CATEGORY_API_MAP[activeCategory] || 'General');
    await fetch('/api/knowledge/upload', { method: 'POST', body: fd });
    fetchItems();
  };

  // Sort items client-side
  const sorted = [...items].sort((a, b) => {
    if (sort === 'Name A-Z') return a.title.localeCompare(b.title);
    if (sort === 'Oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Recent
  });

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  }

  return (
    <>
      {(showModal || editItem) && (
        <KBModal
          orgId={ORG_ID}
          editItem={editItem}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSaved={fetchItems}
        />
      )}

      <div className="flex gap-5 h-[calc(100vh-var(--topbar-h))]">
        {/* LEFT SIDEBAR */}
        <div className="w-[240px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-navy mb-3 leading-tight">
              AI Knowledge Base
            </h2>

            {/* Search */}
            <div className="relative mb-3">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search knowledge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue/20"
              />
            </div>

            {/* Property Selector (placeholder) */}
            <button className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-100 transition-colors">
              All Properties
              <ChevronDown size={12} className="text-gray-400" />
            </button>
          </div>

          {/* Categories */}
          <nav className="flex-1 py-2 px-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-2 mb-2">
              Categories
            </p>
            {categoryItems.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-xs transition-colors mb-0.5',
                  activeCategory === cat.key
                    ? 'bg-blue-subtle text-blue font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                {cat.label}
              </button>
            ))}
          </nav>

          {/* File Drop Zone */}
          <div className="p-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleDropUpload(f);
              }}
            />
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleDropUpload(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer',
                dragging ? 'border-blue bg-blue-subtle' : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <Upload size={18} className="mx-auto mb-2 text-gray-400" />
              <p className="text-[10px] text-gray-500 leading-snug">
                Drop files here or{' '}
                <span className="text-blue font-medium">browse</span>
              </p>
              <p className="text-[9px] text-gray-400 mt-1">PDF, DOCX, TXT</p>
            </div>
          </div>
        </div>

        {/* MAIN AREA */}
        <div className="flex-1 overflow-y-auto py-6 pr-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-navy">
                {categoryItems.find((c) => c.key === activeCategory)?.label ?? 'All Content'}
              </h2>
              {!loading && (
                <p className="text-xs text-gray-400 mt-0.5">{sorted.length} item{sorted.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Sort */}
              <div className="relative">
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Sort: {sort}
                  <ChevronDown size={12} className="text-gray-400" />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[130px] z-10">
                    {['Recent', 'Oldest', 'Name A-Z'].map((s) => (
                      <button
                        key={s}
                        onClick={() => { setSort(s); setSortOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-navy"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* New Item */}
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue text-white text-xs font-medium rounded-lg hover:bg-blue-light transition-colors"
              >
                <Plus size={13} />
                New Item
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw size={18} className="animate-spin mr-2" />
              <span className="text-sm">Loading knowledge base...</span>
            </div>
          )}

          {/* KB Items List */}
          {!loading && (
            <div className="space-y-2">
              {sorted.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-[10px] px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow group"
                  style={{ boxShadow: 'var(--shadow)' }}
                >
                  {/* Icon */}
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                    item.fileType === 'PDF' ? 'bg-red-50' : 'bg-blue-subtle'
                  )}>
                    <FileText size={16} className={item.fileType === 'PDF' ? 'text-red' : 'text-blue'} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setEditItem(item)}
                      className="text-sm font-semibold text-navy truncate hover:text-blue transition-colors text-left w-full"
                    >
                      {item.title}
                    </button>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Clock size={11} className="text-gray-400" />
                      <span className="text-[11px] text-gray-400">Updated {relativeTime(item.createdAt)}</span>
                      <span className="text-[11px] px-2 py-0.5 bg-blue-subtle text-blue rounded-full font-medium">
                        {item.category}
                      </span>
                      {item.fileType && (
                        <span className="text-[11px] px-2 py-0.5 bg-red-50 text-red rounded-full font-medium">
                          {item.fileType}
                        </span>
                      )}
                      {item.vectorId && (
                        <span className="text-[11px] px-2 py-0.5 bg-green/10 text-green rounded-full font-medium">
                          Indexed
                        </span>
                      )}
                    </div>
                    {item.content && (
                      <p className="text-[11px] text-gray-400 mt-1 truncate">{item.content.slice(0, 120)}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.fileUrl ? (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-blue"
                      >
                        <ArrowUpRight size={15} />
                      </a>
                    ) : null}
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors text-gray-300 hover:text-red opacity-0 group-hover:opacity-100"
                    >
                      {deletingId === item.id
                        ? <RefreshCw size={13} className="animate-spin" />
                        : <Trash2 size={13} />}
                    </button>
                    <Toggle
                      checked={item.enabled}
                      onChange={() => handleToggle(item)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && sorted.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <FileText size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-3">No knowledge items found.</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-blue text-white text-xs font-medium rounded-lg hover:bg-blue-light transition-colors"
              >
                Add your first item
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
