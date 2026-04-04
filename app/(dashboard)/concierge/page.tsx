'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, ChevronDown, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

type Category = 'all' | 'wine' | 'tours' | 'inhouse';


interface Service {
  id: string;
  emoji: string;
  name: string;
  description: string;
  price: number;
  commission: number;
  category: Category;
}

const services: Service[] = [
  {
    id: '1',
    emoji: '🍷',
    name: 'Wine Tour',
    description: 'Guided tour of local vineyards with tasting sessions and transport included.',
    price: 1750,
    commission: 20,
    category: 'wine',
  },
  {
    id: '2',
    emoji: '👨‍🍳',
    name: 'Private Chef',
    description: 'In-house chef to cook a custom meal for your group. Menu planning included.',
    price: 2800,
    commission: 20,
    category: 'inhouse',
  },
  {
    id: '3',
    emoji: '⛵',
    name: 'Sunset Sail',
    description: 'Private evening sail along the coastline. Includes drinks and light snacks.',
    price: 3200,
    commission: 15,
    category: 'tours',
  },
  {
    id: '4',
    emoji: '🚗',
    name: 'Airport Transfer',
    description: 'Luxury car transport to and from the airport. Available 24/7.',
    price: 850,
    commission: 15,
    category: 'inhouse',
  },
];

function ConciergePageContent() {
  const searchParams = useSearchParams();
  const activeCategory = (searchParams.get('cat') ?? 'all') as Category;
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [bookedIds, setBookedIds] = useState<string[]>([]);

  const filtered = services.filter((s) => {
    const matchesCat = activeCategory === 'all' || s.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleBook = (service: Service) => {
    setBookedIds((prev) => [...prev, service.id]);
    setTimeout(() => {
      setBookedIds((prev) => prev.filter((id) => id !== service.id));
    }, 2000);
    alert(`Booking initiated: ${service.name} for R${service.price.toLocaleString('en-ZA')}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-navy">🎩 Concierge</h1>
          <button
            onClick={() => setPropertyOpen(!propertyOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            All Properties
            <ChevronDown size={14} className="text-gray-400" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Total Earned:</span>
          <span className="text-sm font-bold text-green">R45,550</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/20 w-52"
          />
        </div>
      </div>

      {/* Services Heading */}
      <div>
        <h2 className="text-base font-semibold text-navy">Local Services &amp; Experiences</h2>
        <p className="text-sm text-gray-500 mt-0.5">{filtered.length} services available</p>
      </div>

      {/* Service Cards */}
      <div className="space-y-3">
        {filtered.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-[10px] p-5 flex items-center gap-5 hover:shadow-md transition-shadow"
            style={{ boxShadow: 'var(--shadow)' }}
          >
            {/* Emoji Image */}
            <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-3xl flex-shrink-0">
              {service.emoji}
            </div>

            {/* Service Body */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-navy">{service.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{service.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-navy">
                    R{service.price.toLocaleString('en-ZA')}
                  </p>
                  <p className="text-xs text-green font-medium">{service.commission}% Commission</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-gray-400 capitalize">{service.category === 'inhouse' ? 'In-House' : service.category === 'wine' ? 'Wine & Dine' : 'Local Tours'}</span>
                <div className="flex-1" />
                <button
                  onClick={() => handleBook(service)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all',
                    bookedIds.includes(service.id)
                      ? 'bg-green text-white'
                      : 'bg-blue text-white hover:bg-blue-light'
                  )}
                >
                  <ShoppingBag size={12} />
                  {bookedIds.includes(service.id) ? 'Booked!' : 'Book'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No services found matching your search.</p>
        </div>
      )}
    </div>
  );
}

export default function ConciergePage() {
  return (
    <Suspense>
      <ConciergePageContent />
    </Suspense>
  );
}
