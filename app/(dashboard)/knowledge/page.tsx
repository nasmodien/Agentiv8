'use client';

import { useState } from 'react';
import {
  Search,
  ChevronDown,
  FileText,
  Plus,
  Upload,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { cn } from '@/lib/utils';

type Category =
  | 'recent'
  | 'all'
  | 'checkin'
  | 'rules'
  | 'wifi'
  | 'parking'
  | 'concierge'
  | 'access'
  | 'faq';

const categoryItems: { key: Category; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'all', label: 'All Content' },
  { key: 'checkin', label: 'Check-In Instructions' },
  { key: 'rules', label: 'House Rules' },
  { key: 'wifi', label: 'WiFi & Technology' },
  { key: 'parking', label: 'Parking & Transport' },
  { key: 'concierge', label: 'Concierge Info' },
  { key: 'access', label: 'Access Codes' },
  { key: 'faq', label: 'Guest FAQs' },
];

interface KBItem {
  id: string;
  title: string;
  updatedAt: string;
  category: string;
  hasPdf: boolean;
  hasLink: boolean;
  enabled: boolean;
}

const initialItems: KBItem[] = [
  {
    id: '1',
    title: 'Check-In Instructions for Unit 5',
    updatedAt: '4 days ago',
    category: 'Check-In Instructions',
    hasPdf: true,
    hasLink: false,
    enabled: true,
  },
  {
    id: '2',
    title: 'House Rules & Regulations',
    updatedAt: '3 weeks ago',
    category: 'House Rules',
    hasPdf: false,
    hasLink: false,
    enabled: true,
  },
  {
    id: '3',
    title: 'Unit 5 WiFi & Smart TV Guide',
    updatedAt: '2 weeks ago',
    category: 'WiFi & Technology',
    hasPdf: true,
    hasLink: false,
    enabled: true,
  },
  {
    id: '4',
    title: 'Parking Information',
    updatedAt: '1 month ago',
    category: 'Parking & Transport',
    hasPdf: true,
    hasLink: false,
    enabled: true,
  },
  {
    id: '5',
    title: 'Access Codes & Smart Lock Guide',
    updatedAt: '1 month ago',
    category: 'Access Codes',
    hasPdf: false,
    hasLink: true,
    enabled: false,
  },
  {
    id: '6',
    title: 'Recommended Restaurants',
    updatedAt: '2 months ago',
    category: 'Concierge Info',
    hasPdf: false,
    hasLink: false,
    enabled: true,
  },
  {
    id: '7',
    title: 'House Manual – Ocean Vista Rentals',
    updatedAt: '4 months ago',
    category: 'Master Document',
    hasPdf: false,
    hasLink: false,
    enabled: true,
  },
];

export default function KnowledgePage() {
  const [items, setItems] = useState<KBItem[]>(initialItems);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState('Recent');
  const [dragging, setDragging] = useState(false);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const filtered = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="flex gap-5 h-[calc(100vh-var(--topbar-h))]">
      {/* LEFT SIDEBAR */}
      <div
        className="w-[240px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto"
      >
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
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              alert('File upload coming soon!');
            }}
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
          <h2 className="text-lg font-semibold text-navy">All Content</h2>
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
                  {['Recent', 'Oldest', 'Name A-Z', 'Category'].map((s) => (
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
              onClick={() => alert('New item form coming soon!')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue text-white text-xs font-medium rounded-lg hover:bg-blue-light transition-colors"
            >
              <Plus size={13} />
              New Item
            </button>
          </div>
        </div>

        {/* KB Items List */}
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-[10px] px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow"
              style={{ boxShadow: 'var(--shadow)' }}
            >
              {/* PDF Icon */}
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <FileText size={16} className="text-red" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock size={11} className="text-gray-400" />
                  <span className="text-[11px] text-gray-400">Updated {item.updatedAt}</span>
                  <span className="text-[11px] px-2 py-0.5 bg-blue-subtle text-blue rounded-full font-medium">
                    {item.category}
                  </span>
                  {item.hasPdf && (
                    <span className="text-[11px] px-2 py-0.5 bg-red-50 text-red rounded-full font-medium">
                      PDF
                    </span>
                  )}
                </div>
              </div>

              {/* Toggle or Link */}
              <div className="flex-shrink-0">
                {item.hasLink ? (
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-blue">
                    <ArrowUpRight size={15} />
                  </button>
                ) : (
                  <Toggle
                    checked={item.enabled}
                    onChange={() => toggleItem(item.id)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No knowledge items found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
