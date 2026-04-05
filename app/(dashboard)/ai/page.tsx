'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ChevronDown, Send, RefreshCw, RotateCcw, X,
  CheckCircle, Sparkles, Search, Pencil, PanelRight,
} from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Property {
  id: string;
  name: string;
  unitNumber: string | null;
  address: string | null;
  createdAt: string;
}

interface KBItem {
  id: string;
  orgId: string;
}

interface TestMessage {
  role: 'user' | 'assistant';
  content: string;
  sendAs?: 'guest' | 'host';
}

// ─── Select component ─────────────────────────────────────────────────────────
interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}
function Select({ value, onChange, options, placeholder = 'Select' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 border rounded-lg text-sm transition-colors bg-white',
          open ? 'border-blue ring-2 ring-blue/20' : 'border-gray-200 hover:border-gray-300',
          !value ? 'text-gray-400' : 'text-navy'
        )}
      >
        {selected?.label ?? placeholder}
        <ChevronDown size={14} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors',
                o.value === value ? 'text-navy font-medium' : 'text-gray-700'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AI Test Panel ────────────────────────────────────────────────────────────
interface TestPanelProps {
  properties: Property[];
  tone: string;
  answerLength: string;
  onClose: () => void;
}

function TestPanel({ properties, tone, answerLength, onClose }: TestPanelProps) {
  const [testTab, setTestTab] = useState<'test' | 'context'>('test');
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id ?? '');
  const [sendAs, setSendAs] = useState<'guest' | 'host'>('guest');
  const [sendAsOpen, setSendAsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedPropertyId || loading) return;
    const userMsg: TestMessage = { role: 'user', content: input, sendAs };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          message: input,
          history,
          sendAs,
          tone,
          answerLength,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  return (
    <div className="w-[320px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex gap-1">
          {(['test', 'context'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTestTab(t)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors',
                testTab === t ? 'text-blue border-b-2 border-blue rounded-none pb-1' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t === 'test' ? 'Test AI' : 'Context'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMessages([])}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Reset conversation"
          >
            <RotateCcw size={13} />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {testTab === 'test' ? (
        <>
          {/* Test as */}
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Test as</p>
            <select
              value={selectedPropertyId}
              onChange={e => { setSelectedPropertyId(e.target.value); setMessages([]); }}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 text-navy bg-white focus:outline-none focus:ring-2 focus:ring-blue/20"
            >
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.unitNumber ?? p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles size={24} className="mx-auto mb-3 text-blue opacity-50" />
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
                    <p className="text-[10px] font-medium text-gray-400 mb-1 capitalize">
                      {msg.sendAs ?? 'Guest'}
                    </p>
                    <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-gray-800 inline-block max-w-full">
                      {msg.content}
                    </div>
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div className="mb-1 flex justify-end">
                    <div>
                      <p className="text-[10px] font-medium text-blue mb-1 text-right flex items-center justify-end gap-1">
                        <Sparkles size={10} /> AI reply
                      </p>
                      <div
                        className="rounded-xl rounded-tr-sm px-3 py-2 text-xs text-blue border border-blue/20 max-w-full"
                        style={{ background: 'linear-gradient(135deg, #e8f0fe, #dbeafe)' }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="rounded-xl rounded-tr-sm px-3 py-2 border border-blue/20" style={{ background: 'linear-gradient(135deg, #e8f0fe, #dbeafe)' }}>
                  <RefreshCw size={12} className="animate-spin text-blue" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              {/* Send as dropdown */}
              <div className="relative flex-1">
                <button
                  onClick={() => setSendAsOpen(!sendAsOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-navy hover:bg-gray-50 transition-colors"
                >
                  Send as {sendAs === 'guest' ? 'Guest' : 'Host'}
                  <ChevronDown size={11} className={cn('text-gray-400 transition-transform', sendAsOpen && 'rotate-180')} />
                </button>
                {sendAsOpen && (
                  <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[130px] z-20">
                    {(['guest', 'host'] as const).map(role => (
                      <button
                        key={role}
                        onClick={() => { setSendAs(role); setSendAsOpen(false); }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-xs capitalize hover:bg-gray-50 transition-colors',
                          sendAs === role ? 'text-blue font-medium' : 'text-gray-700'
                        )}
                      >
                        Send as {role}
                        {sendAs === role && <CheckCircle size={10} className="inline ml-1.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="w-8 h-8 bg-blue rounded-lg flex items-center justify-center hover:bg-blue-light transition-colors disabled:opacity-40"
              >
                <Send size={13} className="text-white" />
              </button>
            </div>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Write..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue/20 placeholder-gray-400"
            />
          </div>
        </>
      ) : (
        /* Context tab */
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="text-xs font-semibold text-navy mb-3">Active context for AI</p>
          {selectedProperty ? (
            <div className="space-y-3">
              <div className="bg-blue-subtle rounded-xl p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Property</p>
                <p className="text-xs font-medium text-navy">{selectedProperty.unitNumber ?? selectedProperty.name}</p>
                {selectedProperty.address && <p className="text-[11px] text-gray-500 mt-0.5">{selectedProperty.address}</p>}
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">AI Settings</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[11px] text-gray-500">Tone</span>
                    <span className="text-[11px] font-medium text-navy capitalize">{tone || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] text-gray-500">Length</span>
                    <span className="text-[11px] font-medium text-navy capitalize">{answerLength || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Select a property to see context.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Row component ─────────────────────────────────────────────────────────────
function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start py-5 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0 pr-8">
        <p className="text-sm font-medium text-navy">
          {label}
          <span className="text-red ml-0.5">*</span>
        </p>
        {description && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</p>}
      </div>
      <div className="w-[320px] flex-shrink-0">{children}</div>
    </div>
  );
}

// ─── Main page (inner) ────────────────────────────────────────────────────────
function AIPageInner() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') === 'kb' ? 'kb' : 'general';

  const [aiEnabled, setAiEnabled] = useState(false);
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

  const [testPanelOpen, setTestPanelOpen] = useState(false);

  // Load settings
  useEffect(() => {
    setLoadingSettings(true);
    fetch('/api/settings?orgId=default')
      .then(r => r.json())
      .then(d => {
        const s = d.settings ?? {};
        setAiEnabled(s.AI_ENABLED === 'true');
        setTone(s.AI_TONE ?? '');
        setAnswerLength(s.AI_ANSWER_LENGTH ?? '');
        setAutoReply(s.AI_AUTO_REPLY === 'true');
        setAutoReplyDelay(s.AI_AUTO_REPLY_DELAY ?? 'none');
      })
      .catch(() => {})
      .finally(() => setLoadingSettings(false));
  }, []);

  // Load properties + KB item count
  const loadProperties = useCallback(async () => {
    setLoadingProps(true);
    try {
      const [propsRes, kbRes] = await Promise.all([
        fetch('/api/properties?orgId=default'),
        fetch('/api/knowledge?orgId=default'),
      ]);
      const propsData = await propsRes.json();
      const kbData = await kbRes.json();
      setProperties(propsData.properties ?? []);
      setKbItems(kbData.items ?? []);
    } finally {
      setLoadingProps(false);
    }
  }, []);

  useEffect(() => { loadProperties(); }, [loadProperties]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: 'default',
          settings: {
            AI_ENABLED: String(aiEnabled),
            AI_TONE: tone,
            AI_ANSWER_LENGTH: answerLength,
            AI_AUTO_REPLY: String(autoReply),
            AI_AUTO_REPLY_DELAY: autoReplyDelay,
          },
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  // KB tab filter + pagination
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page header */}
        <div className="bg-white border-b border-gray-200 px-8 pt-6 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-navy">AI Replies</h1>
              <span className={cn(
                'text-[11px] font-semibold px-2.5 py-1 rounded-full',
                aiEnabled ? 'bg-green/15 text-green' : 'bg-gray-100 text-gray-500'
              )}>
                {aiEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Test AI button */}
              <button
                onClick={() => setTestPanelOpen(!testPanelOpen)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-medium transition-colors',
                  testPanelOpen
                    ? 'border-blue bg-blue-subtle text-blue'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                <PanelRight size={14} />
                Test AI
              </button>
              {/* Enabled toggle */}
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-500">AI Replies {aiEnabled ? 'enabled' : 'disabled'}</span>
                <Toggle checked={aiEnabled} onChange={() => setAiEnabled(!aiEnabled)} />
              </div>
              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors',
                  saved
                    ? 'bg-green text-white'
                    : 'bg-navy text-white hover:bg-navy/90 disabled:opacity-60'
                )}
              >
                {saving ? <RefreshCw size={12} className="animate-spin" /> : saved ? <CheckCircle size={12} /> : null}
                {saved ? 'Saved!' : saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-6">
            {[
              { key: 'general', label: 'General', href: '/ai' },
              { key: 'kb', label: 'Knowledge Base', href: '/ai?tab=kb' },
            ].map(t => (
              <a
                key={t.key}
                href={t.href}
                className={cn(
                  'pb-3 text-sm font-medium border-b-2 transition-colors',
                  tab === t.key
                    ? 'border-blue text-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
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
                <div className="flex items-center gap-2 text-gray-400 py-8">
                  <RefreshCw size={16} className="animate-spin" /> Loading settings...
                </div>
              ) : (
                <>
                  {/* General section */}
                  <div className="bg-white rounded-xl border border-gray-200 px-6 mb-6">
                    <h2 className="text-sm font-semibold text-navy pt-5 pb-4 border-b border-gray-100">General</h2>
                    <SettingRow label="Tone of voice">
                      <Select
                        value={tone}
                        onChange={setTone}
                        placeholder="Select"
                        options={[
                          { value: 'friendly', label: 'Friendly' },
                          { value: 'neutral', label: 'Neutral' },
                          { value: 'professional', label: 'Professional' },
                          { value: 'custom', label: 'Custom' },
                        ]}
                      />
                    </SettingRow>
                    <SettingRow label="Answer length">
                      <Select
                        value={answerLength}
                        onChange={setAnswerLength}
                        placeholder="Select"
                        options={[
                          { value: 'concise', label: 'Concise' },
                          { value: 'standard', label: 'Standard' },
                          { value: 'thorough', label: 'Thorough' },
                        ]}
                      />
                    </SettingRow>
                  </div>

                  {/* Auto-reply section */}
                  <div className="bg-white rounded-xl border border-gray-200 px-6 mb-6">
                    <div className="py-5 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-sm font-semibold text-navy">Auto-reply</h2>
                          <p className="text-xs text-blue mt-1">
                            Enable automatic AI replies to guest messages
                          </p>
                        </div>
                        <Toggle checked={autoReply} onChange={() => setAutoReply(!autoReply)} />
                      </div>
                    </div>
                    <SettingRow
                      label="Auto-reply delay"
                      description="Set a reply delay to give your team a chance to reply or to make it feel more human"
                    >
                      <Select
                        value={autoReplyDelay}
                        onChange={setAutoReplyDelay}
                        options={[
                          { value: 'none', label: 'None' },
                          { value: '1', label: '1 minute' },
                          { value: '2', label: '2 minutes' },
                          { value: '3', label: '3 minutes' },
                          { value: '5', label: '5 minutes' },
                          { value: '8', label: '8 minutes' },
                          { value: '10', label: '10 minutes' },
                          { value: '15', label: '15 minutes' },
                          { value: '30', label: '30 minutes' },
                        ]}
                      />
                    </SettingRow>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Knowledge Base tab */
            <div className="px-8 py-6">
              {/* Search */}
              <div className="flex justify-end mb-4">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue/20 bg-white w-52"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_160px_100px_140px_48px] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <button className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-left hover:text-navy transition-colors">
                    Listing
                  </button>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Location</p>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Facts</p>
                  <button className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-left hover:text-navy transition-colors">
                    Last updated
                  </button>
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
                    const factsCount = kbItems.filter(k => k.orgId === prop.id).length;
                    const updatedAt = new Date(prop.createdAt);
                    return (
                      <div
                        key={prop.id}
                        className={cn(
                          'grid grid-cols-[1fr_160px_100px_140px_48px] gap-4 px-5 py-4 items-center hover:bg-gray-50 transition-colors',
                          idx < pagedProps.length - 1 && 'border-b border-gray-100'
                        )}
                      >
                        {/* Listing */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-blue-subtle flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-blue">
                            {(prop.unitNumber ?? prop.name).slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-blue hover:underline cursor-pointer truncate">
                            {prop.unitNumber ?? prop.name}
                          </span>
                        </div>
                        {/* Location */}
                        <p className="text-sm text-gray-600 truncate">{prop.address ?? 'Cape Town'}</p>
                        {/* Facts */}
                        <p className="text-sm text-gray-600">{factsCount}</p>
                        {/* Last updated */}
                        <p className="text-sm text-gray-600">
                          {updatedAt.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </p>
                        {/* Edit */}
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-subtle transition-colors text-gray-400 hover:text-blue">
                          <Pencil size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {filteredProps.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-gray-500">
                    {filteredProps.length} of {filteredProps.length} listings
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >
                      ← Previous
                    </button>
                    <span className="w-8 h-8 flex items-center justify-center bg-blue text-white text-xs rounded-lg font-medium">
                      {page}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >
                      Next →
                    </button>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-gray-500">Items per page:</span>
                      <span className="text-xs font-medium text-navy">{PAGE_SIZE}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Test Panel */}
      {testPanelOpen && properties.length > 0 && (
        <TestPanel
          properties={properties}
          tone={tone}
          answerLength={answerLength}
          onClose={() => setTestPanelOpen(false)}
        />
      )}
      {testPanelOpen && properties.length === 0 && (
        <div className="w-[320px] flex-shrink-0 border-l border-gray-200 bg-white flex items-center justify-center">
          <div className="text-center p-6">
            <p className="text-sm text-gray-400">No properties found.</p>
            <p className="text-xs text-gray-300 mt-1">Add a property first to test the AI.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Export with Suspense for useSearchParams ─────────────────────────────────
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
