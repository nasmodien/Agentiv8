'use client';

import { useState, useEffect, useRef, useCallback, Suspense, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ChevronDown, Send, RefreshCw, RotateCcw, X,
  CheckCircle, Sparkles, Search, Pencil, PanelRight,
  Upload, Plus, Trash2, FileText, FlaskConical,
} from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { cn } from '@/lib/utils';
import { OPENROUTER_MODELS, DEFAULT_MODEL } from '@/lib/ai-client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Property {
  id: string;
  name: string;
  unitNumber: string | null;
  address: string | null;
  suburb: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  maxGuests: number | null;
  wifiNetwork: string | null;
  wifiPassword: string | null;
  parkingSpot: string | null;
  parkingCode: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  createdAt: string;
}

interface KBItem {
  id: string;
  orgId: string;
  propertyId: string | null;
  title: string;
  category: string;
  content: string | null;
  fileType: string | null;
  enabled: boolean;
  createdAt: string;
}

interface TestMessage {
  role: 'user' | 'assistant';
  content: string;
  sendAs?: 'guest' | 'host';
}

const CATEGORIES = [
  'Check-In Instructions', 'House Rules', 'WiFi & Technology',
  'Parking & Transport', 'Concierge Info', 'Access Codes',
  'Guest FAQs', 'General', 'Booking & Reservations',
];

// ─── Custom Select ────────────────────────────────────────────────────────────
function Select({ value, onChange, options, placeholder = 'Select' }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className={cn('w-full flex items-center justify-between px-3 py-2.5 border rounded-lg text-sm transition-colors bg-white',
          open ? 'border-blue ring-2 ring-blue/20' : 'border-gray-200 hover:border-gray-300',
          !value ? 'text-gray-400' : 'text-navy')}>
        {selected?.label ?? placeholder}
        <ChevronDown size={14} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-30 max-h-52 overflow-y-auto">
          {options.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn('w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors',
                o.value === value ? 'text-navy font-medium' : 'text-gray-700')}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SettingRow ───────────────────────────────────────────────────────────────
function SettingRow({ label, required = true, description, children }: {
  label: string; required?: boolean; description?: string; children: ReactNode;
}) {
  return (
    <div className="flex items-start py-5 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0 pr-8">
        <p className="text-sm font-medium text-navy">
          {label}{required && <span className="text-red ml-0.5">*</span>}
        </p>
        {description && <p className="text-xs text-blue mt-0.5 leading-snug">{description}</p>}
      </div>
      <div className="w-[320px] flex-shrink-0">{children}</div>
    </div>
  );
}

// ─── Context helpers ──────────────────────────────────────────────────────────
function ContextSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-3">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function CtxRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-[11px] text-gray-400 w-24 flex-shrink-0">{label}</span>
      <span className="text-[11px] text-navy font-medium flex-1 break-words">{value}</span>
    </div>
  );
}

// ─── Property Facts Panel ─────────────────────────────────────────────────────
type FactsView = 'list' | 'add' | 'upload';

function PropertyFactsPanel({ property, orgId, onClose }: {
  property: Property; orgId: string; onClose: () => void;
}) {
  const [view, setView] = useState<FactsView>('list');
  const [facts, setFacts] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add fact form
  const [factName, setFactName] = useState('');
  const [factDetails, setFactDetails] = useState('');
  const [factCategory, setFactCategory] = useState('General');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Upload form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge?orgId=${orgId}&propertyId=${property.id}`);
      const data = await res.json();
      setFacts(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [orgId, property.id]);

  useEffect(() => { loadFacts(); }, [loadFacts]);

  const handleSaveFact = async () => {
    if (!factName.trim() || !factDetails.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId, propertyId: property.id,
          title: factName, category: factCategory, content: factDetails,
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setView('list'); setFactName(''); setFactDetails('');
        setFactCategory('General'); setSaveSuccess(false);
        loadFacts();
      }, 700);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fact?')) return;
    setDeletingId(id);
    await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' });
    setFacts(prev => prev.filter(f => f.id !== id));
    setDeletingId(null);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('orgId', orgId);
      fd.append('propertyId', property.id);
      fd.append('category', 'General');
      await fetch('/api/knowledge/upload', { method: 'POST', body: fd });
      setUploadSuccess(true);
      setTimeout(() => {
        setView('list'); setUploadFile(null);
        setUploadSuccess(false); loadFacts();
      }, 700);
    } finally {
      setUploading(false);
    }
  };

  const propLabel = property.unitNumber ?? property.name;

  return (
    <div className="w-[360px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {view !== 'list' && (
              <button onClick={() => setView('list')} className="text-xs text-blue hover:underline">← Back</button>
            )}
            {view === 'list' && <p className="text-sm font-semibold text-navy truncate max-w-[200px]">{propLabel}</p>}
            {view === 'add' && <p className="text-sm font-semibold text-navy">Add fact</p>}
            {view === 'upload' && <p className="text-sm font-semibold text-navy">Upload facts</p>}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={14} />
          </button>
        </div>
        {view === 'list' && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400 flex-1">
              {property.address ?? 'Cape Town'} · <span className="font-medium text-navy">{facts.length} facts</span>
            </p>
            <button onClick={() => setView('upload')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              <Upload size={12} /> Upload facts
            </button>
            <button onClick={() => setView('add')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy text-white rounded-lg text-xs font-medium hover:bg-navy/90 transition-colors">
              <Plus size={12} /> Add fact
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* LIST VIEW */}
        {view === 'list' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <RefreshCw size={16} className="animate-spin mr-2" /> Loading...
              </div>
            ) : facts.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Search size={20} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">No facts</p>
                <p className="text-xs text-gray-400">Create a fact or upload a document</p>
              </div>
            ) : (
              <div>
                {facts.map(fact => (
                  <div key={fact.id} className="px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors group flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText size={13} className="text-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy truncate">{fact.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fact.category}</p>
                      {fact.content && <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{fact.content}</p>}
                    </div>
                    <button onClick={() => handleDelete(fact.id)} disabled={deletingId === fact.id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                      {deletingId === fact.id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ADD FACT VIEW */}
        {view === 'add' && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Name <span className="text-red">*</span></label>
              <input value={factName} onChange={e => setFactName(e.target.value)}
                placeholder="Name"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Details <span className="text-red">*</span></label>
              <textarea rows={5} value={factDetails} onChange={e => setFactDetails(e.target.value)}
                placeholder="Details"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Category <span className="text-red">*</span></label>
              <Select value={factCategory} onChange={setFactCategory}
                options={CATEGORIES.map(c => ({ value: c, label: c }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Applies to</label>
              <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
                <span className="text-xs text-gray-500">Specific listing:</span>
                <span className="text-xs font-medium text-navy truncate">{propLabel}</span>
              </div>
            </div>
          </div>
        )}

        {/* UPLOAD VIEW */}
        {view === 'upload' && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Upload file <span className="text-red">*</span></label>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }} />
              <div onClick={() => fileInputRef.current?.click()}
                className={cn('border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                  uploadFile ? 'border-blue bg-blue-subtle' : 'border-gray-200 hover:border-gray-300')}>
                <Upload size={24} className="mx-auto mb-3 text-gray-300" />
                {uploadFile ? (
                  <p className="text-sm font-medium text-blue">{uploadFile.name}</p>
                ) : (
                  <>
                    <p className="text-xs text-blue font-medium">Click to upload</p>
                    <p className="text-[11px] text-gray-400 mt-1">or drag and drop</p>
                    <p className="text-[11px] text-gray-400 mt-1">PDF (max. 50MB)</p>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Applies to</label>
              <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
                <span className="text-xs text-gray-500">Specific listing:</span>
                <span className="text-xs font-medium text-navy truncate">{propLabel}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {view !== 'list' && (
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <button onClick={() => setView('list')}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          {view === 'add' && (
            <button onClick={handleSaveFact} disabled={saving || saveSuccess || !factName.trim() || !factDetails.trim()}
              className={cn('flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors',
                saveSuccess ? 'bg-green text-white' : 'bg-navy text-white hover:bg-navy/90 disabled:opacity-50')}>
              {saving && <RefreshCw size={11} className="animate-spin" />}
              {saveSuccess && <CheckCircle size={11} />}
              {saveSuccess ? 'Saved!' : saving ? 'Saving...' : 'Save fact'}
            </button>
          )}
          {view === 'upload' && (
            <button onClick={handleUpload} disabled={uploading || uploadSuccess || !uploadFile}
              className={cn('flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors',
                uploadSuccess ? 'bg-green text-white' : 'bg-navy text-white hover:bg-navy/90 disabled:opacity-50')}>
              {uploading && <RefreshCw size={11} className="animate-spin" />}
              {uploadSuccess && <CheckCircle size={11} />}
              {uploadSuccess ? 'Uploaded!' : uploading ? 'Uploading...' : '+ Upload facts'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Test AI Panel ────────────────────────────────────────────────────────────
function TestPanel({ properties, kbItems, tone, answerLength, model, onClose }: {
  properties: Property[]; kbItems: KBItem[]; tone: string; answerLength: string; model: string; onClose: () => void;
}) {
  const [testTab, setTestTab] = useState<'test' | 'context'>('test');
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id ?? '');
  const [sendAs, setSendAs] = useState<'guest' | 'host'>('guest');
  const [sendAsOpen, setSendAsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedPropertyId || loading) return;
    const userMsg: TestMessage = { role: 'user', content: input, sendAs };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          message: input,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          sendAs, tone, answerLength, model,
        }),
      });
      const data = await res.json();
      if (data.reply) setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } finally {
      setLoading(false);
    }
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const kbCount = kbItems.filter(k => !k.propertyId || k.propertyId === selectedPropertyId).length;

  return (
    <div className="w-[340px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-1">
          <FlaskConical size={14} className="text-blue mr-1" />
          {(['test', 'context'] as const).map(t => (
            <button key={t} onClick={() => setTestTab(t)}
              className={cn('px-3 py-1.5 text-xs font-medium capitalize transition-colors rounded-md',
                testTab === t ? 'bg-blue-subtle text-blue' : 'text-gray-500 hover:text-gray-700')}>
              {t === 'test' ? 'Test AI' : 'Context'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMessages([])} title="Reset"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <RotateCcw size={13} />
          </button>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>

      {testTab === 'test' ? (
        <>
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Test as property</p>
            <select value={selectedPropertyId} onChange={e => { setSelectedPropertyId(e.target.value); setMessages([]); }}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-navy bg-white focus:outline-none focus:ring-2 focus:ring-blue/20">
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.unitNumber ?? p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <Sparkles size={22} className="mx-auto mb-3 text-blue opacity-40" />
                <p className="text-xs text-gray-400">Send a message to test the AI</p>
                {selectedProperty && (
                  <p className="text-[11px] text-gray-300 mt-1">{selectedProperty.unitNumber ?? selectedProperty.name}</p>
                )}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === 'user' && (
                  <div className="mb-1">
                    <p className="text-[10px] font-medium text-gray-400 mb-1 capitalize">{msg.sendAs ?? 'Guest'}</p>
                    <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-gray-800 max-w-[90%]">{msg.content}</div>
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div className="mb-1 flex justify-end">
                    <div>
                      <p className="text-[10px] font-medium text-blue mb-1 text-right flex items-center justify-end gap-1">
                        <Sparkles size={10} /> AI reply
                      </p>
                      <div className="rounded-xl rounded-tr-sm px-3 py-2 text-xs text-blue border border-blue/20 max-w-[90%] ml-auto"
                        style={{ background: 'linear-gradient(135deg, #e8f0fe, #dbeafe)' }}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="rounded-xl px-3 py-2 border border-blue/20" style={{ background: 'linear-gradient(135deg, #e8f0fe, #dbeafe)' }}>
                  <RefreshCw size={12} className="animate-spin text-blue" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <button onClick={() => setSendAsOpen(!sendAsOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-navy hover:bg-gray-50 transition-colors w-full">
                  Send as {sendAs === 'guest' ? 'Guest' : 'Host'}
                  <ChevronDown size={11} className={cn('text-gray-400 ml-auto transition-transform', sendAsOpen && 'rotate-180')} />
                </button>
                {sendAsOpen && (
                  <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[130px] z-20">
                    {(['guest', 'host'] as const).map(role => (
                      <button key={role} onClick={() => { setSendAs(role); setSendAsOpen(false); }}
                        className={cn('w-full text-left px-3 py-2 text-xs capitalize hover:bg-gray-50 transition-colors',
                          sendAs === role ? 'text-blue font-medium' : 'text-gray-700')}>
                        Send as {role} {sendAs === role && <CheckCircle size={10} className="inline ml-1" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={handleSend} disabled={!input.trim() || loading}
                className="w-8 h-8 bg-blue rounded-lg flex items-center justify-center hover:bg-blue-light transition-colors disabled:opacity-40 flex-shrink-0">
                <Send size={13} className="text-white" />
              </button>
            </div>
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Write a message..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue/20" />
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-navy">AI Context</p>
            <p className="text-[11px] text-gray-400">Context AI uses for drafting replies</p>
          </div>

          {selectedProperty ? (
            <>
              {/* Listing details */}
              <ContextSection title="Listing details">
                <CtxRow label="Name" value={selectedProperty.unitNumber ?? selectedProperty.name} />
                {selectedProperty.address && <CtxRow label="Address" value={selectedProperty.address} />}
                {selectedProperty.suburb && <CtxRow label="Suburb" value={selectedProperty.suburb} />}
                {selectedProperty.city && <CtxRow label="City" value={selectedProperty.city} />}
                {selectedProperty.country && <CtxRow label="Country" value={selectedProperty.country} />}
                {selectedProperty.bedrooms != null && <CtxRow label="Bedrooms" value={String(selectedProperty.bedrooms)} />}
                {selectedProperty.bathrooms != null && <CtxRow label="Bathrooms" value={String(selectedProperty.bathrooms)} />}
                {selectedProperty.maxGuests != null && <CtxRow label="Max guests" value={String(selectedProperty.maxGuests)} />}
                <CtxRow label="Check-in" value={selectedProperty.checkInTime ?? '15:00'} />
                <CtxRow label="Check-out" value={selectedProperty.checkOutTime ?? '11:00'} />
              </ContextSection>

              {/* Access info */}
              <ContextSection title="Access information">
                <CtxRow label="WiFi" value={selectedProperty.wifiNetwork ?? 'Not set'} />
                <CtxRow label="WiFi password" value={selectedProperty.wifiPassword ?? 'Not set'} />
                {selectedProperty.parkingSpot && <CtxRow label="Parking spot" value={selectedProperty.parkingSpot} />}
                {selectedProperty.parkingCode && <CtxRow label="Parking code" value={selectedProperty.parkingCode} />}
              </ContextSection>

              {/* Description */}
              {selectedProperty.description && (
                <ContextSection title="Property description">
                  <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-4">
                    {selectedProperty.description}
                  </p>
                </ContextSection>
              )}

              {/* KB */}
              <ContextSection title="Knowledge Base">
                <p className="text-[11px] text-gray-500">{kbCount} item{kbCount !== 1 ? 's' : ''} available — retrieved dynamically per question</p>
              </ContextSection>

              {/* AI settings */}
              <ContextSection title="AI settings">
                <CtxRow label="Model" value={model.split('/').pop() ?? model} />
                <CtxRow label="Tone" value={tone || 'friendly'} />
                <CtxRow label="Answer length" value={answerLength || 'standard'} />
              </ContextSection>
            </>
          ) : (
            <p className="text-xs text-gray-400">Select a property to see context.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function AIPageInner() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') === 'kb' ? 'kb' : 'general';

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiModel, setAiModel] = useState(DEFAULT_MODEL);
  const [tone, setTone] = useState('');
  const [answerLength, setAnswerLength] = useState('');
  const [autoReply, setAutoReply] = useState(false);
  const [autoReplyDelay, setAutoReplyDelay] = useState('none');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [properties, setProperties] = useState<Property[]>([]);
  const [kbItems, setKbItems] = useState<KBItem[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Right panel: 'test' | 'facts' | null
  const [rightPanel, setRightPanel] = useState<'test' | 'facts' | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const orgId = 'default';

  useEffect(() => {
    setLoadingSettings(true);
    fetch('/api/settings?orgId=default').then(r => r.json()).then(d => {
      const s = d.settings ?? {};
      setAiEnabled(s.AI_ENABLED === 'true');
      setAiModel(s.AI_MODEL ?? DEFAULT_MODEL);
      setTone(s.AI_TONE ?? '');
      setAnswerLength(s.AI_ANSWER_LENGTH ?? '');
      setAutoReply(s.AI_AUTO_REPLY === 'true');
      setAutoReplyDelay(s.AI_AUTO_REPLY_DELAY ?? 'none');
    }).catch(() => {}).finally(() => setLoadingSettings(false));
  }, []);

  const loadProperties = useCallback(async () => {
    setLoadingProps(true);
    try {
      const [propsRes, kbRes] = await Promise.all([
        fetch('/api/properties?orgId=default'),
        fetch('/api/knowledge?orgId=default'),
      ]);
      setProperties((await propsRes.json()).properties ?? []);
      setKbItems((await kbRes.json()).items ?? []);
    } finally { setLoadingProps(false); }
  }, []);

  useEffect(() => { loadProperties(); }, [loadProperties]);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: 'default',
          settings: {
            AI_ENABLED: String(aiEnabled), AI_MODEL: aiModel, AI_TONE: tone,
            AI_ANSWER_LENGTH: answerLength, AI_AUTO_REPLY: String(autoReply),
            AI_AUTO_REPLY_DELAY: autoReplyDelay,
          },
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const openPropertyFacts = (prop: Property) => {
    setEditingProperty(prop);
    setRightPanel('facts');
  };

  const filteredProps = properties.filter(p => {
    if (!search) return true;
    return (p.unitNumber ?? p.name).toLowerCase().includes(search.toLowerCase()) ||
      (p.address ?? '').toLowerCase().includes(search.toLowerCase());
  });
  const totalPages = Math.ceil(filteredProps.length / PAGE_SIZE);
  const pagedProps = filteredProps.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 pt-6 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-navy">AI Replies</h1>
              <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full',
                aiEnabled ? 'bg-green/15 text-green' : 'bg-gray-100 text-gray-500')}>
                {aiEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Test AI button */}
              <button onClick={() => setRightPanel(rightPanel === 'test' ? null : 'test')}
                className={cn('flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-medium transition-colors',
                  rightPanel === 'test' ? 'border-blue bg-blue-subtle text-blue' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                <PanelRight size={14} />
                Test AI
              </button>
              {/* Enabled toggle */}
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-500">AI Replies {aiEnabled ? 'enabled' : 'disabled'}</span>
                <Toggle checked={aiEnabled} onChange={() => setAiEnabled(!aiEnabled)} />
              </div>
              {/* Save */}
              <button onClick={handleSave} disabled={saving}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors',
                  saved ? 'bg-green text-white' : 'bg-navy text-white hover:bg-navy/90 disabled:opacity-60')}>
                {saving ? <RefreshCw size={12} className="animate-spin" /> : saved ? <CheckCircle size={12} /> : null}
                {saved ? 'Saved!' : saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-6">
            {[
              { key: 'general', label: 'General', href: '/ai' },
              { key: 'kb', label: 'Knowledge Base', href: '/ai?tab=kb' },
            ].map(t => (
              <a key={t.key} href={t.href}
                className={cn('pb-3 text-sm font-medium border-b-2 transition-colors',
                  tab === t.key ? 'border-blue text-blue' : 'border-transparent text-gray-500 hover:text-gray-700')}>
                {t.label}
              </a>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'general' ? (
            <div className="max-w-3xl mx-auto px-8 py-6">
              {loadingSettings ? (
                <div className="flex items-center gap-2 text-gray-400 py-8"><RefreshCw size={16} className="animate-spin" /> Loading settings...</div>
              ) : (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 px-6 mb-6">
                    <h2 className="text-sm font-semibold text-navy pt-5 pb-4 border-b border-gray-100">General</h2>
                    <SettingRow label="AI Model" required={false}>
                      <div>
                        <Select value={aiModel} onChange={setAiModel} placeholder="Select model"
                          options={OPENROUTER_MODELS.map(m => ({
                            value: m.value,
                            label: `${m.provider} · ${m.label}`,
                          }))} />
                        {aiModel && (() => {
                          const m = OPENROUTER_MODELS.find(x => x.value === aiModel);
                          const tierColor = { cheap: 'text-green', balanced: 'text-blue', powerful: 'text-orange' }[m?.tier ?? 'balanced'] ?? 'text-gray-400';
                          const tierLabel = { cheap: 'Low cost', balanced: 'Balanced', powerful: 'High performance' }[m?.tier ?? 'balanced'];
                          return (
                            <p className={`text-[11px] mt-1.5 font-medium ${tierColor}`}>
                              {tierLabel} · via OpenRouter
                            </p>
                          );
                        })()}
                      </div>
                    </SettingRow>
                    <SettingRow label="Tone of voice">
                      <Select value={tone} onChange={setTone} placeholder="Select"
                        options={[{ value: 'friendly', label: 'Friendly' }, { value: 'neutral', label: 'Neutral' }, { value: 'professional', label: 'Professional' }, { value: 'custom', label: 'Custom' }]} />
                    </SettingRow>
                    <SettingRow label="Answer length">
                      <Select value={answerLength} onChange={setAnswerLength} placeholder="Select"
                        options={[{ value: 'concise', label: 'Concise' }, { value: 'standard', label: 'Standard' }, { value: 'thorough', label: 'Thorough' }]} />
                    </SettingRow>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 px-6 mb-6">
                    <div className="py-5 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-sm font-semibold text-navy">Auto-reply</h2>
                          <p className="text-xs text-blue mt-1">Enable automatic AI replies to guest messages</p>
                        </div>
                        <Toggle checked={autoReply} onChange={() => setAutoReply(!autoReply)} />
                      </div>
                    </div>
                    <SettingRow label="Auto-reply delay" description="Set a reply delay to give your team a chance to reply or to make it feel more human">
                      <Select value={autoReplyDelay} onChange={setAutoReplyDelay}
                        options={[{ value: 'none', label: 'None' }, { value: '1', label: '1 minute' }, { value: '2', label: '2 minutes' }, { value: '3', label: '3 minutes' }, { value: '5', label: '5 minutes' }, { value: '8', label: '8 minutes' }, { value: '10', label: '10 minutes' }, { value: '15', label: '15 minutes' }, { value: '30', label: '30 minutes' }]} />
                    </SettingRow>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="px-8 py-6">
              <div className="flex justify-end mb-4">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search" value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue/20 bg-white w-52" />
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-[1fr_160px_100px_140px_48px] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Listing</p>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Location</p>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Facts</p>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Last updated</p>
                  <div />
                </div>
                {loadingProps ? (
                  <div className="flex items-center justify-center py-12 text-gray-400">
                    <RefreshCw size={16} className="animate-spin mr-2" /> Loading...
                  </div>
                ) : pagedProps.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">No properties found</div>
                ) : (
                  pagedProps.map((prop, idx) => {
                    const factsCount = kbItems.filter(k => k.propertyId === prop.id).length;
                    return (
                      <div key={prop.id}
                        className={cn('grid grid-cols-[1fr_160px_100px_140px_48px] gap-4 px-5 py-4 items-center hover:bg-gray-50 transition-colors',
                          idx < pagedProps.length - 1 && 'border-b border-gray-100',
                          editingProperty?.id === prop.id && 'bg-blue-subtle')}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-blue-subtle flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-blue">
                            {(prop.unitNumber ?? prop.name).slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-blue truncate">{prop.unitNumber ?? prop.name}</span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{prop.address ?? 'Cape Town'}</p>
                        <p className="text-sm text-gray-600">{factsCount}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(prop.createdAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </p>
                        <button onClick={() => openPropertyFacts(prop)}
                          className={cn('w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
                            editingProperty?.id === prop.id ? 'bg-blue text-white' : 'hover:bg-blue-subtle text-gray-400 hover:text-blue')}>
                          <Pencil size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              {filteredProps.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-gray-500">{filteredProps.length} of {filteredProps.length} listings</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                      ← Previous
                    </button>
                    <span className="w-8 h-8 flex items-center justify-center bg-blue text-white text-xs rounded-lg font-medium">{page}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right panels */}
      {rightPanel === 'test' && (
        <TestPanel properties={properties} kbItems={kbItems} tone={tone} answerLength={answerLength} model={aiModel}
          onClose={() => setRightPanel(null)} />
      )}
      {rightPanel === 'facts' && editingProperty && (
        <PropertyFactsPanel property={editingProperty} orgId={orgId}
          onClose={() => { setRightPanel(null); setEditingProperty(null); loadProperties(); }} />
      )}
    </div>
  );
}

export default function AIPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[calc(100vh-var(--topbar-h))] text-gray-400">
        <RefreshCw size={20} className="animate-spin mr-2" /> Loading...
      </div>
    }>
      <AIPageInner />
    </Suspense>
  );
}
