'use client';

import { useState, useEffect } from 'react';
import { Settings, Key, Bell, Globe, Shield, Webhook, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SectionField {
  label: string;
  key: string;
  placeholder: string;
  type: string;
}

interface Section {
  icon: React.ElementType;
  title: string;
  description: string;
  fields: SectionField[];
  info?: string;
}

const sections: Section[] = [
  {
    icon: Globe,
    title: 'Hostaway Integration',
    description: 'Connect your Hostaway account to receive guest messages automatically.',
    fields: [
      { label: 'Hostaway Account ID', key: 'HOSTAWAY_ACCOUNT_ID', placeholder: '126626', type: 'text' },
      { label: 'API Key', key: 'HOSTAWAY_API_KEY', placeholder: '••••••••••••••••', type: 'password' },
    ],
  },
  {
    icon: Key,
    title: 'AI Configuration',
    description: 'Configure your AI provider for auto-responses.',
    fields: [
      { label: 'Anthropic API Key', key: 'ANTHROPIC_API_KEY', placeholder: 'sk-ant-••••••••', type: 'password' },
      { label: 'OpenAI API Key (embeddings)', key: 'OPENAI_API_KEY', placeholder: 'sk-••••••••', type: 'password' },
      { label: 'Confidence Threshold (0–1)', key: 'AI_CONFIDENCE_THRESHOLD', placeholder: '0.75', type: 'text' },
    ],
  },
  {
    icon: Globe,
    title: 'Pinecone Vector DB',
    description: 'Store and search your knowledge base using vector embeddings.',
    fields: [
      { label: 'Pinecone API Key', key: 'PINECONE_API_KEY', placeholder: '••••••••••••••••', type: 'password' },
      { label: 'Index Name', key: 'PINECONE_INDEX', placeholder: 'agentiv8-kb', type: 'text' },
    ],
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Configure alerts for escalations and important events.',
    fields: [
      { label: 'Escalation Email', key: 'ESCALATION_EMAIL', placeholder: 'manager@example.com', type: 'email' },
      { label: 'SMS Number (Twilio)', key: 'SMS_NUMBER', placeholder: '+27820000000', type: 'text' },
    ],
  },
  {
    icon: Shield,
    title: 'Authentication',
    description: 'Manage team access and security settings.',
    fields: [
      { label: 'Google OAuth Client ID', key: 'GOOGLE_CLIENT_ID', placeholder: 'XXXX.apps.googleusercontent.com', type: 'text' },
      { label: 'Google OAuth Secret', key: 'GOOGLE_CLIENT_SECRET', placeholder: '••••••••••••••••', type: 'password' },
    ],
  },
  {
    icon: Webhook,
    title: 'Webhook URL',
    description: 'Paste this URL into your Hostaway webhook settings to receive guest messages.',
    fields: [],
    info: `${typeof window !== 'undefined' ? window.location.origin : 'https://agentiv8.vercel.app'}/api/webhooks/hostaway`,
  },
];

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [copied, setCopied] = useState(false);

  // Load existing settings on mount
  useEffect(() => {
    fetch('/api/settings?orgId=default')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setValues(data.settings);
      })
      .catch(() => {});
  }, []);

  const handleChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (saveStates[key] === 'saved' || saveStates[key] === 'error') {
      setSaveStates((prev) => ({ ...prev, [key]: 'idle' }));
    }
  };

  const handleSave = async (section: Section) => {
    const sectionKey = section.title;
    setSaveStates((prev) => ({ ...prev, [sectionKey]: 'saving' }));

    const settingsToSave: Record<string, string> = {};
    for (const field of section.fields) {
      if (values[field.key] !== undefined) {
        settingsToSave[field.key] = values[field.key];
      }
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: 'default', settings: settingsToSave }),
      });

      if (res.ok) {
        setSaveStates((prev) => ({ ...prev, [sectionKey]: 'saved' }));
        setTimeout(() => setSaveStates((prev) => ({ ...prev, [sectionKey]: 'idle' })), 3000);
      } else {
        setSaveStates((prev) => ({ ...prev, [sectionKey]: 'error' }));
      }
    } catch {
      setSaveStates((prev) => ({ ...prev, [sectionKey]: 'error' }));
    }
  };

  const copyWebhook = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
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
        const state = saveStates[section.title] ?? 'idle';

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
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                  <code className="text-xs text-blue font-mono break-all">{section.info}</code>
                  <button
                    onClick={() => copyWebhook(section.info!)}
                    className="text-xs font-medium flex-shrink-0 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue text-gray-600 hover:text-blue transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}

              {section.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={values[field.key] ?? ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-light focus:bg-white transition-colors"
                    autoComplete="off"
                  />
                </div>
              ))}

              {section.fields.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  {state === 'saved' && (
                    <span className="flex items-center gap-1.5 text-xs text-green font-medium">
                      <CheckCircle size={13} /> Saved successfully
                    </span>
                  )}
                  {state === 'error' && (
                    <span className="flex items-center gap-1.5 text-xs text-red font-medium">
                      <AlertCircle size={13} /> Failed to save — check your database connection
                    </span>
                  )}
                  {(state === 'idle' || state === 'saving') && <span />}

                  <button
                    onClick={() => handleSave(section)}
                    disabled={state === 'saving'}
                    className="flex items-center gap-2 bg-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {state === 'saving' && <Loader2 size={13} className="animate-spin" />}
                    {state === 'saving' ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Env vars reference */}
      <div
        className="bg-white rounded-[10px] border border-gray-200 px-5 py-4"
        style={{ boxShadow: 'var(--shadow)' }}
      >
        <p className="font-semibold text-navy text-sm mb-1">Production Environment Variables</p>
        <p className="text-xs text-gray-500 mb-3">
          For best security, also set these directly in Vercel → Settings → Environment Variables:
        </p>
        <div className="bg-gray-900 rounded-lg p-4 text-xs font-mono text-green-400 space-y-1 overflow-x-auto">
          {[
            'DATABASE_URL=postgresql://...',
            'NEXTAUTH_URL=https://agentiv8.vercel.app',
            'NEXTAUTH_SECRET=your-secret',
            'ANTHROPIC_API_KEY=sk-ant-...',
            'OPENAI_API_KEY=sk-...',
            'PINECONE_API_KEY=...',
            'PINECONE_INDEX=agentiv8-kb',
            'HOSTAWAY_WEBHOOK_SECRET=...',
          ].map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
