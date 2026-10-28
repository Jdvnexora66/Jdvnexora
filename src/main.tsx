import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PublicVitrine from './components/PublicVitrine';
import './styles.css';
import './vitrine.css';

const isPublicHome = window.location.pathname === '/' || window.location.pathname === '';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isPublicHome ? <PublicVitrine /> : <App />}
  </React.StrictMode>,
);
