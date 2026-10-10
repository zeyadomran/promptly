import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { keyboardFocus, windowFocusMaySearch } from '../library/keyboard-focus';
import { useUpdates } from '../settings/hooks/use-updates';
import { usePreferences } from '../settings/settings-context';
import { shellGlobalBindings, shellKeyCompose, shellKeyView } from './shell-keyboard';
import {
  type ComposeCommand,
  type CopyCommand,
  type SettingsSectionId,
  ShellNavigationContext,
  type ShellView
} from './shell-navigation';

export function ShellNavigationProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ShellView>('library');
  const [composeCommand, setComposeCommand] = useState<ComposeCommand>();
  const [copyCommand, setCopyCommand] = useState<CopyCommand>();
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
  const showQueue = useCallback(() => {
    setView('queue');
  }, []);
  const compose = useCallback((destination: 'library' | 'queue', fromGlobal = false) => {
    setComposeCommand((current) => ({
      command: 'compose',
      destination,
      fromGlobal,
      request: (current?.request ?? 0) + 1
    }));
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
        else if (next === 'queue') showQueue();
        else showLibrary();
      }),
    [showLibrary, showQueue, showSettings, showWiki]
  );
  useEffect(
    () =>
      window.promptly.subscribeShellCommands((command) => {
        if (command.command === 'copy') {
          setView('library');
          setCopyCommand((current) => ({ ...command, request: (current?.request ?? 0) + 1 }));
          return;
        }

        setView((current) =>
          current === 'settings' || current === 'wiki' ? command.destination : current
        );
        compose(command.destination, true);
      }),
    [compose]
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
      const input = {
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
      };

      if (shellKeyCompose(input, settings.localShortcuts)) {
        event.preventDefault();
        compose(view === 'queue' ? 'queue' : 'library');
        return;
      }

      const next = shellKeyView(input, settings.localShortcuts, shellGlobalBindings(settings));

      if (next === undefined) return;
      event.preventDefault();
      if (next === 'library') showLibrary();
      else if (next === 'queue') showQueue();
      else if (next === 'settings') showSettings();
      else showWiki();
    };

    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('keydown', keydown);
    };
  }, [view, settings, showLibrary, showQueue, showSettings, showWiki, compose]);
  const navigation = useMemo(
    () => ({
      view,
      settingsSection: settingsTarget.section,
      settingsRequest: settingsTarget.request,
      showLibrary,
      showQueue,
      compose,
      composeCommand,
      copyCommand,
      showSettings,
      showWiki,
      toggleView: (next: 'settings' | 'wiki') => {
        if (view === next) showLibrary();
        else if (next === 'settings') showSettings();
        else showWiki();
      }
    }),
    [
      view,
      settingsTarget,
      showLibrary,
      showQueue,
      showSettings,
      showWiki,
      compose,
      composeCommand,
      copyCommand
    ]
  );

  return <ShellNavigationContext value={navigation}>{children}</ShellNavigationContext>;
}
