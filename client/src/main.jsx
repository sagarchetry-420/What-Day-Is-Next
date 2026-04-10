import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Privacy from './pages/Privacy';
import Feedback from './pages/Feedback';
import AddFeedback from './pages/AddFeedback';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import { ClockProvider } from './contexts/ClockContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ClockProvider>
        <BrowserRouter>
          <PwaInstallPrompt />
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/feedback/add" element={<AddFeedback />} />
          </Routes>
        </BrowserRouter>
      </ClockProvider>
    </ThemeProvider>
  </React.StrictMode>
);
