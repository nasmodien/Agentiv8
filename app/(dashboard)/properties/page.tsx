'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Home, Plus, RefreshCw, CheckCircle, AlertCircle, Search,
  Eye, X, Users, BedDouble, DoorOpen, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Property {
  id: string;
  name: string;
  unitNumber: string | null;
  address: string | null;
  wifiNetwork: string | null;
  wifiPassword: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  bookings: { channel: string }[];
  _count?: { bookings: number };
}

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

// Normalise any Hostaway channel name string to a canonical key
function normaliseChannel(raw: string): string {
  const s = raw.toLowerCase().replace(/[\s._-]/g, '');
  if (s.includes('airbnb'))    return 'airbnb';
  if (s.includes('booking'))   return 'booking';
  if (s.includes('vrbo'))      return 'vrbo';
  if (s.includes('homeaway'))  return 'homeaway';
  if (s.includes('expedia'))   return 'expedia';
  if (s.includes('tripadvisor') || s.includes('flipkey')) return 'tripadvisor';
  if (s.includes('google'))    return 'google';
  if (s.includes('wotif'))     return 'wotif';
  if (s.includes('agoda'))     return 'agoda';
  if (s.includes('whatsapp'))  return 'whatsapp';
  if (s.includes('direct') || s.includes('website') || s.includes('manual')) return 'direct';
  return s;
}

// Brand icon SVGs — each returns a 28×28 circle that matches the real logo style
function ChannelIcon({ channel, title }: { channel: string; title?: string }) {
  const icons: Record<string, JSX.Element> = {
    airbnb: (
      <svg viewBox="0 0 28 28" width="28" height="28" title={title ?? 'Airbnb'}>
        <circle cx="14" cy="14" r="14" fill="#FF5A5F"/>
        {/* Airbnb bélo symbol (simplified) */}
        <path d="M14 5.5c-1.1 0-2 .9-2 2 0 .75.41 1.4 1.02 1.75C11.2 10.43 9.5 12.8 9.5 14c0 1.38.9 2.5 2 2.5.55 0 1.05-.22 1.42-.58C13.24 17.32 13.62 19 14 19.5c.38-.5.76-2.18 1.08-3.58.37.36.87.58 1.42.58 1.1 0 2-1.12 2-2.5 0-1.2-1.7-3.57-3.52-4.75.61-.35 1.02-1 1.02-1.75 0-1.1-.9-2-2-2z" fill="white" opacity="0.95"/>
      </svg>
    ),
    booking: (
      <svg viewBox="0 0 28 28" width="28" height="28" title={title ?? 'Booking.com'}>
        <circle cx="14" cy="14" r="14" fill="#003580"/>
        <text x="14" y="19" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif">B.</text>
      </svg>
    ),
    vrbo: (
      <svg viewBox="0 0 28 28" width="28" height="28" title={title ?? 'VRBO'}>
        <circle cx="14" cy="14" r="14" fill="#1158A7"/>
        <text x="14" y="18.5" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial,sans-serif">VRBO</text>
      </svg>
    ),
    homeaway: (
      <svg viewBox="0 0 28 28" width="28" height="28" title={title ?? 'HomeAway'}>
        <circle cx="14" cy="14" r="14" fill="#1158A7"/>
        <text x="14" y="19" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif">H</text>
      </svg>
    ),
    expedia: (
      <svg viewBox="0 0 28 28" width="28" height="28" title={title ?? 'Expedia'}>
        <circle cx="14" cy="14" r="14" fill="#FFC72C"/>
        <text x="14" y="19" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif">E</text>
      </svg>
    ),
    google: (
      <svg viewBox="0 0 28 28" width="28" height="28" title={title ?? 'Google'}>
        <circle cx="14" cy="14" r="14" fill="#4285F4"/>
        <text x="14" y="19" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif">G</text>
      </svg>
    ),
    tripadvisor: (
      <svg viewBox="0 0 28 28" width="28" height="28" title={title ?? 'TripAdvisor'}>
        <circle cx="14" cy="14" r="14" fill="#00AA6C"/>
        <text x="14" y="19" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif">T</text>
      </svg>
    ),
    wotif: (
      <svg viewBox="0 0 28 28" width="28" height="28" title={title ?? 'Wotif'}>
        <circle cx="14" cy="14" r="14" fill="#F59E0B"/>
        <text x="14" y="19" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif">W</text>
      </svg>
    ),
    agoda: (
      <svg viewBox="0 0 28 28" width="28" height="28" title={title ?? 'Agoda'}>
        <circle cx="14" cy="14" r="14" fill="#5C328A"/>
        <text x="14" y="19" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif">A</text>
      </svg>
    ),
    whatsapp: (
      <svg viewBox="0 0 28 28" width="28" height="28" title={title ?? 'WhatsApp'}>
        <circle cx="14" cy="14" r="14" fill="#25D366"/>
        <text x="14" y="19" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif">W</text>
      </svg>
    ),
    direct: (
      <svg viewBox="0 0 28 28" width="28" height="28" title={title ?? 'Direct'}>
        <circle cx="14" cy="14" r="14" fill="#6B7280"/>
        <text x="14" y="19" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif">D</text>
      </svg>
    ),
  };

  const icon = icons[channel];
  if (!icon) {
    // Fallback: grey circle with first letter
    const letter = channel[0]?.toUpperCase() ?? '?';
    return (
      <svg viewBox="0 0 28 28" width="28" height="28" title={title ?? channel}>
        <circle cx="14" cy="14" r="14" fill="#9CA3AF"/>
        <text x="14" y="19" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif">{letter}</text>
      </svg>
    );
  }
  return icon;
}

function ChannelDots({ channels }: { channels: string[] }) {
  if (channels.length === 0) return <span className="text-xs text-gray-400">—</span>;
  const unique = Array.from(new Set(channels.map(normaliseChannel)));
  return (
    <div className="flex gap-1 flex-wrap">
      {unique.map((ch) => (
        <span key={ch} className="flex-shrink-0">
          <ChannelIcon channel={ch} title={ch} />
        </span>
      ))}
    </div>
  );
}

// ─── DETAIL MODAL ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DetailRow({ label, value }: { label: string; value: any }) {
  if (value == null || value === '' || value === false) return (
    <div className="flex gap-2 text-xs">
      <span className="text-blue-600 min-w-[180px]">{label}:</span>
      <span className="text-gray-400">-</span>
    </div>
  );
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-blue-600 min-w-[180px]">{label}:</span>
      <span className="font-semibold text-gray-800">{String(value)}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-200 pt-5">
      <h3 className="text-base font-semibold text-navy mb-4">{title}</h3>
      {children}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TwoColGrid({ items }: { items: { label: string; value: any }[] }) {
  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid);
  const right = items.slice(mid);
  return (
    <div className="grid grid-cols-2 gap-x-10 gap-y-2">
      <div className="space-y-2">{left.map((i) => <DetailRow key={i.label} label={i.label} value={i.value} />)}</div>
      <div className="space-y-2">{right.map((i) => <DetailRow key={i.label} label={i.label} value={i.value} />)}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PropertyDetailModal({ property, onClose }: { property: Property; onClose: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [listing, setListing] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    setLoadingDetail(true);
    fetch(`/api/hostaway/listings/${property.id}?orgId=default`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setDetailError(d.error);
        else setListing(d.listing);
      })
      .catch(() => setDetailError('Failed to load listing details'))
      .finally(() => setLoadingDetail(false));
  }, [property.id]);

  const val = (v: unknown) => (v != null && v !== '' ? v : null);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onClick={onClose}>
      <div
        className="relative h-full w-full max-w-3xl bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center flex-shrink-0">
              <Home size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy">
                {property.unitNumber ?? property.name}
                <span className="text-gray-400 font-normal text-base ml-2">({property.id})</span>
              </h2>
              {property.address && (
                <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <MapPin size={11} /> {property.address}
                </p>
              )}
            </div>
          </div>

          {/* Quick stats from listing */}
          {listing && (
            <div className="grid grid-cols-4 gap-4 mt-5">
              {[
                { icon: Home,     label: listing.propertyType ?? listing.roomType ?? 'entire_home' },
                { icon: Users,    label: `${listing.personCapacity ?? '—'} Guests` },
                { icon: DoorOpen, label: `${listing.bedroomsNumber ?? '—'} Bedrooms` },
                { icon: BedDouble,label: `${listing.bedsNumber ?? '—'} Beds` },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1 py-3 border border-gray-100 rounded-xl">
                  <s.icon size={22} className="text-gray-400" />
                  <span className="text-xs text-gray-600 text-center">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-6 space-y-6">
          {loadingDetail && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <RefreshCw size={18} className="animate-spin mr-2" /> Loading listing details…
            </div>
          )}

          {detailError && !loadingDetail && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
              <p className="font-semibold mb-1">Could not load full listing details</p>
              <p>{detailError}</p>
              <p className="mt-2 text-xs text-gray-500">Showing data available locally.</p>
            </div>
          )}

          {/* Fallback local data when Hostaway unavailable */}
          {!listing && !loadingDetail && (
            <Section title="Property Info">
              <TwoColGrid items={[
                { label: 'Wi-Fi Network',   value: val(property.wifiNetwork) },
                { label: 'Wi-Fi Password',  value: val(property.wifiPassword) },
                { label: 'Check-in Time',   value: val(property.checkInTime) },
                { label: 'Check-out Time',  value: val(property.checkOutTime) },
              ]} />
            </Section>
          )}

          {listing && !loadingDetail && (
            <>
              {/* About */}
              {listing.description && (
                <Section title="About this listing">
                  <p className="text-xs text-gray-600 leading-relaxed">{listing.description}</p>
                </Section>
              )}

              {/* The space */}
              <Section title="The space">
                <TwoColGrid items={[
                  { label: 'Accommodates',    value: val(listing.personCapacity) },
                  { label: 'Bathrooms',       value: val(listing.bathroomsNumber) },
                  { label: 'Bathroom type',   value: val(listing.bathroomType) },
                  { label: 'Bedrooms',        value: val(listing.bedroomsNumber) },
                  { label: 'Bed type',        value: val(listing.bedType) },
                  { label: 'Beds',            value: val(listing.bedsNumber) },
                  { label: 'Property type',   value: val(listing.propertyType) },
                  { label: 'Room type',       value: val(listing.roomType) },
                  { label: 'Tags',            value: val(Array.isArray(listing.tags) ? listing.tags.join(', ') : listing.tags) },
                ]} />
              </Section>

              {/* Additional info – cancellation policies */}
              {(listing.cancellationPolicy || listing.cancellationPolicies) && (
                <Section title="Additional info">
                  <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                    {listing.cancellationPolicy && (
                      <div className="text-xs">
                        <p className="flex items-center gap-1 font-semibold text-[#ff5a5f] mb-0.5">
                          <span className="w-3 h-3 rounded-full bg-[#ff5a5f] inline-block" />
                          Airbnb cancellation policy:
                        </p>
                        <p className="text-gray-700">{listing.cancellationPolicy}</p>
                      </div>
                    )}
                    {listing.cancellationPolicyLongterm && (
                      <div className="text-xs">
                        <p className="flex items-center gap-1 font-semibold text-[#ff5a5f] mb-0.5">
                          <span className="w-3 h-3 rounded-full bg-[#ff5a5f] inline-block" />
                          Airbnb long-term cancellation policy:
                        </p>
                        <p className="text-gray-700">{listing.cancellationPolicyLongterm}</p>
                      </div>
                    )}
                    {listing.bookingComCancellationPolicy && (
                      <div className="text-xs">
                        <p className="flex items-center gap-1 font-semibold text-[#003580] mb-0.5">
                          <span className="w-3 h-3 rounded-full bg-[#003580] inline-block" />
                          Booking.com cancellation policy:
                        </p>
                        <p className="text-gray-700">{listing.bookingComCancellationPolicy}</p>
                      </div>
                    )}
                    {listing.directCancellationPolicy && (
                      <div className="text-xs">
                        <p className="flex items-center gap-1 font-semibold text-green-600 mb-0.5">
                          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                          Direct channels cancellation policy:
                        </p>
                        <p className="text-gray-700">{listing.directCancellationPolicy}</p>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Amenities */}
              {listing.amenities?.length > 0 && (
                <Section title="Amenities">
                  <div className="grid grid-cols-2 gap-x-10 gap-y-1">
                    {(listing.amenities as string[]).map((a: string) => (
                      <span key={a} className="text-xs text-blue-600">{a}</span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Bed types */}
              <Section title="Bed types">
                {listing.bedTypes ? (
                  <p className="text-xs text-gray-600">{typeof listing.bedTypes === 'object' ? JSON.stringify(listing.bedTypes) : listing.bedTypes}</p>
                ) : (
                  <p className="text-xs text-gray-400">-</p>
                )}
              </Section>

              {/* House rules */}
              <Section title="House rules">
                {listing.houseRules ? (
                  <p className="text-xs text-gray-600 leading-relaxed">{listing.houseRules}</p>
                ) : (
                  <p className="text-xs text-gray-400">-</p>
                )}
              </Section>

              {/* Special instructions */}
              <Section title="Special Instructions">
                {listing.specialInstructions ?? listing.checkInInstructions ? (
                  <p className="text-xs text-gray-600 leading-relaxed">{listing.specialInstructions ?? listing.checkInInstructions}</p>
                ) : (
                  <p className="text-xs text-gray-400">-</p>
                )}
              </Section>

              {/* Prices */}
              <Section title="Prices">
                <TwoColGrid items={[
                  { label: 'Price',                        value: listing.price != null ? `${listing.price} ZAR` : null },
                  { label: 'Price for extra person',       value: val(listing.priceForExtraPerson) },
                  { label: 'Weekly discount',              value: val(listing.weeklyDiscount) },
                  { label: 'Property rent tax %',          value: val(listing.propertyRentTax) },
                  { label: 'Apply price for extra person for each guest after', value: val(listing.extraPersonFeeGuestsIncluded) },
                  { label: 'Fixed guest tax per-person, per-night', value: val(listing.guestTaxPerPersonPerNight) },
                  { label: 'Fixed tax per reservation',   value: val(listing.fixedTaxAmount) },
                  { label: 'Monthly discount',             value: val(listing.monthlyDiscount) },
                  { label: 'Fixed nightly tax',            value: val(listing.fixedNightlyTax) },
                  { label: 'Refundable damage deposit fee',value: val(listing.securityDepositFee) },
                ]} />
              </Section>

              {/* License info */}
              <Section title="License info">
                <TwoColGrid items={[
                  { label: 'Property license number',      value: val(listing.licenseNumber) },
                  { label: 'Property license issue date',  value: val(listing.licenseIssueDate) },
                  { label: 'Property license type',        value: val(listing.licenseType) },
                  { label: 'Property license expiration date', value: val(listing.licenseExpirationDate) },
                ]} />
              </Section>

              {/* Availability */}
              <Section title="Availability">
                <div className="flex items-center gap-6 text-xs text-gray-700">
                  <span><strong>{listing.minNights ?? 1} nights</strong> minimum</span>
                  {listing.maxNights && <span><strong>{listing.maxNights} nights</strong> maximum</span>}
                </div>
              </Section>

              {/* Other attributes */}
              <Section title="Other attributes">
                <TwoColGrid items={[
                  { label: 'Door code',                    value: val(listing.doorCode) },
                  { label: 'Checkout time',                value: val(listing.checkOutTime != null ? `${listing.checkOutTime}:00` : property.checkOutTime) },
                  { label: 'Star rating',                  value: val(listing.starRating) },
                  { label: 'Cleaning fee',                 value: val(listing.cleaningFee) },
                  { label: 'Instant bookable',             value: listing.instantBookingAllowed != null ? (listing.instantBookingAllowed ? 'Yes' : 'No') : null },
                  { label: 'Key pickup',                   value: val(listing.keyPickup) },
                  { label: 'Instant bookable lead',        value: val(listing.instantBookingLeadTime) },
                  { label: 'Square Meters',                value: val(listing.squareMeters) },
                  { label: 'Wi-fi Username',               value: val(listing.wifiName ?? property.wifiNetwork) },
                  { label: "Listing's cleanness status",   value: val(listing.cleannessStatus) },
                  { label: 'Wi-fi Password',               value: val(listing.wifiPassword ?? property.wifiPassword) },
                  { label: "Mark cleanness status as dirty after guest's departure", value: listing.markDirtyAfterCheckout != null ? (listing.markDirtyAfterCheckout ? 'Yes' : 'No') : null },
                  { label: 'Person Capacity',              value: val(listing.personCapacity) },
                  { label: 'Cleaning instruction',         value: val(listing.cleaningInstruction) },
                  { label: 'Checkin time start',           value: listing.checkInTimeStart != null ? `${listing.checkInTimeStart}:00` : val(property.checkInTime) },
                  { label: 'Checkin time end',             value: listing.checkInTimeEnd != null ? `${listing.checkInTimeEnd}:00` : null },
                ]} />
              </Section>

              {/* Contacts */}
              {(listing.contactName ?? listing.contactEmail ?? listing.contactPhone) && (
                <Section title="Contacts">
                  <TwoColGrid items={[
                    { label: "Contact person's name",            value: val(listing.contactName) },
                    { label: "Contact person's spoken language", value: val(listing.contactLanguage) },
                    { label: "Contact person's last name",       value: val(listing.contactLastName) },
                    { label: "Contact person's email",           value: val(listing.contactEmail) },
                    { label: 'Phone number',                     value: val(listing.contactPhone) },
                    { label: "Contact person's address",         value: val(listing.contactAddress) },
                    { label: 'Second phone number',              value: val(listing.contactPhone2) },
                  ]} />
                </Section>
              )}

              {/* Wifi (always show) */}
              <Section title="Access & WiFi">
                <TwoColGrid items={[
                  { label: 'Wi-Fi Network',  value: val(listing.wifiName ?? property.wifiNetwork) },
                  { label: 'Wi-Fi Password', value: val(listing.wifiPassword ?? property.wifiPassword) },
                  { label: 'Check-in Time',  value: listing.checkInTimeStart != null ? `${listing.checkInTimeStart}:00` : val(property.checkInTime) },
                  { label: 'Check-out Time', value: listing.checkOutTime != null ? `${listing.checkOutTime}:00` : val(property.checkOutTime) },
                ]} />
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  // channelMap: listingId -> normalised channel name list from Hostaway
  const [channelMap, setChannelMap] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch('/api/properties?orgId=default');
      const data = await res.json();
      if (data.properties?.length > 0) setProperties(data.properties);
    } catch { /* keep existing */ } finally { setLoading(false); }
  }, []);

  // Fetch channel data from Hostaway (best-effort, silent on failure)
  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/hostaway/channels?orgId=default');
      const data = await res.json();
      if (data.channels) setChannelMap(data.channels);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchProperties();
    fetchChannels();
  }, [fetchProperties, fetchChannels]);

  const handleSync = async () => {
    setSyncState('syncing');
    setSyncMessage('');
    try {
      const res = await fetch('/api/hostaway/sync?orgId=default&type=all');
      const data = await res.json();
      if (!res.ok) { setSyncState('error'); setSyncMessage(data.error ?? 'Sync failed'); return; }
      const { listings, reservations, messages } = data.results ?? {};
      setSyncState('success');
      setSyncMessage(`Synced ${listings?.synced ?? 0} properties, ${reservations?.synced ?? 0} bookings, and ${messages?.synced ?? 0} messages`);
      await Promise.all([fetchProperties(), fetchChannels()]);
      setTimeout(() => setSyncState('idle'), 5000);
    } catch {
      setSyncState('error');
      setSyncMessage('Could not connect to Hostaway. Check your API credentials in Settings.');
    }
  };

  const filtered = properties.filter((p) =>
    (p.unitNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.address ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center">
            <Home size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">Properties</h1>
            <p className="text-sm text-gray-500">
              {properties.length > 0 ? `${properties.length} properties` : 'Sync your Hostaway listings'}
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
            <Plus size={14} /> Add Manual
          </button>
        </div>
      </div>

      {/* Sync status */}
      {syncState === 'success' && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green text-sm font-medium px-4 py-3 rounded-lg">
          <CheckCircle size={15} /> {syncMessage}
        </div>
      )}
      {syncState === 'error' && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red text-sm font-medium px-4 py-3 rounded-lg">
          <AlertCircle size={15} /> {syncMessage}
        </div>
      )}

      {/* No credentials */}
      {!loading && properties.length === 0 && syncState === 'idle' && (
        <div className="bg-blue-subtle border border-blue/20 rounded-lg px-5 py-4 text-sm text-navy">
          <p className="font-semibold mb-1">Connect Hostaway to get started</p>
          <p className="text-gray-500">
            Go to <a href="/settings" className="text-blue font-medium hover:underline">Settings</a> → Integrations → enter your Hostaway Account ID and API Key → Save, then click <strong>Sync from Hostaway</strong>.
          </p>
        </div>
      )}

      {/* Search */}
      {properties.length > 0 && (
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-light"
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw size={20} className="animate-spin mr-2" /> Loading properties...
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ boxShadow: 'var(--shadow)' }}>
          {/* Table header */}
          <div className="grid grid-cols-[2fr_120px_2fr_180px_130px_100px] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Listing</span>
            <span>Listing ID</span>
            <span>External name</span>
            <span>Location</span>
            <span>Channels</span>
            <span />
          </div>

          {/* Rows */}
          {filtered.map((property, idx) => (
            <div
              key={property.id}
              className={cn(
                'grid grid-cols-[2fr_120px_2fr_180px_130px_100px] gap-4 px-5 py-4 items-center hover:bg-gray-50 transition-colors',
                idx !== filtered.length - 1 && 'border-b border-gray-100'
              )}
            >
              {/* Listing name */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-10 rounded-lg bg-blue-subtle flex items-center justify-center flex-shrink-0">
                  <Home size={16} className="text-blue" />
                </div>
                <button
                  onClick={() => setSelectedProperty(property)}
                  className="text-sm font-medium text-blue hover:underline truncate text-left"
                >
                  {property.unitNumber ?? property.name}
                </button>
              </div>

              {/* Listing ID */}
              <span className="text-sm text-gray-600">{property.id}</span>

              {/* External name */}
              <span className="text-sm text-gray-700 truncate">{property.name}</span>

              {/* Location */}
              <span className="text-sm text-gray-600 truncate">{property.address ?? '—'}</span>

              {/* Channels */}
              <ChannelDots channels={
                // Use Hostaway channel data when available; fall back to booking channels
                (channelMap[property.id]?.length
                  ? channelMap[property.id]
                  : (property.bookings ?? []).map((b) => b.channel))
              } />

              {/* Action */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedProperty(property)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-blue/30 text-blue rounded-lg hover:bg-blue-subtle transition-colors"
                >
                  <Eye size={12} /> Detail View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}
