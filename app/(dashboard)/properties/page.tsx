'use client';

import { useState, useEffect, useCallback } from 'react';
import { Home, Plus, Wifi, Car, Clock, Users, Search, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface Property {
  id: string;
  name: string;
  unitNumber: string | null;
  address: string | null;
  wifiNetwork: string | null;
  wifiPassword: string | null;
  parkingSpot: string | null;
  parkingCode: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  bookings: { guestName: string; checkIn: string; checkOut: string; status: string }[];
}

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch('/api/properties?orgId=default');
      const data = await res.json();
      if (data.properties?.length > 0) {
        setProperties(data.properties);
      }
    } catch {
      // keep existing state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const handleSync = async () => {
    setSyncState('syncing');
    setSyncMessage('');
    try {
      const res = await fetch('/api/hostaway/sync?orgId=default&type=all');
      const data = await res.json();

      if (!res.ok) {
        setSyncState('error');
        setSyncMessage(data.error ?? 'Sync failed');
        return;
      }

      const { listings, reservations, messages } = data.results ?? {};
      setSyncState('success');
      setSyncMessage(
        `Synced ${listings?.synced ?? 0} properties, ${reservations?.synced ?? 0} bookings, and ${messages?.synced ?? 0} messages from Hostaway`
      );
      await fetchProperties();
      setTimeout(() => setSyncState('idle'), 5000);
    } catch {
      setSyncState('error');
      setSyncMessage('Could not connect to Hostaway. Check your API credentials in Settings.');
    }
  };

  const filtered = properties.filter(
    (p) =>
      (p.unitNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.address ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const currentGuest = (p: Property) =>
    p.bookings?.find((b) => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN');

  return (
    <div className="max-w-5xl mx-auto space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center">
            <Home size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">Properties</h1>
            <p className="text-sm text-gray-500">
              {properties.length > 0 ? `${properties.length} properties synced from Hostaway` : 'Sync your Hostaway listings'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncState === 'syncing'}
            className="flex items-center gap-2 bg-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={syncState === 'syncing' ? 'animate-spin' : ''} />
            {syncState === 'syncing' ? 'Syncing...' : 'Sync from Hostaway'}
          </button>
          <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Plus size={14} />
            Add Manual
          </button>
        </div>
      </div>

      {/* Sync status message */}
      {syncState === 'success' && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green text-sm font-medium px-4 py-3 rounded-lg">
          <CheckCircle size={15} />
          {syncMessage}
        </div>
      )}
      {syncState === 'error' && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red text-sm font-medium px-4 py-3 rounded-lg">
          <AlertCircle size={15} />
          {syncMessage}
        </div>
      )}

      {/* No credentials warning */}
      {!loading && properties.length === 0 && syncState === 'idle' && (
        <div className="bg-blue-subtle border border-blue/20 rounded-lg px-5 py-4 text-sm text-navy">
          <p className="font-semibold mb-1">Connect Hostaway to get started</p>
          <p className="text-gray-500">
            Go to <a href="/settings" className="text-blue font-medium hover:underline">Settings</a> → Hostaway Integration → enter your Account ID and API Key → Save. Then click <strong>Sync from Hostaway</strong>.
          </p>
        </div>
      )}

      {/* Search */}
      {properties.length > 0 && (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-light"
          />
        </div>
      )}

      {/* Stats */}
      {properties.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Properties', value: properties.length, color: 'text-navy' },
            { label: 'Occupied', value: properties.filter(p => currentGuest(p)?.status === 'CHECKED_IN').length, color: 'text-green' },
            { label: 'Confirmed', value: properties.filter(p => currentGuest(p)?.status === 'CONFIRMED').length, color: 'text-blue' },
            { label: 'Vacant', value: properties.filter(p => !currentGuest(p)).length, color: 'text-gray-400' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-[10px] border border-gray-200 p-4 text-center" style={{ boxShadow: 'var(--shadow)' }}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw size={20} className="animate-spin mr-2" />
          Loading properties...
        </div>
      )}

      {/* Property Cards */}
      <div className="space-y-3">
        {filtered.map((property) => {
          const guest = currentGuest(property);
          return (
            <div
              key={property.id}
              className="bg-white rounded-[10px] border border-gray-200 p-5 hover:border-gray-300 transition-colors"
              style={{ boxShadow: 'var(--shadow)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-subtle flex items-center justify-center flex-shrink-0">
                    <Home size={18} className="text-blue" />
                  </div>
                  <div>
                    <p className="font-bold text-navy">{property.unitNumber ?? property.name}</p>
                    <p className="text-xs text-gray-500">{property.address ?? 'No address'}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  guest?.status === 'CHECKED_IN' ? 'bg-green-100 text-green-700' :
                  guest?.status === 'CONFIRMED' ? 'bg-blue-100 text-blue' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {guest?.status === 'CHECKED_IN' ? 'Occupied' :
                   guest?.status === 'CONFIRMED' ? 'Arriving' : 'Vacant'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4">
                {property.wifiNetwork && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Wifi size={13} className="text-gray-400" />
                    <span className="text-gray-400">WiFi:</span>
                    <span className="font-medium">{property.wifiNetwork} / {property.wifiPassword}</span>
                  </div>
                )}
                {property.parkingSpot && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Car size={13} className="text-gray-400" />
                    <span className="text-gray-400">Parking:</span>
                    <span className="font-medium">Spot #{property.parkingSpot}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock size={13} className="text-gray-400" />
                  <span className="text-gray-400">Check-in:</span>
                  <span className="font-medium">{property.checkInTime ?? '15:00'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock size={13} className="text-gray-400" />
                  <span className="text-gray-400">Check-out:</span>
                  <span className="font-medium">{property.checkOutTime ?? '11:00'}</span>
                </div>
              </div>

              {guest && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-gray-400" />
                    <span className="text-xs text-gray-600">
                      <span className="font-semibold text-navy">{guest.guestName}</span>
                      {' · '}
                      {new Date(guest.checkIn).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                      {' – '}
                      {new Date(guest.checkOut).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <a href="/messages" className="text-xs text-blue hover:underline font-medium">Message</a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
