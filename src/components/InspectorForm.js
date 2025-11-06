import React, { useState } from 'react';
import { inspectPackage } from '../utils/inspector.js';
import ErrorMessage from './ErrorMessage.js';
import LoadingSpinner from './LoadingSpinner.js';

/**
 * Form component for entering npm package names to analyze
 * @param {function} onAnalysisComplete - Callback function that receives the report object when analysis succeeds
 * @param {function} onAnalysisStart - Callback to notify parent that analysis has started
 * @returns {JSX.Element} The inspector form component
 * @example
 * <InspectorForm 
 *   onAnalysisStart={() => console.log('Started')}
 *   onAnalysisComplete={(report) => console.log('Complete', report)}
 * />
 */
function InspectorForm({ onAnalysisComplete, onAnalysisStart }) {
  // State declarations
  const [packageName, setPackageName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Event handlers
  const handleInputChange = (event) => {
    setPackageName(event.target.value);
    setError(null); // Clear error when user types
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
      const report = await inspectPackage(trimmedName);
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
