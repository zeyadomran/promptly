import { useState } from 'react';

import type { SizeMode } from '../../../shared/contracts/window';
import { Tabs, TabsContent } from '../../components/ui/tabs';
import { stageDroppedAttachments } from '../attachments/stage-dropped-attachments';
import { useDrawing } from '../drawing/useDrawing';
import { LibraryCommandProvider } from '../library/LibraryCommandProvider';
import { LibraryWindow } from '../library/LibraryWindow';
import { useQueue } from '../queue/queue-context';
import { QueueWindow } from '../queue/QueueWindow';
import { useShellNavigation } from '../window-chrome/shell-navigation';
import { useCompose } from './compose-context';
import { ComposeFeedback } from './ComposeFeedback';
import { ComposePane } from './ComposePane';
import { WorkspaceBar } from './WorkspaceBar';

export function WorkspaceSurfaces({
  mode,
  show
}: {
  mode: SizeMode;
  show: (destination: 'queue' | 'library', id: string) => Promise<void>;
}) {
  const navigation = useShellNavigation();
  const { model, state, open, editQueue } = useCompose();
  const { state: queue } = useQueue();
  const drawing = useDrawing();
  const [drag, setDrag] = useState(false);
  const drafted = state.draft !== undefined;
  const library = navigation.view === 'library';
  const drop = async (files: File[]) => {
    await open('queue');
    const draft = model.snapshot().draft;

    if (draft === undefined || model.snapshot().pending || model.snapshot().assetPending) return;
    const token = draft.draftToken;

    await stageDroppedAttachments(token, files, {
      current: () => model.snapshot().draft?.draftToken === token,
      busy: (pending) => {
        model.setAssetPending(token, pending);
      },
      change: (attachments) => {
        model.refreshAttachments(attachments, token);
      },
      report: (message) => {
        model.report(message);
      }
    });
  };

  return (
    <Tabs
      className="workspace-layout"
      value={library ? 'library' : 'queue'}
      onValueChange={(view) => {
        if (mode === 'compact' && drafted) return;
        if (view === 'library') navigation.showLibrary();
        if (view === 'queue') navigation.showQueue();
      }}
      data-mode={mode}
      data-drafted={drafted}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        setDrag(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrag(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDrag(false);
        void drop(Array.from(event.dataTransfer.files));
      }}
    >
      <WorkspaceBar mode={mode} openCount={queue.openCount} />
      <ComposeFeedback show={show} />
      <div className="workspace-surfaces">
        <TabsContent
          forceMount
          value="library"
          data-shell-library
          className="workspace-collection"
          hidden={!library || (mode === 'compact' && drafted)}
          inert={!library || (mode === 'compact' && drafted)}
        >
          <LibraryCommandProvider active={library && !drafted}>
            <LibraryWindow mode={mode} />
          </LibraryCommandProvider>
        </TabsContent>
        <TabsContent
          forceMount
          value="queue"
          className="workspace-collection"
          hidden={library || (mode === 'compact' && drafted)}
          inert={library || (mode === 'compact' && drafted)}
        >
          <QueueWindow
            mode={mode}
            active={navigation.view === 'queue' && !(mode === 'compact' && drafted)}
            onEdit={editQueue}
            onShowLibrary={(id) => show('library', id)}
            onAnnotate={async (id, attachmentId) => {
              await editQueue(id);
              const draft = model.snapshot().draft;

              if (draft?.source?.id !== id) return;
              const token = draft.draftToken;

              await drawing.open({
                draftToken: token,
                attachments: draft.attachments,
                attachmentId,
                onSaved: (attachments) => {
                  model.refreshAttachments(attachments, token);
                }
              });
            }}
          />
        </TabsContent>
        {drafted && <ComposePane />}
      </div>
      {drag && <div className="workspace-drop-notice">Drop files to attach to a prompt</div>}
    </Tabs>
  );
}
