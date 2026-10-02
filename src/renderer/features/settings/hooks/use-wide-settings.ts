import { useSyncExternalStore } from 'react';

const query = '(min-width: 640px)';
const subscribe = (changed: () => void) => {
  const media = window.matchMedia(query);

  media.addEventListener('change', changed);
  return () => {
    media.removeEventListener('change', changed);
  };
};

/** Change keyboard direction without remounting navigation or losing focus. */
export function useWideSettings() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => true
  );
}
