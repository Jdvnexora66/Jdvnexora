import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import PublicVitrine from './components/PublicVitrine';
import './styles.css';
import './layout-safety.css';
import './learning-spaces.css';
import './remaining-modules-spacing.css';
import './vitrine.css';
import { registerServiceWorker } from './lib/registerServiceWorker';

registerServiceWorker();

const isNativeShell = Capacitor.isNativePlatform();
const isPublicHome = !isNativeShell && (window.location.pathname === '/' || window.location.pathname === '');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isPublicHome ? <PublicVitrine /> : <App />}
  </React.StrictMode>,
);
