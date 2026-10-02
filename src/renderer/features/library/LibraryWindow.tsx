import type { SizeMode } from '../../../shared/contracts/window';
import { RegularLibrary } from '../snippets/RegularLibrary';
import { SnippetSessionProvider } from '../snippets/SnippetSessionProvider';
import { CompactLibrary } from './CompactLibrary';
import { LibraryCommandProvider } from './LibraryCommandProvider';
import { LibraryProvider } from './LibraryProvider';

/** Selection, drafts and commands remain mounted across both library surfaces. */
export function LibraryWindow({
  mode,
  onModeChange
}: {
  mode: SizeMode;
  onModeChange: (mode: SizeMode) => Promise<void>;
}) {
  return (
    <LibraryProvider>
      <SnippetSessionProvider mode={mode} onModeChange={onModeChange}>
        <LibraryCommandProvider active>
          {mode === 'compact' ? <CompactLibrary /> : <RegularLibrary />}
        </LibraryCommandProvider>
      </SnippetSessionProvider>
    </LibraryProvider>
  );
}
