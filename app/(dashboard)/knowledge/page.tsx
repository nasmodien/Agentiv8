'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  ChevronDown,
  FileText,
  Plus,
  Upload,
  Clock,
  Trash2,
  X,
} from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { cn } from '@/lib/utils';

const ORG_ID = 'default';

type CategoryKey =
  | 'recent'
  | 'all'
  | 'checkin'
  | 'rules'
  | 'wifi'
  | 'parking'
  | 'concierge'
  | 'access'
  | 'faq';

const categoryItems: { key: CategoryKey; label: string; apiValue?: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'all', label: 'All Content' },
  { key: 'checkin', label: 'Check-In Instructions', apiValue: 'Check-In Instructions' },
  { key: 'rules', label: 'House Rules', apiValue: 'House Rules' },
  { key: 'wifi', label: 'WiFi & Technology', apiValue: 'WiFi & Technology' },
  { key: 'parking', label: 'Parking & Transport', apiValue: 'Parking & Transport' },
  { key: 'concierge', label: 'Concierge Info', apiValue: 'Concierge Info' },
  { key: 'access', label: 'Access Codes', apiValue: 'Access Codes' },
  { key: 'faq', label: 'Guest FAQs', apiValue: 'Guest FAQs' },
];

const categoryLabels = categoryItems
  .filter((c) => c.apiValue)
  .map((c) => c.apiValue as string);

interface KnowledgeItem {
  id: string;
  orgId: string;
  title: string;
  category: string;
  content?: string;
  fileUrl?: string;
  fileType?: string;
  vectorId?: string;
  enabled: boolean;
  createdAt: string;
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
}

function KnowledgePageInner() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState('Recent');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState(categoryLabels[0]);
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const cat = categoryItems.find((c) => c.key === activeCategory);
      const params = new URLSearchParams({ orgId: ORG_ID });
      if (cat?.apiValue) params.set('category', cat.apiValue);
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/knowledge?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Auto-open add modal when ?action=add is in the URL
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowAddModal(true);
    }
  }, [searchParams]);

  const toggleItem = async (id: string, enabled: boolean) => {
    // Optimistic update
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, enabled } : it)));
    await fetch('/api/knowledge', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    });
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' });
  };

  const handleFileDrop = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const cat = categoryItems.find((c) => c.key === activeCategory);
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('orgId', ORG_ID);
        fd.append('category', cat?.apiValue ?? 'General');
        await fetch('/api/knowledge/upload', { method: 'POST', body: fd });
      }
      await fetchItems();
    } finally {
      setUploading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newTitle.trim() || !newCategory) return;
    setSaving(true);
    try {
      await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: ORG_ID,
          title: newTitle.trim(),
          category: newCategory,
          content: newContent.trim() || undefined,
        }),
      });
      setNewTitle('');
      setNewContent('');
      setShowAddModal(false);
      await fetchItems();
    } finally {
      setSaving(false);
    }
  };

  const sorted = [...items].sort((a, b) => {
    if (sort === 'Name A-Z') return a.title.localeCompare(b.title);
    if (sort === 'Oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="flex gap-5 h-[calc(100vh-var(--topbar-h))]">
      {/* LEFT SIDEBAR */}
      <div className="w-[240px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-navy mb-3 leading-tight">
            AI Knowledge Base Builder
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

          {/* Property Selector */}
          <button
            onClick={() => setPropertyOpen(!propertyOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-100 transition-colors"
          >
            All Properties
            <ChevronDown size={12} className="text-gray-400" />
          </button>
          {propertyOpen && (
            <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-md py-1 text-xs text-gray-600">
              <div className="px-3 py-2">All Properties</div>
            </div>
          )}
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
            multiple
            className="hidden"
            onChange={(e) => handleFileDrop(e.target.files)}
          />
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFileDrop(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer',
              dragging || uploading
                ? 'border-blue bg-blue-subtle'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <Upload size={18} className={cn('mx-auto mb-2', uploading ? 'text-blue animate-pulse' : 'text-gray-400')} />
            <p className="text-[10px] text-gray-500 leading-snug">
              {uploading ? 'Uploading…' : (
                <>Drop files here or{' '}<span className="text-blue font-medium">browse</span></>
              )}
            </p>
            <p className="text-[9px] text-gray-400 mt-1">PDF, DOCX, TXT</p>
          </div>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 overflow-y-auto py-6 pr-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-navy">
            {categoryItems.find((c) => c.key === activeCategory)?.label ?? 'All Content'}
          </h2>
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
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue text-white text-xs font-medium rounded-lg hover:bg-blue-light transition-colors"
            >
              <Plus size={13} />
              New Item
            </button>
          </div>
        </div>

        {/* KB Items List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl px-5 py-4 animate-pulse h-16" style={{ boxShadow: 'var(--shadow)' }} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow"
                style={{ boxShadow: 'var(--shadow)' }}
              >
                {/* File type icon */}
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-red" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Clock size={11} className="text-gray-400" />
                    <span className="text-[11px] text-gray-400">{timeAgo(item.createdAt)}</span>
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
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Toggle
                    checked={item.enabled}
                    onChange={(checked) => toggleItem(item.id, checked)}
                  />
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red/10 transition-colors text-gray-300 hover:text-red"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

            {sorted.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <FileText size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No knowledge items found.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 text-xs text-blue hover:underline"
                >
                  Add your first item
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-navy">New Knowledge Item</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Check-In Instructions for Unit 5"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 bg-white"
                >
                  {categoryLabels.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Content <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Paste or type the knowledge content here…"
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={!newTitle.trim() || saving}
                className="px-4 py-2 text-sm font-medium bg-blue text-white rounded-lg hover:bg-blue-light transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <Suspense>
      <KnowledgePageInner />
    </Suspense>
  );
}
