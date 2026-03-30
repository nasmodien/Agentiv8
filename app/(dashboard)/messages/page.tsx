'use client';

import { useState } from 'react';
import {
  Search,
  Clock,
  Send,
  CheckCircle,
  AlertTriangle,
  ArrowUp,
  Wifi,
  Car,
  BookOpen,
  Wine,
  Utensils,
  Plane,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ConversationStatus = 'ai_handled' | 'needs_review' | 'escalated';
type Channel = 'all' | 'airbnb' | 'booking' | 'sms' | 'email' | 'whatsapp';

interface Conversation {
  id: string;
  name: string;
  initials: string;
  subject: string;
  time: string;
  status: ConversationStatus;
  channel: string;
  unit: string;
}

const conversations: Conversation[] = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    initials: 'SM',
    subject: 'WiFi Password?',
    time: '2m ago',
    status: 'ai_handled',
    channel: 'Airbnb',
    unit: 'Unit 5',
  },
  {
    id: '2',
    name: 'Tom & Lisa',
    initials: 'TL',
    subject: 'Late Checkout Request',
    time: '5m ago',
    status: 'escalated',
    channel: 'Booking.com',
    unit: 'Unit 8',
  },
  {
    id: '3',
    name: 'Anna Patel',
    initials: 'AP',
    subject: 'Check-In Info?',
    time: '10m ago',
    status: 'ai_handled',
    channel: 'Airbnb',
    unit: 'Unit 3',
  },
  {
    id: '4',
    name: 'John Davis',
    initials: 'JD',
    subject: 'Parking Instructions',
    time: '22m ago',
    status: 'ai_handled',
    channel: 'Direct',
    unit: 'Unit 5',
  },
  {
    id: '5',
    name: 'Maria Kim',
    initials: 'MK',
    subject: 'Early Check-In Request',
    time: '45m ago',
    status: 'ai_handled',
    channel: 'WhatsApp',
    unit: 'Unit 9',
  },
];

interface Message {
  id: string;
  role: 'guest' | 'ai' | 'human';
  content: string;
  time: string;
}

const sampleMessages: Message[] = [
  {
    id: '1',
    role: 'guest',
    content: "Hi, what's the WiFi password?",
    time: '10:42 AM',
  },
  {
    id: '2',
    role: 'ai',
    content:
      'Hi Sarah! The WiFi network is OceanViewGuest and the password is sunset2026. Let me know if you need anything else!',
    time: '10:42 AM',
  },
];

const channels: { key: Channel; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'airbnb', label: 'Airbnb' },
  { key: 'booking', label: 'Booking.com' },
  { key: 'sms', label: 'SMS' },
  { key: 'email', label: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp' },
];

function StatusBadge({ status }: { status: ConversationStatus }) {
  if (status === 'ai_handled') {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-medium text-green">
        <CheckCircle size={10} />
        AI Handled
      </span>
    );
  }
  if (status === 'needs_review') {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-medium text-red">
        <AlertTriangle size={10} />
        Needs Review
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-medium text-orange">
      <ArrowUp size={10} />
      Escalated
    </span>
  );
}

export default function MessagesPage() {
  const [activeChannel, setActiveChannel] = useState<Channel>('all');
  const [selectedId, setSelectedId] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');

  const selected = conversations.find((c) => c.id === selectedId)!;

  const filtered = conversations.filter((c) => {
    const matchesChannel =
      activeChannel === 'all' ||
      c.channel.toLowerCase().replace('.', '').replace(' ', '') ===
        activeChannel.replace('.', '').replace(' ', '');
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] gap-4">
      {/* LEFT: Inbox Panel */}
      <div className="w-[340px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-navy mb-3">Unified Inbox</h2>
          {/* Channel Tabs */}
          <div className="flex gap-1 flex-wrap mb-3">
            {channels.map((ch) => (
              <button
                key={ch.key}
                onClick={() => setActiveChannel(ch.key)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  activeChannel === ch.key
                    ? ch.key === 'whatsapp'
                      ? 'bg-green text-white'
                      : 'bg-blue text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {ch.label}
              </button>
            ))}
          </div>
          {/* Search */}
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

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={cn(
                'w-full text-left px-4 py-3.5 border-b border-gray-50 transition-all flex items-start gap-3 relative',
                selectedId === conv.id
                  ? 'bg-blue-subtle border-l-[3px] border-l-blue'
                  : conv.status === 'escalated'
                  ? 'border-l-[3px] border-l-red hover:bg-gray-50'
                  : 'hover:bg-gray-50'
              )}
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-navy flex-shrink-0 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">{conv.initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-semibold text-navy truncate">{conv.name}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{conv.time}</span>
                </div>
                <p className="text-xs text-gray-600 truncate mb-1">{conv.subject}</p>
                <StatusBadge status={conv.status} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CENTER: Chat Panel */}
      <div className="flex-1 flex flex-col bg-white border-r border-gray-200 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center">
              <span className="text-white text-xs font-semibold">{selected.initials}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-navy">{selected.name}</p>
              <p className="text-xs text-gray-500">{selected.unit} – Ocean Vista Rentals</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
              View Profile
            </button>
            <button className="px-3 py-1.5 text-xs font-medium bg-navy text-white rounded-lg hover:bg-navy-light transition-colors">
              Mark Resolved
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {sampleMessages.map((msg) => (
            <div key={msg.id} className={cn('flex', msg.role === 'ai' ? 'justify-end' : 'justify-start')}>
              <div className="max-w-[75%]">
                {msg.role === 'guest' && (
                  <div
                    className="px-4 py-3 rounded-2xl rounded-bl-[4px] text-sm text-gray-800"
                    style={{
                      background: 'white',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    {msg.content}
                  </div>
                )}
                {msg.role === 'ai' && (
                  <>
                    <div
                      className="px-4 py-3 rounded-2xl rounded-br-[4px] text-sm text-blue border border-blue/20"
                      style={{
                        background: 'linear-gradient(135deg, #e8f0fe, #dbeafe)',
                      }}
                    >
                      {msg.content}
                    </div>
                    <div className="flex gap-2 mt-2 justify-end">
                      <button
                        onClick={() => alert('Marked as resolved')}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-green border border-green/30 rounded-lg hover:bg-green-50 transition-colors"
                      >
                        <CheckCircle size={11} /> Mark as Resolved
                      </button>
                      <button
                        onClick={() => alert('Escalated to human agent')}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red border border-red/30 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <ArrowUp size={11} /> Escalate to Human
                      </button>
                    </div>
                  </>
                )}
                <p className={cn('text-[10px] text-gray-400 mt-1', msg.role === 'ai' ? 'text-right' : 'text-left')}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="px-5 py-3.5 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <button className="flex-shrink-0 text-gray-400 hover:text-gray-600 mb-0.5">
              <Clock size={16} />
            </button>
            <textarea
              rows={1}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message or use AI to draft..."
              className="flex-1 bg-transparent text-sm resize-none focus:outline-none text-gray-800 placeholder-gray-400"
            />
            <button
              onClick={() => { if (message.trim()) setMessage(''); }}
              className="flex-shrink-0 w-8 h-8 bg-blue rounded-lg flex items-center justify-center hover:bg-blue-light transition-colors"
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Guest Details Panel */}
      <div className="w-[280px] flex-shrink-0 bg-white overflow-y-auto">
        <div className="p-5">
          {/* Guest Details */}
          <div className="text-center mb-5 pb-5 border-b border-gray-100">
            <div className="w-14 h-14 rounded-full bg-navy flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-lg font-semibold">{selected.initials}</span>
            </div>
            <p className="font-semibold text-navy text-sm">{selected.name}</p>
            <p className="text-xs text-gray-500">{selected.unit} – Ocean Vista Rentals</p>
          </div>

          {/* Details */}
          <div className="space-y-3 mb-5 pb-5 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Guest Details</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Check-in</span>
                <span className="text-xs font-medium text-navy">Dec 14 · 15:00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Check-out</span>
                <span className="text-xs font-medium text-navy">Dec 17 · 11:00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Guests</span>
                <span className="text-xs font-medium text-navy">2 adults</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Booked via</span>
                <span className="text-xs font-medium text-navy">{selected.channel}</span>
              </div>
            </div>
          </div>

          {/* Property Info */}
          <div className="space-y-3 mb-5 pb-5 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Property Info</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <Wifi size={13} className="text-blue flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-navy">OceanViewGuest</p>
                  <p className="text-[10px] text-gray-400">sunset2026</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Car size={13} className="text-blue flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-navy">Spot B-12</p>
                  <p className="text-[10px] text-gray-400">Parking code: 4892</p>
                </div>
              </div>
              <button className="flex items-center gap-2 text-xs text-blue hover:underline">
                <BookOpen size={12} />
                View House Manual
              </button>
            </div>
          </div>

          {/* Concierge Suggestions */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Concierge</h3>
            <div className="space-y-2">
              {[
                { icon: Wine, label: 'Wine Tour', price: 'R1,750' },
                { icon: Utensils, label: 'Restaurant', price: 'R350' },
                { icon: Plane, label: 'Airport Transfer', price: 'R850' },
              ].map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg hover:bg-blue-subtle transition-colors group"
                >
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
      </div>
    </div>
  );
}
