import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource-variable/dm-sans';
import '../index.css';
import './admin.css';
import { AdminApp } from './AdminApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AdminApp /></React.StrictMode>,
);
