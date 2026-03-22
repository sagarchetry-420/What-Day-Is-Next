import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ClockProvider } from './contexts/ClockContext';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClockProvider>
      <App />
    </ClockProvider>
  </React.StrictMode>
);
