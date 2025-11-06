import React from 'react';
import './styles/App.css';

/**
 * Root application component for The Inspector
 * @returns {JSX.Element} The main application component
 */
export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>The Inspector</h1>
        <p>X-ray vision for npm packages</p>
      </header>
      <main className="app-main">
        <p>Package analysis tool coming soon...</p>
      </main>
    </div>
  );
}
