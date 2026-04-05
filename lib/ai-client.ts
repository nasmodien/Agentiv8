import OpenAI from 'openai';

export const DEFAULT_MODEL = 'google/gemini-2.0-flash-001';

/** Returns an OpenAI-compatible client pointed at OpenRouter */
export function getAIClient(): OpenAI {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://agentiv8.vercel.app',
      'X-Title': 'Agentiv8',
    },
  });
}

export const OPENROUTER_MODELS = [
  // ── Free / very cheap ──────────────────────────────────────────────
  { value: 'google/gemini-2.0-flash-001',        label: 'Gemini 2.0 Flash',       tier: 'cheap',    provider: 'Google' },
  { value: 'google/gemini-2.0-flash-lite-001',   label: 'Gemini 2.0 Flash Lite',  tier: 'cheap',    provider: 'Google' },
  { value: 'meta-llama/llama-3.3-70b-instruct',  label: 'Llama 3.3 70B',          tier: 'cheap',    provider: 'Meta' },
  { value: 'mistralai/mistral-small-3.2-24b-instruct', label: 'Mistral Small 3.2', tier: 'cheap',   provider: 'Mistral' },
  // ── Balanced ───────────────────────────────────────────────────────
  { value: 'google/gemini-2.5-flash-preview',    label: 'Gemini 2.5 Flash',       tier: 'balanced', provider: 'Google' },
  { value: 'anthropic/claude-haiku-4-5',         label: 'Claude Haiku 4.5',       tier: 'balanced', provider: 'Anthropic' },
  { value: 'openai/gpt-4o-mini',                 label: 'GPT-4o Mini',            tier: 'balanced', provider: 'OpenAI' },
  // ── Powerful ───────────────────────────────────────────────────────
  { value: 'anthropic/claude-sonnet-4-5',        label: 'Claude Sonnet 4.5',      tier: 'powerful', provider: 'Anthropic' },
  { value: 'openai/gpt-4o',                      label: 'GPT-4o',                 tier: 'powerful', provider: 'OpenAI' },
  { value: 'google/gemini-2.5-pro-preview',      label: 'Gemini 2.5 Pro',         tier: 'powerful', provider: 'Google' },
  { value: 'anthropic/claude-opus-4-5',          label: 'Claude Opus 4.5',        tier: 'powerful', provider: 'Anthropic' },
] as const;

export type ModelValue = typeof OPENROUTER_MODELS[number]['value'];
