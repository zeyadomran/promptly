import type { SizeMode } from '../../../shared/contracts/window';
import { TagPickerProvider } from '../tags/TagPickerProvider';
import { CompactLibrary } from './CompactLibrary';
import { FoundationScreen } from './FoundationScreen';
import { LibraryCommandProvider } from './LibraryCommandProvider';
import { LibraryProvider } from './LibraryProvider';

/** Keep the selection owner mounted across Compact/Regular mode switches. */
export function LibraryWindow({ mode }: { mode: SizeMode }) {
  return (
    <LibraryProvider>
      <TagPickerProvider>
        <LibraryCommandProvider active={mode === 'compact'}>
          {mode === 'compact' ? (
            <CompactLibrary />
          ) : (
            <FoundationScreen platform={window.promptly.platform} />
          )}
        </LibraryCommandProvider>
      </TagPickerProvider>
    </LibraryProvider>
  );
}
