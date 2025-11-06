import React from 'react';

/**
 * Error message component with dismiss functionality
 * @param {string} message - The error message to display (user-friendly, not technical)
 * @param {function} onDismiss - Callback function to clear/dismiss the error
 * @returns {JSX.Element} The error message component
 * @example
 * <ErrorMessage 
 *   message="Package not found. Please check the package name."
 *   onDismiss={() => setError(null)}
 * />
 */
function ErrorMessage({ message, onDismiss }) {
  return (
    <div className="error-message" role="alert">
      <span className="error-icon" aria-hidden="true">⚠️</span>
      <p className="error-text">{message}</p>
      {onDismiss && (
        <button
          type="button"
          className="error-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
