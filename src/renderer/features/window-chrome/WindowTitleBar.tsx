import { Settings } from 'lucide-react';

import type { SizeMode } from '../../../shared/contracts/window';
import { IconButton } from '../../components/shared/IconButton';
import { Logo } from '../../components/shared/Logo';
import { SizeControl } from './SizeControl';
import { WindowPreferences } from './WindowPreferences';

export function WindowTitleBar({
  mode,
  title,
  setMode
}: {
  mode: SizeMode;
  title?: string;
  setMode: (mode: SizeMode) => void;
}) {
  return (
    <header
      className="window-titlebar"
      data-platform={window.promptly.platform}
      data-mode={mode}
      data-kind={title === undefined ? 'main' : 'auxiliary'}
    >
      <div className="window-brand">
        <Logo size={20} />
        <span className="window-label">{title ?? 'Promptly'}</span>
      </div>
      <div className="window-title-actions">
        <WindowPreferences mode={mode} />
        {title === undefined && <SizeControl mode={mode} onChange={setMode} />}
        {title === undefined && (
          <IconButton
            label="Settings"
            icon={Settings}
            onClick={() => {
              void window.promptly.openDesktopWindow({ kind: 'settings' });
            }}
          />
        )}
      </div>
    </header>
  );
}
