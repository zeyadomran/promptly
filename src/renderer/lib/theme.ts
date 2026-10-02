export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

export function applyTheme(preference: ThemePreference) {
  document.documentElement.dataset['theme'] = preference;
}

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function subscribeSystemTheme(onChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  media.addEventListener('change', onChange);

  return () => {
    media.removeEventListener('change', onChange);
  };
}
