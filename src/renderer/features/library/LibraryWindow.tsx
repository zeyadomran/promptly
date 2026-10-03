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
  onModeChange,
  active = true
}: {
  active?: boolean;
  mode: SizeMode;
  onModeChange: (mode: SizeMode) => Promise<void>;
}) {
  return (
    <LibraryProvider>
      <TagPickerProvider active={active}>
        <SnippetSessionProvider active={active} mode={mode} onModeChange={onModeChange}>
          <LibraryCommandProvider active={active}>
            {mode === 'compact' ? <CompactLibrary /> : <RegularLibrary />}
          </LibraryCommandProvider>
        </SnippetSessionProvider>
      </TagPickerProvider>
    </LibraryProvider>
  );
}
