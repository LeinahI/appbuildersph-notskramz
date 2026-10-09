import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource-variable/dm-sans';
import App from './App';
import { ToastHost } from './components/ToastHost';
import './index.css';
import './display-preferences.css';
import { initializeDisplayPreferences } from './config/displayPreferences';

initializeDisplayPreferences();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <ToastHost />
  </React.StrictMode>,
);
