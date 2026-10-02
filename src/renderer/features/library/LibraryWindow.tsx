import type { SizeMode } from '../../../shared/contracts/window';
import { CompactLibrary } from './CompactLibrary';
import { FoundationScreen } from './FoundationScreen';
import { LibraryProvider } from './LibraryProvider';
import { LibraryCommandProvider } from './LibraryCommandProvider';

/** Keep the selection owner mounted across Compact/Regular mode switches. */
export function LibraryWindow({ mode }: { mode: SizeMode }) {
  return (
    <LibraryProvider>
      <LibraryCommandProvider>
      {mode === 'compact' ? (
        <CompactLibrary />
      ) : (
        <FoundationScreen platform={window.promptly.platform} />
      )}
      </LibraryCommandProvider>
    </LibraryProvider>
  );
}
