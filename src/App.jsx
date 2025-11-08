import React, { useState } from 'react';
import InspectorForm from './components/InspectorForm';
import NutritionLabel from './components/NutritionLabel';
import './styles/App.css';

/**
 * Root application component that orchestrates package analysis workflow
 * @returns {JSX.Element} The main application component
 */
export default function App() {
  // State declarations
  const [report, setReport] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedModel, setSelectedModel] = useState('moonshotai/kimi-k2-thinking');

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

  return (
    <div className="app">
      <header className="app-header">
        <h1>The Inspector</h1>
        <p>X-ray vision for npm packages</p>
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
    </div>
  );
}
