import { Plus } from 'lucide-react';

import type { SizeMode } from '../../../shared/contracts/window';
import { shortcutLabel } from '../../../shared/shortcuts/accelerator';
import { Button } from '../../components/ui/button';
import { TabsList, TabsTrigger } from '../../components/ui/tabs';
import { LibrarySearch } from '../library/LibrarySearch';
import { QueueTabs } from '../queue/QueueTabs';
import { usePreferences } from '../settings/settings-context';
import { useShellNavigation } from '../window-chrome/shell-navigation';
import { useCompose } from './compose-context';

export function WorkspaceBar({ mode, openCount = 0 }: { mode: SizeMode; openCount?: number }) {
  const navigation = useShellNavigation();
  const { state, open } = useCompose();
  const { settings } = usePreferences();
  const blocked = mode === 'compact' && state.draft !== undefined;

  return (
    <header className="workspace-bar">
      <TabsList
        aria-label="Workspace"
        title={blocked ? 'Finish or cancel the draft first' : undefined}
      >
        <TabsTrigger value="library" disabled={blocked} aria-disabled={blocked}>
          Library
        </TabsTrigger>
        <TabsTrigger value="queue" disabled={blocked} aria-disabled={blocked}>
          Queue{openCount > 0 && <span className="workspace-count">{openCount}</span>}
        </TabsTrigger>
      </TabsList>
      {navigation.view === 'library' ? <LibrarySearch /> : <QueueTabs />}
      <Button
        className="workspace-new"
        size="sm"
        variant="outline"
        onClick={() => {
          void open(navigation.view === 'queue' ? 'queue' : 'library');
        }}
        disabled={state.pending}
        data-drawing-fallback
        title={
          settings.localShortcuts.newSnippet === null
            ? undefined
            : shortcutLabel(settings.localShortcuts.newSnippet, window.promptly.platform)
        }
      >
        <Plus aria-hidden="true" />
        {mode === 'compact' ? 'New' : navigation.view === 'queue' ? 'New prompt' : 'New snippet'}
      </Button>
    </header>
  );
}
