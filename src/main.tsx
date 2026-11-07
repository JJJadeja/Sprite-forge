import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register offline Service Worker for Android PWA / WebAPK installability
if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || import.meta.env.PROD)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration note:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
