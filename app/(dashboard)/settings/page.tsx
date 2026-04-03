'use client';

import { useState, useEffect } from 'react';
import { Settings, Key, Bell, Globe, Shield, Webhook, Percent, Save } from 'lucide-react';

const sections = [
  {
    icon: Globe,
    title: 'Hostaway Integration',
    description: 'Connect your Hostaway account to receive guest messages automatically.',
    fields: [
      { label: 'Hostaway Account ID', placeholder: 'HA-XXXXXXXX', type: 'text' },
      { label: 'API Key', placeholder: '••••••••••••••••', type: 'password' },
    ],
  },
  {
    icon: Key,
    title: 'AI Configuration',
    description: 'Configure your AI provider for auto-responses.',
    fields: [
      { label: 'Anthropic API Key', placeholder: 'sk-ant-••••••••', type: 'password' },
      { label: 'OpenAI API Key (embeddings)', placeholder: 'sk-••••••••', type: 'password' },
      { label: 'Confidence Threshold', placeholder: '0.75', type: 'number' },
    ],
  },
  {
    icon: Globe,
    title: 'Pinecone Vector DB',
    description: 'Store and search your knowledge base using vector embeddings.',
    fields: [
      { label: 'Pinecone API Key', placeholder: '••••••••••••••••', type: 'password' },
      { label: 'Index Name', placeholder: 'agentiv8-kb', type: 'text' },
    ],
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Configure alerts for escalations and important events.',
    fields: [
      { label: 'Escalation Email', placeholder: 'manager@example.com', type: 'email' },
      { label: 'SMS Number (Twilio)', placeholder: '+27820000000', type: 'text' },
    ],
  },
  {
    icon: Shield,
    title: 'Authentication',
    description: 'Manage team access and security settings.',
    fields: [
      { label: 'Google OAuth Client ID', placeholder: 'XXXX.apps.googleusercontent.com', type: 'text' },
      { label: 'Google OAuth Secret', placeholder: '••••••••••••••••', type: 'password' },
    ],
  },
  {
    icon: Webhook,
    title: 'Webhook URL',
    description: 'Use this URL in your Hostaway webhook settings.',
    fields: [],
    info: `${typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.vercel.app'}/api/webhooks/hostaway`,
  },
];

function RevenueSettings() {
  const [hostServiceFee, setHostServiceFee] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings?orgId=default&key=HOST_SERVICE_FEE_PCT')
      .then(r => r.json())
      .then(d => {
        if (d.value != null) setHostServiceFee(parseFloat(d.value));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: 'default', key: 'HOST_SERVICE_FEE_PCT', value: String(hostServiceFee) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-[10px] border border-gray-200 overflow-hidden" style={{ boxShadow: 'var(--shadow)' }}>
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-subtle flex items-center justify-center">
          <Percent size={16} className="text-blue" />
        </div>
        <div>
          <p className="font-semibold text-navy text-sm">Revenue & Payout Settings</p>
          <p className="text-xs text-gray-500">Configure fee percentages used in analytics calculations</p>
        </div>
      </div>
      <div className="px-5 py-5 space-y-5">
        {/* Host Service Fee Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-600">Host Service Fee %</label>
            <span className="text-sm font-bold text-navy bg-blue-subtle px-2 py-0.5 rounded-md">{hostServiceFee}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={20}
            step={0.5}
            value={hostServiceFee}
            onChange={e => setHostServiceFee(parseFloat(e.target.value))}
            disabled={loading}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>0%</span>
            <span>5%</span>
            <span>10%</span>
            <span>15%</span>
            <span>20%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Used for <strong>Direct bookings</strong>: Host Payout = Total Rent + Cleaning Fee − Host Service Fee
          </p>
        </div>

        {/* Payout formulas reference */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <p className="text-xs font-semibold text-navy mb-2">Payout Formulas per Channel</p>
          <div className="space-y-1.5 text-xs text-gray-600">
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff5a5f] mt-1 flex-shrink-0" />
              <span><strong>Airbnb:</strong> Channel Amount − Airbnb Host Fee = Host Payout</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-[#003580] mt-1 flex-shrink-0" />
              <span><strong>Booking.com:</strong> Channel Amount − Channel Commission = Host Payout</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2563eb] mt-1 flex-shrink-0" />
              <span><strong>Direct:</strong> Total Rent + Cleaning Fee − Host Service Fee ({hostServiceFee}%) = Host Payout</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center">
          <Settings size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy">Settings</h1>
          <p className="text-sm text-gray-500">Configure integrations, AI, and team settings</p>
        </div>
      </div>

      {/* Revenue settings at top */}
      <RevenueSettings />

      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <div
            key={section.title}
            className="bg-white rounded-[10px] border border-gray-200 overflow-hidden"
            style={{ boxShadow: 'var(--shadow)' }}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-subtle flex items-center justify-center">
                <Icon size={16} className="text-blue" />
              </div>
              <div>
                <p className="font-semibold text-navy text-sm">{section.title}</p>
                <p className="text-xs text-gray-500">{section.description}</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-4">
              {section.info && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <code className="text-xs text-blue font-mono">{section.info}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(section.info!)}
                    className="text-xs text-gray-500 hover:text-blue ml-3 flex-shrink-0"
                  >
                    Copy
                  </button>
                </div>
              )}
              {section.fields.map((field) => (
                <div key={field.label}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-light transition-colors"
                  />
                </div>
              ))}
              {section.fields.length > 0 && (
                <div className="flex justify-end pt-1">
                  <button className="bg-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div
        className="bg-white rounded-[10px] border border-gray-200 px-5 py-4"
        style={{ boxShadow: 'var(--shadow)' }}
      >
        <p className="font-semibold text-navy text-sm mb-3">Environment Variables</p>
        <p className="text-xs text-gray-500 mb-3">
          For production deployments, configure these values in your hosting provider (Vercel, Railway, etc.):
        </p>
        <div className="bg-gray-900 rounded-lg p-4 text-xs font-mono text-green-400 space-y-1 overflow-x-auto">
          {[
            'DATABASE_URL=postgresql://...',
            'NEXTAUTH_URL=https://yourapp.com',
            'NEXTAUTH_SECRET=your-secret',
            'ANTHROPIC_API_KEY=sk-ant-...',
            'OPENAI_API_KEY=sk-...',
            'PINECONE_API_KEY=...',
            'PINECONE_INDEX=agentiv8-kb',
            'GOOGLE_CLIENT_ID=...',
            'GOOGLE_CLIENT_SECRET=...',
            'HOSTAWAY_WEBHOOK_SECRET=...',
          ].map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
