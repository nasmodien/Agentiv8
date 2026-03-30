'use client';

import { useState } from 'react';
import { Home, Plus, Wifi, Car, Clock, Users, Search } from 'lucide-react';

const mockProperties = [
  {
    id: '1',
    name: 'Ocean Vista Rentals',
    unitNumber: 'Unit 5',
    address: '12 Seabreeze Drive, Cape Town',
    wifiNetwork: 'OceanViewGuest',
    wifiPassword: 'sunset2026',
    parkingSpot: '3',
    parkingCode: '4821',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    status: 'occupied',
    guest: 'Sarah Mitchell',
    checkIn: 'Mar 10',
    checkOut: 'Mar 14',
    rating: 4.9,
  },
  {
    id: '2',
    name: 'Ocean Vista Rentals',
    unitNumber: 'Unit 8',
    address: '12 Seabreeze Drive, Cape Town',
    wifiNetwork: 'OceanViewGuest',
    wifiPassword: 'sunset2026',
    parkingSpot: '7',
    parkingCode: '4821',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    status: 'arriving',
    guest: 'David Cole',
    checkIn: 'Today',
    checkOut: 'Mar 16',
    rating: 4.8,
  },
  {
    id: '3',
    name: 'Ocean Vista Rentals',
    unitNumber: 'Unit 3',
    address: '12 Seabreeze Drive, Cape Town',
    wifiNetwork: 'OceanViewGuest',
    wifiPassword: 'sunset2026',
    parkingSpot: '2',
    parkingCode: '4821',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    status: 'vacant',
    guest: null,
    checkIn: 'Mar 15',
    checkOut: null,
    rating: 4.7,
  },
];

const statusColors: Record<string, string> = {
  occupied: 'bg-green-100 text-green-700',
  arriving: 'bg-blue-100 text-blue',
  vacant: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  occupied: 'Occupied',
  arriving: 'Arriving Today',
  vacant: 'Vacant',
};

export default function PropertiesPage() {
  const [search, setSearch] = useState('');
  const [showAdd, _setShowAdd] = useState(false);
  void showAdd;

  const filtered = mockProperties.filter(
    (p) =>
      p.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      (p.guest?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center">
            <Home size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">Properties</h1>
            <p className="text-sm text-gray-500">{mockProperties.length} units · Ocean Vista Rentals</p>
          </div>
        </div>
        <button
          onClick={() => _setShowAdd(true)}
          className="flex items-center gap-2 bg-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={15} />
          Add Property
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search properties, guests..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-light"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Units', value: '24', color: 'text-navy' },
          { label: 'Occupied', value: '18', color: 'text-green' },
          { label: 'Arriving Today', value: '12', color: 'text-blue' },
          { label: 'Vacant', value: '6', color: 'text-gray-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-[10px] border border-gray-200 p-4 text-center" style={{ boxShadow: 'var(--shadow)' }}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Property Cards */}
      <div className="space-y-3">
        {filtered.map((property) => (
          <div
            key={property.id}
            className="bg-white rounded-[10px] border border-gray-200 p-5 hover:border-gray-300 transition-colors"
            style={{ boxShadow: 'var(--shadow)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-subtle flex items-center justify-center">
                  <Home size={18} className="text-blue" />
                </div>
                <div>
                  <p className="font-bold text-navy">{property.unitNumber}</p>
                  <p className="text-xs text-gray-500">{property.address}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[property.status]}`}>
                {statusLabels[property.status]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Wifi size={13} className="text-gray-400" />
                <span className="text-gray-400">WiFi:</span>
                <span className="font-medium">{property.wifiNetwork} / {property.wifiPassword}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Car size={13} className="text-gray-400" />
                <span className="text-gray-400">Parking:</span>
                <span className="font-medium">Spot #{property.parkingSpot}, Code {property.parkingCode}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Clock size={13} className="text-gray-400" />
                <span className="text-gray-400">Check-in:</span>
                <span className="font-medium">{property.checkInTime}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Clock size={13} className="text-gray-400" />
                <span className="text-gray-400">Check-out:</span>
                <span className="font-medium">{property.checkOutTime}</span>
              </div>
            </div>

            {property.guest && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Users size={13} className="text-gray-400" />
                  <span className="text-xs text-gray-600">
                    <span className="font-semibold text-navy">{property.guest}</span>
                    {' · '}{property.checkIn} – {property.checkOut}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className="text-xs text-blue hover:underline font-medium">Message</button>
                  <button className="text-xs text-gray-500 hover:text-navy font-medium">View Booking</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
