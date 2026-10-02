import './confirmation.css';

import { createRoot } from 'react-dom/client';

import { CaptureConfirmation } from './CaptureConfirmation';

const root = document.getElementById('root');

if (root !== null) createRoot(root).render(<CaptureConfirmation />);
