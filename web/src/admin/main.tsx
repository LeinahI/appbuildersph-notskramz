import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource-variable/dm-sans';
import '../index.css';
import './admin.css';
import '../display-preferences.css';
import { initializeDisplayPreferences } from '../config/displayPreferences';
import { AdminApp } from './AdminApp';
import { ToastHost } from '../components/ToastHost';

initializeDisplayPreferences();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AdminApp /><ToastHost /></React.StrictMode>,
);
