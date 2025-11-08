import React, { useState, useEffect, useRef } from 'react';

/**
 * Encodes an API key using Base64 for obfuscation
 * @param {string} key - The API key to encode
 * @returns {string} Base64 encoded key
 */
function encodeApiKey(key) {
  return btoa(key);
}

/**
 * Decodes a Base64 encoded API key
 * @param {string} encodedKey - The encoded API key
 * @returns {string|null} Decoded key or null if decoding fails
 */
function decodeApiKey(encodedKey) {
  try {
    return atob(encodedKey);
  } catch (error) {
    console.error('[Settings] Failed to decode API key:', error);
    return null;
  }
}

const STORAGE_KEY = 'inspector-api-key';

/**
 * Settings modal component for API key management
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Callback to close the modal
 */
export default function Settings({ isOpen, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [feedback, setFeedback] = useState('');
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Load API key from localStorage on mount and focus input
  useEffect(() => {
    if (isOpen) {
      const encodedKey = localStorage.getItem(STORAGE_KEY);
      if (encodedKey) {
        const decodedKey = decodeApiKey(encodedKey);
        if (decodedKey) {
          setApiKey(decodedKey);
        }
      }
      
      // Focus the input field when modal opens
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Focus trap: keep focus within modal
  useEffect(() => {
    const handleTabKey = (e) => {
      if (!isOpen || !modalRef.current) return;

      // Get all focusable elements within the modal
      const focusableElements = modalRef.current.querySelectorAll(
        'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      const focusableArray = Array.from(focusableElements);
      
      if (focusableArray.length === 0) return;

      const firstElement = focusableArray[0];
      const lastElement = focusableArray[focusableArray.length - 1];

      // Handle Tab key
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift+Tab: if on first element, wrap to last
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: if on last element, wrap to first
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleTabKey);
      return () => document.removeEventListener('keydown', handleTabKey);
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    setApiKey(e.target.value);
    setFeedback('');
  };

  const handleSave = () => {
    if (!apiKey || apiKey.trim() === '') {
      setFeedback('Please enter a valid API key');
      return;
    }

    try {
      const encodedKey = encodeApiKey(apiKey.trim());
      localStorage.setItem(STORAGE_KEY, encodedKey);
      setFeedback('API key saved successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('[Settings] Failed to save API key:', error);
      setFeedback('Failed to save API key');
    }
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey('');
    setFeedback('API key cleared');
  };

  if (!isOpen) return null;

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="settings-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex="-1"
      >
        <div className="settings-header">
          <h2>Settings</h2>
          <button
            className="settings-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="settings-form">
          <label htmlFor="api-key">OpenRouter/OpenAI API Key</label>
          <input
            ref={inputRef}
            id="api-key"
            type="password"
            value={apiKey}
            onChange={handleInputChange}
            placeholder="sk-or-v1-..."
            autoComplete="off"
          />
          <p className="settings-help-text">
            Provide your own API key to use The Inspector with your OpenRouter or OpenAI account.{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get an OpenRouter API key
            </a>
          </p>
          {feedback && (
            <p className="settings-feedback" style={{ color: feedback.includes('success') ? 'var(--color-primary)' : 'var(--color-glow-red)' }}>
              {feedback}
            </p>
          )}
        </div>

        <div className="settings-actions">
          <button onClick={handleSave}>Save</button>
          <button className="secondary" onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
