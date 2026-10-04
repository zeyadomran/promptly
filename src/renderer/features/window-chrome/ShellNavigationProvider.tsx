import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { keyboardFocus, windowFocusMaySearch } from '../library/keyboard-focus';
import { useUpdates } from '../settings/hooks/use-updates';
import { usePreferences } from '../settings/settings-context';
import { shellGlobalBindings, shellKeyView } from './shell-keyboard';
import { type SettingsSectionId, ShellNavigationContext, type ShellView } from './shell-navigation';

export function ShellNavigationProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ShellView>('library');
  const [settingsTarget, setSettingsTarget] = useState({
    section: 'general' as SettingsSectionId,
    request: 0
  });
  const libraryFocus = useRef<HTMLElement | null>(null);
  const { settings } = usePreferences();
  const rememberFocus = useCallback(() => {
    const active = document.activeElement;

    if (active instanceof HTMLElement && active.closest('[data-shell-library]') !== null)
      libraryFocus.current = active;
  }, []);
  const showLibrary = useCallback(() => {
    setView('library');
  }, []);
  const showSettings = useCallback(
    (section?: SettingsSectionId) => {
      rememberFocus();
      if (section !== undefined)
        setSettingsTarget((current) => ({ section, request: current.request + 1 }));
      setView('settings');
    },
    [rememberFocus]
  );
  const showWiki = useCallback(() => {
    rememberFocus();
    setView('wiki');
  }, [rememberFocus]);
  const showUpdates = useCallback(() => {
    showSettings('about');
  }, [showSettings]);

  useUpdates(showUpdates);
  useEffect(
    () =>
      window.promptly.subscribeShellNavigation((next) => {
        if (next === 'settings') showSettings();
        else if (next === 'wiki') showWiki();
        else showLibrary();
      }),
    [showLibrary, showSettings, showWiki]
  );
  useEffect(() => {
    if (view !== 'library') return;
    const frame = requestAnimationFrame(() => {
      if (!windowFocusMaySearch()) return;
      const target = libraryFocus.current;

      if (target?.isConnected === true && !target.matches(':disabled'))
        target.focus({ preventScroll: true });
      else
        document
          .querySelector<HTMLElement>('[data-promptly-search]')
          ?.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [view]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const next = shellKeyView(
        {
          view,
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          altGraph: event.getModifierState('AltGraph'),
          repeat: event.repeat,
          isComposing: event.isComposing,
          prevented: event.defaultPrevented,
          overlay: keyboardFocus(event) === 'overlay'
        },
        settings.localShortcuts,
        shellGlobalBindings(settings)
      );

      if (next === undefined) return;
      event.preventDefault();
      if (next === 'library') showLibrary();
      else if (next === 'settings') showSettings();
      else showWiki();
    };

    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('keydown', keydown);
    };
  }, [view, settings, showLibrary, showSettings, showWiki]);
  const navigation = useMemo(
    () => ({
      view,
      settingsSection: settingsTarget.section,
      settingsRequest: settingsTarget.request,
      showLibrary,
      showSettings,
      showWiki,
      toggleView: (next: 'settings' | 'wiki') => {
        if (view === next) showLibrary();
        else if (next === 'settings') showSettings();
        else showWiki();
      }
    }),
    [view, settingsTarget, showLibrary, showSettings, showWiki]
  );

  return <ShellNavigationContext value={navigation}>{children}</ShellNavigationContext>;
}
