import React from 'react';

/**
 * Loading spinner component displayed during package analysis
 * @param {string} message - Optional custom loading message
 * @returns {JSX.Element} The loading spinner component
 * @example
 * <LoadingSpinner />
 * <LoadingSpinner message="Fetching package data..." />
 */
function LoadingSpinner({ message }) {
  return (
    <div className="loading-spinner" role="status" aria-label="Loading">
      <div className="spinner"></div>
      <p className="loading-text">{message || 'Analyzing package...'}</p>
      <span className="sr-only">Loading, please wait</span>
    </div>
  );
}

export default LoadingSpinner;
