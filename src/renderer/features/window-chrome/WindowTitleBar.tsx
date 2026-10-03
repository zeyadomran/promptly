import { BookOpen, ChevronLeft, Settings } from 'lucide-react';
import type { ReactNode } from 'react';

import type { SizeMode } from '../../../shared/contracts/window';
import { IconButton } from '../../components/shared/IconButton';
import { Logo } from '../../components/shared/Logo';
import { Button } from '../../components/ui/button';
import { useShellNavigation } from './shell-navigation';
import { SizeControl } from './SizeControl';
import { WindowPreferences } from './WindowPreferences';

export function WindowTitleBar({
  mode,
  setMode,
  updateControl,
  updateVisible = false
}: {
  mode: SizeMode;
  setMode: (mode: SizeMode) => void;
  updateControl?: ReactNode;
  updateVisible?: boolean;
}) {
  const { view, showLibrary, toggleView } = useShellNavigation();

  return (
    <header
      className="window-titlebar"
      data-platform={window.promptly.platform}
      data-mode={mode}
      data-update-visible={updateVisible}
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
        {updateVisible && (
          <>
            {updateControl}
            <span className="window-action-divider" aria-hidden="true" />
          </>
        )}
        <WindowPreferences />
        <IconButton
          label="Wiki"
          shortcut="F1"
          aria-keyshortcuts="F1"
          icon={BookOpen}
          aria-pressed={view === 'wiki'}
          className={view === 'wiki' ? 'bg-muted' : undefined}
          onClick={() => {
            toggleView('wiki');
          }}
        />
        <IconButton
          label="Settings"
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
