/**
 * Shared configuration for AI model options
 * This module provides a single source of truth for available models
 * to prevent drift between components
 */

/**
 * Available AI models for package analysis
 * @type {Array<{value: string, label: string}>}
 */
export const MODEL_OPTIONS = [
  { value: 'moonshotai/kimi-k2-thinking', label: 'Moonshot Kimi K2 Thinking (Recommended)' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'openai/gpt-4o', label: 'OpenAI GPT-4o' },
  { value: 'google/gemini-2.0-flash-exp:free', label: 'Google Gemini Flash (Free)' },
  { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Meta Llama 3.1 70B' },
  { value: 'mistralai/mistral-large', label: 'Mistral Large' }
];

/**
 * Default model to use when no model is selected or stored
 * Automatically derived from the first model in MODEL_OPTIONS
 * @type {string}
 */
export const DEFAULT_MODEL = MODEL_OPTIONS[0].value;
