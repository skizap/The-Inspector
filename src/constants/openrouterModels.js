/**
 * Centralized whitelist of valid OpenRouter models supported by this application.
 * This constant is shared across frontend (src/config/models.js) and backend (serverless functions)
 * to ensure consistency in model validation.
 * 
 * Models must match the IDs documented in docs/openrouter-reference.md.
 * @type {string[]}
 */
export const VALID_OPENROUTER_MODELS = [
  'moonshotai/kimi-k2-thinking',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-3.5-sonnet',
  'openai/gpt-4o',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.1-70b-instruct',
  'mistralai/mistral-large'
];
