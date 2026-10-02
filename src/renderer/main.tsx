import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { initializeStyleNonce } from './lib/style-nonce';

const root = document.getElementById('root');

if (!root) throw new Error('Promptly root element is missing');

initializeStyleNonce();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
