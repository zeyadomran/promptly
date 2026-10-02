import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { settingsSnapshotSchema } from '../shared/contracts/settings';
import { App } from './App';
import { initializeStyleNonce } from './lib/style-nonce';
import { applyTheme } from './lib/theme';

const root = document.getElementById('root');

if (!root) throw new Error('Promptly root element is missing');

initializeStyleNonce();
if (window.promptlyInitialSettings !== undefined)
  applyTheme(settingsSnapshotSchema.parse(window.promptlyInitialSettings).settings.theme);

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
