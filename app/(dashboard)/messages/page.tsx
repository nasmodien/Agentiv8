'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Clock, Send, CheckCircle, AlertTriangle, ArrowUp,
  Wifi, Car, BookOpen, Wine, Utensils, Plane, RefreshCw,
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
  } | null;
  property: { name: string; unitNumber: string | null; wifiNetwork: string | null; wifiPassword: string | null; parkingSpot: string | null; parkingCode: string | null } | null;
  messages: DbMessage[];
}

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

export default function MessagesPage() {
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<Channel>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      if (data.conversations?.length > 0) {
        setConversations(data.conversations);
        if (!selectedId) setSelectedId(data.conversations[0].id);
      }
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const filtered = conversations.filter((c) => {
    const matchChannel = activeChannel === 'all' || c.channel === activeChannel || c.booking?.channel === activeChannel;
    const guestName = c.booking?.guestName ?? '';
    const lastMsg = c.messages[c.messages.length - 1]?.content ?? '';
    const matchSearch = !searchQuery ||
      guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMsg.toLowerCase().includes(searchQuery.toLowerCase());
    return matchChannel && matchSearch;
  });

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
    <div className="flex h-[calc(100vh-var(--topbar-h))] gap-4">
      {/* LEFT: Inbox */}
      <div className="w-[340px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-navy mb-3">
            Unified Inbox
            {conversations.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">{conversations.length} conversations</span>
            )}
          </h2>
          <div className="flex gap-1 flex-wrap mb-3">
            {channelTabs.map((ch) => (
              <button
                key={ch.key}
                onClick={() => setActiveChannel(ch.key)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  activeChannel === ch.key ? 'bg-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {ch.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
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
                onClick={() => setSelectedId(conv.id)}
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
        </div>
      </div>

      {/* CENTER: Chat */}
      <div className="flex-1 flex flex-col bg-white border-r border-gray-200 min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">{initials(selected.booking?.guestName ?? 'G')}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">{selected.booking?.guestName ?? 'Guest'}</p>
                  <p className="text-xs text-gray-500">
                    {selected.property?.unitNumber ?? selected.property?.name ?? ''} · {selected.booking?.channel ?? selected.channel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                  Mark Resolved
                </button>
                <button className="px-3 py-1.5 text-xs font-medium bg-navy text-white rounded-lg hover:opacity-90 transition-colors">
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
      <div className="w-[280px] flex-shrink-0 bg-white overflow-y-auto">
        {selected && (
          <div className="p-5">
            <div className="text-center mb-5 pb-5 border-b border-gray-100">
              <div className="w-14 h-14 rounded-full bg-navy flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-lg font-semibold">{initials(selected.booking?.guestName ?? 'G')}</span>
              </div>
              <p className="font-semibold text-navy text-sm">{selected.booking?.guestName ?? 'Guest'}</p>
              <p className="text-xs text-gray-500">{selected.property?.unitNumber ?? selected.property?.name ?? ''}</p>
              {selected.booking?.guestEmail && (
                <p className="text-xs text-gray-400 mt-1">{selected.booking.guestEmail}</p>
              )}
              {selected.booking?.guestPhone && (
                <p className="text-xs text-gray-400">{selected.booking.guestPhone}</p>
              )}
            </div>

            {selected.booking && (
              <div className="space-y-3 mb-5 pb-5 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Reservation</h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Check-in</span>
                    <span className="text-xs font-medium text-navy">
                      {new Date(selected.booking.checkIn).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Check-out</span>
                    <span className="text-xs font-medium text-navy">
                      {new Date(selected.booking.checkOut).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Guests</span>
                    <span className="text-xs font-medium text-navy">{selected.booking.adults} adults</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Channel</span>
                    <span className="text-xs font-medium text-navy">{selected.booking.channel}</span>
                  </div>
                </div>
              </div>
            )}

            {selected.property && (
              <div className="space-y-3 mb-5 pb-5 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Property</h3>
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
