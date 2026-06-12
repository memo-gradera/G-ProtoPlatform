import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import MsalProviderWrapper from '@/auth/MsalProviderWrapper.jsx';
import { getAuthProvider } from '@/lib/authMode';
import { getBackendProvider } from '@/services/backendMode';
import '@/index.css';

console.info('Auth mode:', getAuthProvider());
console.info('Backend mode:', getBackendProvider());

ReactDOM.createRoot(document.getElementById('root')).render(
  <MsalProviderWrapper>
    <App />
  </MsalProviderWrapper>,
);
