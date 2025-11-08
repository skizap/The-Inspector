import React, { useState, useEffect } from 'react';
import InspectorForm from './components/InspectorForm';
import NutritionLabel from './components/NutritionLabel';
import Settings from './components/Settings';
import { DEFAULT_MODEL } from './config/models.js';
import './styles/App.css';

// Constants
const LS_MODEL_KEY = 'inspector-selected-model';

/**
 * Root application component that orchestrates package analysis workflow
 * @returns {JSX.Element} The main application component
 */
export default function App() {
  // State declarations
  const [report, setReport] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => {
    // Guard for non-browser contexts (SSR/prerender)
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.log('[App] localStorage unavailable, using default model');
      return DEFAULT_MODEL;
    }

    try {
      const storedModel = localStorage.getItem(LS_MODEL_KEY);
      if (storedModel) {
        console.log('[App] Restored model from localStorage:', storedModel);
        return storedModel;
      }
      console.log('[App] No stored model found, using default');
      return DEFAULT_MODEL;
    } catch (error) {
      console.error('[App] Failed to read from localStorage:', error);
      return DEFAULT_MODEL;
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Effect hooks
  useEffect(() => {
    // Guard for non-browser contexts (SSR/prerender)
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(LS_MODEL_KEY, selectedModel);
      console.log('[App] Saved model to localStorage:', selectedModel);
    } catch (error) {
      console.error('[App] Failed to save to localStorage:', error);
    }
  }, [selectedModel]);

  // Event handlers
  const handleAnalysisStart = () => {
    setIsAnalyzing(true);
    setReport(null); // Clear previous report
    console.log('[App] Analysis started');
  };

  const handleAnalysisComplete = (newReport) => {
    setReport(newReport);
    setIsAnalyzing(false);
    console.log('[App] Analysis complete:', newReport.packageInfo?.name);
    
    // Scroll to nutrition label
    setTimeout(() => {
      const labelElement = document.querySelector('.nutrition-label');
      if (labelElement) {
        window.scrollTo({
          top: labelElement.offsetTop - 20,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
    console.log('[App] Model changed to:', model);
  };

  const handleSettingsOpen = () => {
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>The Inspector</h1>
        <p>X-ray vision for npm packages</p>
        <button
          className="settings-toggle"
          onClick={handleSettingsOpen}
          aria-label="Open settings"
          title="Settings"
        >
          ⚙
        </button>
      </header>
      <main className="app-main">
        <InspectorForm
          onAnalysisStart={handleAnalysisStart}
          onAnalysisComplete={handleAnalysisComplete}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
        />
        {report && <NutritionLabel report={report} />}
      </main>
      <Settings isOpen={isSettingsOpen} onClose={handleSettingsClose} />
    </div>
  );
}
