'use client';

import { Settings, Key, Bell, Globe, Shield, Webhook } from 'lucide-react';

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
