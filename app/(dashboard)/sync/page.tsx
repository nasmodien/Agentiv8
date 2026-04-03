'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Home, CalendarDays, MessageSquare, CheckCircle, XCircle, ChevronRight, AlertTriangle } from 'lucide-react';

interface SyncResult {
  synced?: number;
  total?: number;
  note?: string;
  // conversations-specific
  conversations?: number;
  messages?: number;
  skipped?: number;
  hasMore?: boolean;
  nextOffset?: number;
  batchSize?: number;
  offset?: number;
  totalHostaway?: number;
}

type SyncStatus = 'idle' | 'running' | 'done' | 'error';

interface SyncState {
  status: SyncStatus;
  result: SyncResult | null;
  error: string | null;
  totalConvsSynced: number;
  totalMsgsSynced: number;
  convOffset: number;
}

function SyncCard({
  icon: Icon,
  title,
  description,
  color,
  state,
  onSync,
  extra,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  state: SyncState;
  onSync: () => void;
  extra?: React.ReactNode;
}) {
  const isRunning = state.status === 'running';
  const isDone = state.status === 'done';
  const isError = state.status === 'error';

  return (
    <div className="bg-white rounded-[10px] border border-gray-200 overflow-hidden" style={{ boxShadow: 'var(--shadow)' }}>
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-navy text-sm">{title}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        {isDone && <CheckCircle size={16} className="text-green flex-shrink-0" />}
        {isError && <XCircle size={16} className="text-red flex-shrink-0" />}
      </div>

      <div className="px-5 py-4">
        {/* Progress bar */}
        {isRunning && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <RefreshCw size={12} className="animate-spin text-blue" />
              <span className="text-xs text-blue font-medium">Syncing...</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {/* Result */}
        {isDone && state.result && (
          <div className="mb-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 space-y-0.5">
            {state.result.synced != null && <div>✓ Synced: <strong>{state.result.synced}</strong> items</div>}
            {state.result.total != null && state.result.total !== state.result.synced && (
              <div>Total in Hostaway: <strong>{state.result.total}</strong></div>
            )}
            {state.result.conversations != null && <div>✓ Conversations: <strong>{state.totalConvsSynced}</strong></div>}
            {state.result.messages != null && <div>✓ Messages: <strong>{state.totalMsgsSynced}</strong></div>}
            {state.result.skipped != null && state.result.skipped > 0 && (
              <div className="text-gray-500">↷ Skipped (no new msgs): <strong>{state.result.skipped}</strong></div>
            )}
          </div>
        )}

        {isError && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            {state.error}
          </div>
        )}

        {extra}

        <button
          onClick={onSync}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 bg-navy text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isRunning
            ? <><RefreshCw size={14} className="animate-spin" /> Syncing...</>
            : <><RefreshCw size={14} /> {state.status === 'done' ? 'Sync Again' : 'Sync Now'}</>
          }
        </button>
      </div>
    </div>
  );
}

const defaultState = (): SyncState => ({
  status: 'idle', result: null, error: null,
  totalConvsSynced: 0, totalMsgsSynced: 0, convOffset: 0,
});

export default function SyncPage() {
  const [listings, setListings] = useState<SyncState>(defaultState());
  const [reservations, setReservations] = useState<SyncState>(defaultState());
  const [conversations, setConversations] = useState<SyncState>(defaultState());
  const [dbCounts, setDbCounts] = useState<{ properties: number; bookings: number; conversations: number; messages: number } | null>(null);

  useEffect(() => {
    fetch('/api/sync-stats').then(r => r.json()).then(setDbCounts).catch(() => {});
  }, [conversations.status, listings.status, reservations.status]);

  const syncType = async (
    type: 'listings' | 'reservations',
    setState: React.Dispatch<React.SetStateAction<SyncState>>
  ) => {
    setState(s => ({ ...s, status: 'running', error: null }));
    try {
      const res = await fetch(`/api/hostaway/sync?orgId=default&type=${type}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Sync failed');
      const result = data.results?.[type === 'listings' ? 'listings' : 'reservations'] ?? {};
      setState(s => ({ ...s, status: 'done', result }));
    } catch (e) {
      setState(s => ({ ...s, status: 'error', error: String(e) }));
    }
  };

  const syncConversationBatch = async (offset: number, accumulated: SyncState) => {
    try {
      const res = await fetch(`/api/hostaway/sync?orgId=default&type=conversations&offset=${offset}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Sync failed');
      const r = data.results?.conversations ?? {};
      const newTotalConvs = accumulated.totalConvsSynced + (r.synced ?? 0);
      const newTotalMsgs = accumulated.totalMsgsSynced + (r.messages ?? 0);

      setConversations({
        status: 'done',
        result: r,
        error: null,
        totalConvsSynced: newTotalConvs,
        totalMsgsSynced: newTotalMsgs,
        convOffset: r.nextOffset ?? offset + 30,
      });
    } catch (e) {
      setConversations(s => ({ ...s, status: 'error', error: String(e) }));
    }
  };

  const startConvSync = () => {
    const offset = conversations.status === 'done' && conversations.result?.hasMore
      ? (conversations.convOffset)
      : 0;

    const accumulated: SyncState = offset === 0
      ? { ...defaultState(), status: 'running' }
      : { ...conversations, status: 'running' };

    setConversations(accumulated);
    syncConversationBatch(offset, accumulated);
  };

  const resetConvSync = () => {
    setConversations(s => ({ ...s, convOffset: 0, totalConvsSynced: 0, totalMsgsSynced: 0 }));
    setConversations({ ...defaultState(), status: 'running' });
    syncConversationBatch(0, defaultState());
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy">Sync Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Sync your Hostaway data individually with real-time progress</p>
      </div>

      {/* DB Counts */}
      {dbCounts && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Properties', value: dbCounts.properties, color: 'text-blue' },
            { label: 'Bookings', value: dbCounts.bookings, color: 'text-navy' },
            { label: 'Conversations', value: dbCounts.conversations, color: 'text-green' },
            { label: 'Messages', value: dbCounts.messages, color: 'text-orange' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-[10px] p-4 border border-gray-200" style={{ boxShadow: 'var(--shadow)' }}>
              <p className="text-xs text-gray-500">{item.label} in DB</p>
              <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Warning about conversations limit */}
      <div className="bg-amber-50 border border-amber-200 rounded-[10px] px-4 py-3 flex items-start gap-2">
        <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700">
          <strong>Conversations are synced in batches of 30</strong> to avoid timeouts (Hostaway allows ~100 messages per conversation, 2 req/sec rate limit).
          If you have many conversations, click &quot;Sync Next Batch&quot; multiple times until done.
          Already up-to-date conversations are skipped automatically.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Listings */}
        <SyncCard
          icon={Home}
          title="Listings / Properties"
          description="Sync property names, addresses, WiFi, check-in times"
          color="bg-blue"
          state={listings}
          onSync={() => syncType('listings', setListings)}
        />

        {/* Reservations */}
        <SyncCard
          icon={CalendarDays}
          title="Reservations"
          description="Sync bookings ±365 days with full financial data"
          color="bg-navy"
          state={reservations}
          onSync={() => syncType('reservations', setReservations)}
        />

        {/* Conversations */}
        <SyncCard
          icon={MessageSquare}
          title="Conversations"
          description="Sync guest messages in batches of 30 (sorted by latest)"
          color="bg-green"
          state={conversations}
          onSync={startConvSync}
          extra={
            conversations.status === 'done' && (
              <div className="mb-3 space-y-2">
                {conversations.result?.hasMore && (
                  <div className="bg-blue-subtle border border-blue/20 rounded-lg px-3 py-2 text-xs text-blue">
                    <div className="font-medium mb-1">More conversations available</div>
                    <div className="text-gray-500">Synced so far: {conversations.totalConvsSynced} convs · {conversations.totalMsgsSynced} msgs</div>
                    <div className="text-gray-500">Next batch starts at offset {conversations.convOffset}</div>
                  </div>
                )}
                {!conversations.result?.hasMore && (
                  <div className="text-xs text-gray-500 text-center">All conversations synced</div>
                )}
                {conversations.result?.hasMore && (
                  <button
                    onClick={startConvSync}
                    disabled={(conversations.status as string) === 'running'}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-blue border border-blue/30 rounded-lg py-2 hover:bg-blue-subtle transition-colors"
                  >
                    Sync Next Batch <ChevronRight size={12} />
                  </button>
                )}
                <button
                  onClick={resetConvSync}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 text-center py-1"
                >
                  Start over from beginning
                </button>
              </div>
            )
          }
        />
      </div>

      {/* Sync all button */}
      <div className="bg-white rounded-[10px] border border-gray-200 px-5 py-4 flex items-center justify-between" style={{ boxShadow: 'var(--shadow)' }}>
        <div>
          <p className="text-sm font-semibold text-navy">Full Sync (Listings + Reservations)</p>
          <p className="text-xs text-gray-500">Syncs properties and bookings together. Run conversations separately.</p>
        </div>
        <button
          onClick={async () => {
            await syncType('listings', setListings);
            await syncType('reservations', setReservations);
          }}
          disabled={listings.status === 'running' || reservations.status === 'running'}
          className="flex items-center gap-2 bg-navy text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw size={14} /> Sync Listings + Reservations
        </button>
      </div>
    </div>
  );
}
