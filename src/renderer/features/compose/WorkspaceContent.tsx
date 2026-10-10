import type { SizeMode } from '../../../shared/contracts/window';
import { useLibrary } from '../library/library-context';
import { useQueue } from '../queue/queue-context';
import { useShellNavigation } from '../window-chrome/shell-navigation';
import { ComposeProvider } from './ComposeProvider';
import { showLibraryEntry } from './show-library-entry';
import { WorkspaceSurfaces } from './WorkspaceSurfaces';

export function WorkspaceContent({ mode }: { mode: SizeMode }) {
  const { model } = useLibrary();
  const navigation = useShellNavigation();
  const { model: queue } = useQueue();
  const show = async (destination: 'queue' | 'library', id: string) => {
    if (destination === 'queue') {
      navigation.showQueue();
      await queue.reveal(id);
    } else {
      navigation.showLibrary();
      await showLibraryEntry(model, id);
    }
  };

  return (
    <ComposeProvider
      onSaved={async (saved) => {
        if (saved.destination !== navigation.view) return;
        if (saved.destination === 'queue') {
          const item = await window.promptly.getQueueItem({ id: saved.id });

          if (
            item.ok &&
            queue.snapshot().tab === (item.value.item.completedAt === null ? 'open' : 'done')
          )
            await queue.reveal(saved.id);
        }

        if (saved.destination === 'library') {
          const request = model.snapshot().request;
          const match = await window.promptly.matchBundleSelection({
            ids: [saved.id],
            query: request.query,
            tagIds: request.tagIds,
            untagged: request.untagged
          });

          if (
            match.ok &&
            match.value.ids.includes(saved.id) &&
            model.snapshot().request === request
          )
            await model.reveal(saved.id);
        }
      }}
    >
      <WorkspaceSurfaces mode={mode} show={show} />
    </ComposeProvider>
  );
}
