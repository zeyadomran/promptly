import { BookOpen, ChevronLeft, Settings } from 'lucide-react';
import type { ReactNode } from 'react';

import type { SizeMode } from '../../../shared/contracts/window';
import { shortcutLabel } from '../../../shared/shortcuts/accelerator';
import { IconButton } from '../../components/shared/IconButton';
import { Logo } from '../../components/shared/Logo';
import { Button } from '../../components/ui/button';
import { isTitleBarUpdateVisible } from '../settings/hooks/update-presentation';
import { useUpdates } from '../settings/hooks/use-updates';
import { usePreferences } from '../settings/settings-context';
import { shellGlobalBindings, wikiShortcutAvailable } from './shell-keyboard';
import { useShellNavigation } from './shell-navigation';
import { SizeControl } from './SizeControl';
import { TitleBarUpdate } from './TitleBarUpdate';
import { WindowPreferences } from './WindowPreferences';

export function WindowTitleBar({
  mode,
  setMode,
  updateControl,
  updateVisible
}: {
  mode: SizeMode;
  setMode: (mode: SizeMode) => void;
  updateControl?: ReactNode;
  updateVisible?: boolean | undefined;
}) {
  const { view, showLibrary, toggleView } = useShellNavigation();
  const { settings } = usePreferences();
  const { state } = useUpdates();
  const visible = updateVisible ?? isTitleBarUpdateVisible(state);
  const wikiShortcut = wikiShortcutAvailable(
    settings.localShortcuts,
    shellGlobalBindings(settings)
  );

  return (
    <header
      className="window-titlebar"
      data-platform={window.promptly.platform}
      data-mode={mode}
      data-update-visible={visible}
    >
      {view === 'library' ? (
        <div className="window-brand">
          <Logo size={20} />
          <span className="window-label">Promptly</span>
        </div>
      ) : (
        <Button
          className="window-back"
          aria-label="Back to library"
          variant="ghost"
          onClick={showLibrary}
        >
          <ChevronLeft aria-hidden="true" />
          <span className="window-back-label">{view === 'settings' ? 'Settings' : 'Wiki'}</span>
        </Button>
      )}
      <div className="window-title-actions">
        {visible && (
          <>
            {updateControl ?? <TitleBarUpdate compact={mode === 'compact'} />}
            <span className="window-action-divider" aria-hidden="true" />
          </>
        )}
        <WindowPreferences />
        <IconButton
          label="Wiki"
          shortcut={wikiShortcut ? 'F1' : undefined}
          aria-keyshortcuts={wikiShortcut ? 'F1' : undefined}
          icon={BookOpen}
          aria-pressed={view === 'wiki'}
          className={view === 'wiki' ? 'bg-muted' : undefined}
          onClick={() => {
            toggleView('wiki');
          }}
        />
        <IconButton
          label="Settings"
          shortcut={shortcutLabel(settings.localShortcuts.settings, window.promptly.platform)}
          icon={Settings}
          aria-pressed={view === 'settings'}
          className={view === 'settings' ? 'bg-muted' : undefined}
          onClick={() => {
            toggleView('settings');
          }}
        />
        <span className="window-action-divider" aria-hidden="true" />
        <SizeControl mode={mode} onChange={setMode} />
      </div>
    </header>
  );
}
