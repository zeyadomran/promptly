import type { SizeMode } from '../../../shared/contracts/window';
import { DrawingProvider } from '../drawing/DrawingProvider';
import { LibraryProvider } from '../library/LibraryProvider';
import { QueueProvider } from '../queue/QueueProvider';
import { SnippetSessionProvider } from '../snippets/SnippetSessionProvider';
import { TagPickerProvider } from '../tags/TagPickerProvider';
import { useShellNavigation } from '../window-chrome/shell-navigation';
import { WorkflowCopyProvider } from '../workflows/WorkflowCopyProvider';
import { WorkspaceContent } from './WorkspaceContent';

export function WorkflowWorkspace({
  mode,
  onModeChange
}: {
  mode: SizeMode;
  onModeChange: (mode: SizeMode) => Promise<void>;
}) {
  const navigation = useShellNavigation();
  const active = navigation.view === 'library' || navigation.view === 'queue';

  return (
    <div className="desktop-view workflow-workspace" hidden={!active} inert={!active}>
      <LibraryProvider>
        <TagPickerProvider active={active}>
          <SnippetSessionProvider active={active} mode={mode} onModeChange={onModeChange}>
            <WorkflowCopyProvider compact={mode === 'compact'}>
              <DrawingProvider>
                <QueueProvider>
                  <WorkspaceContent mode={mode} />
                </QueueProvider>
              </DrawingProvider>
            </WorkflowCopyProvider>
          </SnippetSessionProvider>
        </TagPickerProvider>
      </LibraryProvider>
    </div>
  );
}
