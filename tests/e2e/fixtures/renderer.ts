import './harness-types';

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { SnippetText } from '../../../src/renderer/components/shared/SnippetText';
import { createSearchClient } from '../../../src/renderer/lib/desktop-client';

const target = document.getElementById('root');

if (target === null) throw new Error('Fixture root is missing.');
const root = createRoot(target);
const search = createSearchClient(window.promptly, (result) => {
  root.render(
    createElement(SnippetText, {
      text: result.ok ? (result.value.items[0]?.text ?? '') : result.error.code
    })
  );
});

window.fixtureEvents = [];
const stop = window.promptly.subscribeChanges((event) => {
  if (event.revision > 0) window.fixtureEvents.push(event.revision);
});

window.fixtureStop = () => {
  search.dispose();
  stop();
};

void search.search({
  query: '',
  tagIds: [],
  untagged: false,
  sort: 'newest',
  offset: 0,
  limit: 50
});
