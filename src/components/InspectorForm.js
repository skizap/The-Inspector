import React, { useState } from 'react';
import { inspectPackage } from '../utils/inspector.js';
import ErrorMessage from './ErrorMessage.js';
import LoadingSpinner from './LoadingSpinner.js';

// Model options for AI analysis
const MODEL_OPTIONS = [
  { value: 'moonshotai/kimi-k2-thinking', label: 'Moonshot Kimi K2 Thinking (Recommended)' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'openai/gpt-4o', label: 'OpenAI GPT-4o' },
  { value: 'google/gemini-2.0-flash-exp:free', label: 'Google Gemini Flash (Free)' },
  { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Meta Llama 3.1 70B' },
  { value: 'mistralai/mistral-large', label: 'Mistral Large' }
];

/**
 * Form component for entering npm package names to analyze with model selection
 * @param {function} onAnalysisComplete - Callback function that receives the report object when analysis succeeds
 * @param {function} onAnalysisStart - Callback to notify parent that analysis has started
 * @param {string} selectedModel - Currently selected AI model
 * @param {function} onModelChange - Callback to notify parent when model selection changes
 * @returns {JSX.Element} The inspector form component
 * @example
 * <InspectorForm 
 *   onAnalysisStart={() => console.log('Started')}
 *   onAnalysisComplete={(report) => console.log('Complete', report)}
 *   selectedModel="moonshotai/kimi-k2-thinking"
 *   onModelChange={(model) => console.log('Model changed', model)}
 * />
 */
function InspectorForm({ onAnalysisComplete, onAnalysisStart, selectedModel, onModelChange }) {
  // State declarations
  const [packageName, setPackageName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Event handlers
  const handleInputChange = (event) => {
    setPackageName(event.target.value);
    setError(null); // Clear error when user types
  };

  const handleModelChange = (event) => {
    onModelChange(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Validate package name is not empty
    const trimmedName = packageName.trim();
    if (trimmedName.length === 0) {
      setError('Please enter a package name');
      return;
    }

    // Notify parent that analysis has started
    onAnalysisStart?.();
    setIsLoading(true);
    setError(null);

    try {
      const report = await inspectPackage(trimmedName, selectedModel);
      onAnalysisComplete?.(report);
      setIsLoading(false);
    } catch (error) {
      console.error('[InspectorForm] Analysis failed:', error);
      setError(error.message || 'Failed to analyze package. Please try again.');
      setIsLoading(false);
    }
  };

  const handleErrorDismiss = () => {
    setError(null);
  };

  return (
    <form className="inspector-form" onSubmit={handleSubmit}>
      <label htmlFor="package-name-input">
        Package Name
      </label>
      <input
        type="text"
        id="package-name-input"
        value={packageName}
        onChange={handleInputChange}
        placeholder="Enter package name (e.g., lodash or @babel/core)"
        disabled={isLoading}
        aria-label="Package name input"
      />
      <label htmlFor="model-select">
        AI Model
      </label>
      <select
        id="model-select"
        value={selectedModel}
        onChange={handleModelChange}
        disabled={isLoading}
        aria-label="AI model selection"
      >
        {MODEL_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isLoading || !packageName.trim()}
        aria-busy={isLoading}
      >
        {isLoading ? 'Analyzing...' : 'Inspect'}
      </button>
      {error && <ErrorMessage message={error} onDismiss={handleErrorDismiss} />}
      {isLoading && <LoadingSpinner />}
    </form>
  );
}

export default InspectorForm;
