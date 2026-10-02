import { createRoot } from 'react-dom/client';

import { SearchFixture } from './SearchFixture';

const root = document.getElementById('root');

if (root === null) throw new Error('Missing fixture root.');
createRoot(root).render(<SearchFixture />);
