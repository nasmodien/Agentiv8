'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Clock, Send, CheckCircle, AlertTriangle, ArrowUp,
  Wifi, Car, BookOpen, Wine, Utensils, Plane, RefreshCw, ArrowLeft, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ConversationStatus = 'AI_HANDLED' | 'NEEDS_REVIEW' | 'ESCALATED' | 'RESOLVED';
type Channel = 'all' | 'AIRBNB' | 'BOOKING_COM' | 'DIRECT' | 'WHATSAPP' | 'SMS';

interface DbMessage {
  id: string;
  role: 'GUEST' | 'AI' | 'HUMAN';
  content: string;
  createdAt: string;
}

interface DbConversation {
  id: string;
  channel: string;
  status: ConversationStatus;
  lastMessageAt: string;
  booking: {
    id: string;
    guestName: string;
    guestEmail: string | null;
    guestPhone: string | null;
    checkIn: string;
    checkOut: string;
    adults: number;
    channel: string;
    status?: string;
    totalPrice?: number | null;
    guestTotal?: number | null;
  } | null;
  property: {
    id?: string;
    name: string;
    unitNumber: string | null;
    address?: string | null;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    wifiNetwork: string | null;
    wifiPassword: string | null;
    parkingSpot: string | null;
    parkingCode: string | null;
  } | null;
  messages: DbMessage[];
}

const CHANNEL_COLORS: Record<string, string> = {
  AIRBNB: '#ff5a5f', BOOKING_COM: '#003580', DIRECT: '#2563eb', WHATSAPP: '#25d366', SMS: '#6b7280',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusBadge({ status }: { status: ConversationStatus }) {
  if (status === 'AI_HANDLED') return (
    <span className="flex items-center gap-0.5 text-[10px] font-medium text-green">
      <CheckCircle size={10} /> AI Handled
    </span>
  );
  if (status === 'NEEDS_REVIEW') return (
    <span className="flex items-center gap-0.5 text-[10px] font-medium text-red">
      <AlertTriangle size={10} /> Needs Review
    </span>
  );
  if (status === 'ESCALATED') return (
    <span className="flex items-center gap-0.5 text-[10px] font-medium text-orange">
      <ArrowUp size={10} /> Escalated
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-medium text-gray-400">
      <CheckCircle size={10} /> Resolved
    </span>
  );
}

const channelTabs: { key: Channel; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'AIRBNB', label: 'Airbnb' },
  { key: 'BOOKING_COM', label: 'Booking.com' },
  { key: 'DIRECT', label: 'Direct' },
  { key: 'WHATSAPP', label: 'WhatsApp' },
];

type StatusFilter = 'all' | 'AI_HANDLED' | 'NEEDS_REVIEW' | 'ESCALATED' | 'RESOLVED';

export default function MessagesPage() {
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [allProperties, setAllProperties] = useState<{ id: string; name: string; unitNumber: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  // Mobile: 'list' | 'chat' | 'info'
  const [mobilePanel, setMobilePanel] = useState<'list' | 'chat' | 'info'>('list');
  const [activeChannel, setActiveChannel] = useState<Channel>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const buildUrl = useCallback((cursor?: string) => {
    const params = new URLSearchParams({ limit: '50' });
    if (selectedPropertyId !== 'all') params.set('propertyId', selectedPropertyId);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (cursor) params.set('cursor', cursor);
    return `/api/messages?${params}`;
  }, [selectedPropertyId, statusFilter, searchQuery]);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(buildUrl());
      const data = await res.json();
      setConversations(data.conversations ?? []);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
      if (!selectedId && data.conversations?.length > 0) setSelectedId(data.conversations[0].id);
    } catch { /* keep existing */ }
    finally { setLoading(false); }
  }, [buildUrl, selectedId]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(nextCursor));
      const data = await res.json();
      setConversations(prev => [...prev, ...(data.conversations ?? [])]);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } finally { setLoadingMore(false); }
  };

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    fetch('/api/properties?orgId=default').then(r => r.json()).then(d => {
      setAllProperties(d.properties ?? []);
    }).catch(() => {});
  }, [fetchConversations]);

  // Server handles property/status/search filters; client filters channel only
  const filtered = activeChannel === 'all'
    ? conversations
    : conversations.filter(c => c.channel === activeChannel || c.booking?.channel === activeChannel);


  const selected = conversations.find(c => c.id === selectedId) ?? null;

  const handleSend = async () => {
    if (!message.trim() || !selectedId) return;
    setSending(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedId, content: message, role: 'HUMAN' }),
      });
      setMessage('');
      await fetchConversations();
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-var(--topbar-h))] text-gray-400">
      <RefreshCw size={20} className="animate-spin mr-2" /> Loading conversations...
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h)-var(--mobile-nav-h))] md:h-[calc(100vh-var(--topbar-h))] gap-0 md:gap-4">
      {/* LEFT: Inbox */}
      <div className={cn(
        "flex-shrink-0 bg-white border-r border-gray-200 flex flex-col w-full md:w-[340px]",
        mobilePanel !== 'list' && "hidden md:flex"
      )}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-navy">
              Inbox
              <span className="ml-1.5 text-xs font-normal text-gray-400">{filtered.length}{hasMore ? '+' : ''}</span>
            </h2>
            <select
              value={selectedPropertyId}
              onChange={e => { setSelectedPropertyId(e.target.value); setSelectedId(null); setConversations([]); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-navy bg-white focus:outline-none max-w-[130px] truncate"
            >
              <option value="all">All Properties</option>
              {allProperties.map(p => (
                <option key={p.id} value={p.id}>{p.unitNumber ?? p.name}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex gap-1 flex-wrap mb-2">
            {([
              { key: 'all', label: 'All' },
              { key: 'AI_HANDLED', label: 'AI' },
              { key: 'ESCALATED', label: 'Escalated' },
              { key: 'NEEDS_REVIEW', label: 'Review' },
              { key: 'RESOLVED', label: 'Resolved' },
            ] as { key: StatusFilter; label: string }[]).map(s => (
              <button key={s.key} onClick={() => { setStatusFilter(s.key); setConversations([]); setSelectedId(null); }}
                className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
                  statusFilter === s.key ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Channel filter */}
          <div className="flex gap-1 flex-wrap mb-2">
            {channelTabs.map((ch) => (
              <button key={ch.key} onClick={() => setActiveChannel(ch.key)}
                className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
                  activeChannel === ch.key ? 'bg-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                {ch.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search guests or messages..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { setConversations([]); fetchConversations(); } }}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="text-center text-gray-400 text-xs py-8"><RefreshCw size={14} className="animate-spin inline mr-1" />Loading...</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-12">No conversations found</div>
          )}
          {filtered.map((conv) => {
            const name = conv.booking?.guestName ?? 'Guest';
            const lastMsg = conv.messages[conv.messages.length - 1]?.content ?? '';
            const channelLabel = conv.booking?.channel ?? conv.channel;
            const unit = conv.property?.unitNumber ?? conv.property?.name ?? '';
            return (
              <button
                key={conv.id}
                onClick={() => { setSelectedId(conv.id); setMobilePanel('chat'); }}
                className={cn(
                  'w-full text-left px-4 py-3.5 border-b border-gray-50 transition-all flex items-start gap-3',
                  selectedId === conv.id
                    ? 'bg-blue-subtle border-l-[3px] border-l-blue'
                    : conv.status === 'ESCALATED'
                    ? 'border-l-[3px] border-l-red hover:bg-gray-50'
                    : 'hover:bg-gray-50'
                )}
              >
                <div className="w-9 h-9 rounded-full bg-navy flex-shrink-0 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">{initials(name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-navy truncate">{name}</span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{relativeTime(conv.lastMessageAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-0.5 truncate">{unit} · {channelLabel}</p>
                  <p className="text-xs text-gray-400 truncate mb-1">{lastMsg.slice(0, 60)}</p>
                  <StatusBadge status={conv.status} />
                </div>
              </button>
            );
          })}
          {hasMore && (
            <button onClick={loadMore} disabled={loadingMore}
              className="w-full py-3 text-xs text-blue hover:bg-blue-subtle transition-colors flex items-center justify-center gap-1.5 border-t border-gray-100">
              {loadingMore ? <RefreshCw size={12} className="animate-spin" /> : null}
              {loadingMore ? 'Loading...' : 'Load more conversations'}
            </button>
          )}
        </div>
      </div>

      {/* CENTER: Chat */}
      <div className={cn(
        "flex-1 flex flex-col bg-white border-r border-gray-200 min-w-0",
        mobilePanel === 'list' && "hidden md:flex"
      )}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-3 md:px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2 md:gap-3">
                {/* Back button — mobile only */}
                <button
                  onClick={() => setMobilePanel('list')}
                  className="md:hidden p-1 -ml-1 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-semibold">{initials(selected.booking?.guestName ?? 'G')}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">{selected.booking?.guestName ?? 'Guest'}</p>
                  <p className="text-xs text-gray-500">
                    {selected.property?.unitNumber ?? selected.property?.name ?? ''} · {selected.booking?.channel ?? selected.channel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                {/* Info button — mobile only */}
                <button
                  onClick={() => setMobilePanel('info')}
                  className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <Info size={17} />
                </button>
                <button className="hidden md:block px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                  Mark Resolved
                </button>
                <button className="hidden md:block px-3 py-1.5 text-xs font-medium bg-navy text-white rounded-lg hover:opacity-90 transition-colors">
                  Escalate
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {selected.messages.map((msg) => (
                <div key={msg.id} className={cn('flex', msg.role !== 'GUEST' ? 'justify-end' : 'justify-start')}>
                  <div className="max-w-[75%]">
                    {msg.role === 'GUEST' && (
                      <div className="px-4 py-3 rounded-2xl rounded-bl-[4px] text-sm text-gray-800 bg-white border border-gray-200">
                        {msg.content}
                      </div>
                    )}
                    {msg.role === 'AI' && (
                      <div className="px-4 py-3 rounded-2xl rounded-br-[4px] text-sm text-blue border border-blue/20"
                        style={{ background: 'linear-gradient(135deg, #e8f0fe, #dbeafe)' }}>
                        {msg.content}
                      </div>
                    )}
                    {msg.role === 'HUMAN' && (
                      <div className="px-4 py-3 rounded-2xl rounded-br-[4px] text-sm text-white bg-navy">
                        {msg.content}
                      </div>
                    )}
                    <p className={cn('text-[10px] text-gray-400 mt-1', msg.role !== 'GUEST' ? 'text-right' : 'text-left')}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {selected.messages.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">No messages yet</div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-gray-100 flex-shrink-0">
              <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <button className="flex-shrink-0 text-gray-400 hover:text-gray-600 mb-0.5">
                  <Clock size={16} />
                </button>
                <textarea
                  rows={1}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm resize-none focus:outline-none text-gray-800 placeholder-gray-400"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !message.trim()}
                  className="flex-shrink-0 w-8 h-8 bg-blue rounded-lg flex items-center justify-center hover:bg-blue-light transition-colors disabled:opacity-50"
                >
                  <Send size={14} className="text-white" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* RIGHT: Guest Details */}
      <div className={cn(
        "flex-shrink-0 bg-white overflow-y-auto w-full md:w-[300px]",
        mobilePanel !== 'info' && "hidden md:block"
      )}>
        {selected && (
          <div className="p-5">
            {/* Back to chat — mobile only */}
            <button
              onClick={() => setMobilePanel('chat')}
              className="md:hidden flex items-center gap-1.5 text-sm text-blue mb-4 -ml-1"
            >
              <ArrowLeft size={16} /> Back to chat
            </button>
            {/* 1. Guest avatar + name + property unit */}
            <div className="text-center mb-5 pb-5 border-b border-gray-100">
              <div className="w-14 h-14 rounded-full bg-navy flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-lg font-semibold">{initials(selected.booking?.guestName ?? 'G')}</span>
              </div>
              <p className="font-semibold text-navy text-sm">{selected.booking?.guestName ?? 'Guest'}</p>
              <p className="text-xs text-gray-500">{selected.property?.unitNumber ?? selected.property?.name ?? ''}</p>
              {/* 2. Guest contact */}
              {selected.booking?.guestEmail && (
                <p className="text-xs text-gray-400 mt-1">{selected.booking.guestEmail}</p>
              )}
              {selected.booking?.guestPhone && (
                <p className="text-xs text-gray-400">{selected.booking.guestPhone}</p>
              )}
            </div>

            {/* 3. Reservation section */}
            {selected.booking && (() => {
              const bk = selected.booking;
              const pr = selected.property;
              const checkIn = new Date(bk.checkIn);
              const checkOut = new Date(bk.checkOut);
              const nightCount = Math.max(Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000), 1);
              const statusBadgeMap: Record<string, { label: string; color: string }> = {
                CONFIRMED:   { label: 'Confirmed',   color: 'bg-green-100 text-green-700' },
                CHECKED_IN:  { label: 'Checked In',  color: 'bg-blue-100 text-blue-700' },
                CHECKED_OUT: { label: 'Checked Out', color: 'bg-gray-100 text-gray-600' },
                CANCELLED:   { label: 'Cancelled',   color: 'bg-red-100 text-red-600' },
              };
              const badge = bk.status ? (statusBadgeMap[bk.status] ?? { label: bk.status, color: 'bg-gray-100 text-gray-600' }) : null;
              const channelColor = CHANNEL_COLORS[bk.channel] ?? '#9ca3af';
              const zarFmt = (n: number) => `ZAR ${Math.round(n).toLocaleString('en-ZA')}`;
              return (
                <div className="mb-5 pb-5 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Reservation</h3>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2.5">
                    {/* Status badge */}
                    <div className="flex items-center justify-between">
                      {badge && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                      )}
                      {(bk.guestTotal ?? 0) > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Paid</span>
                      )}
                    </div>
                    {/* Channel */}
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: channelColor }} />
                      <span className="text-xs text-gray-600">{bk.channel.replace('_', '.')}</span>
                    </div>
                    {/* Property name + address */}
                    {pr && (
                      <div>
                        <p className="text-xs font-medium text-navy">{pr.unitNumber ?? pr.name}</p>
                        {pr.address && <p className="text-[10px] text-gray-400">{pr.address}</p>}
                      </div>
                    )}
                    {/* Check-in / Check-out dates side by side */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-gray-400">Check-in</p>
                        <p className="text-xs font-medium text-navy">{checkIn.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' })}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Check-out</p>
                        <p className="text-xs font-medium text-navy">{checkOut.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' })}</p>
                      </div>
                    </div>
                    {/* Check-in time / Check-out time side by side */}
                    {pr && (pr.checkInTime || pr.checkOutTime) && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-gray-400">Check-in time</p>
                          <p className="text-xs font-medium text-navy">{pr.checkInTime ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400">Check-out time</p>
                          <p className="text-xs font-medium text-navy">{pr.checkOutTime ?? '—'}</p>
                        </div>
                      </div>
                    )}
                    {/* Nights / Guests side by side */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-gray-400">Nights</p>
                        <p className="text-xs font-medium text-navy">{nightCount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Guests</p>
                        <p className="text-xs font-medium text-navy">{bk.adults} adults</p>
                      </div>
                    </div>
                    {/* Financial row */}
                    {((bk.guestTotal ?? 0) > 0 || (bk.totalPrice ?? 0) > 0) && (
                      <div className="pt-1.5 border-t border-gray-200 space-y-1">
                        {(bk.guestTotal ?? 0) > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-500">Total</span>
                            <span className="text-xs font-semibold text-navy">{zarFmt(bk.guestTotal!)}</span>
                          </div>
                        )}
                        {(bk.totalPrice ?? 0) > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-500">Payout</span>
                            <span className="text-xs font-medium text-green-700">{zarFmt(bk.totalPrice!)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 4. Property Info section */}
            {selected.property && (
              <div className="space-y-3 mb-5 pb-5 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Property Info</h3>
                <div className="space-y-2.5">
                  {selected.property.wifiNetwork && (
                    <div className="flex items-center gap-2.5">
                      <Wifi size={13} className="text-blue flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-navy">{selected.property.wifiNetwork}</p>
                        <p className="text-[10px] text-gray-400">{selected.property.wifiPassword}</p>
                      </div>
                    </div>
                  )}
                  {selected.property.parkingSpot && (
                    <div className="flex items-center gap-2.5">
                      <Car size={13} className="text-blue flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-navy">Spot #{selected.property.parkingSpot}</p>
                        {selected.property.parkingCode && (
                          <p className="text-[10px] text-gray-400">Code: {selected.property.parkingCode}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <button className="flex items-center gap-2 text-xs text-blue hover:underline">
                    <BookOpen size={12} /> View House Manual
                  </button>
                </div>
              </div>
            )}

            {/* 5. Concierge section */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Concierge</h3>
              <div className="space-y-2">
                {[
                  { icon: Wine, label: 'Wine Tour', price: 'R1,750' },
                  { icon: Utensils, label: 'Restaurant', price: 'R350' },
                  { icon: Plane, label: 'Airport Transfer', price: 'R850' },
                ].map((item) => (
                  <button key={item.label} className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg hover:bg-blue-subtle transition-colors group">
                    <div className="flex items-center gap-2">
                      <item.icon size={13} className="text-gray-500 group-hover:text-blue" />
                      <span className="text-xs font-medium text-navy">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{item.price}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
