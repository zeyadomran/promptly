import type { SizeMode } from '../../../shared/contracts/window';
import { RegularLibrary } from '../snippets/RegularLibrary';
import { SnippetSessionProvider } from '../snippets/SnippetSessionProvider';
import { TagPickerProvider } from '../tags/TagPickerProvider';
import { CompactLibrary } from './CompactLibrary';
import { LibraryCommandProvider } from './LibraryCommandProvider';
import { LibraryProvider } from './LibraryProvider';

/** Selection, drafts, tags and commands remain mounted across both library surfaces. */
export function LibraryWindow({
  mode,
  onModeChange
}: {
  mode: SizeMode;
  onModeChange: (mode: SizeMode) => Promise<void>;
}) {
  return (
    <LibraryProvider>
      <TagPickerProvider>
        <SnippetSessionProvider mode={mode} onModeChange={onModeChange}>
          <LibraryCommandProvider active>
            {mode === 'compact' ? <CompactLibrary /> : <RegularLibrary />}
          </LibraryCommandProvider>
        </SnippetSessionProvider>
      </TagPickerProvider>
    </LibraryProvider>
  );
}
