import type { SizeMode } from '../../../shared/contracts/window';
import { RegularLibrary } from '../snippets/RegularLibrary';
import { CompactLibrary } from './CompactLibrary';

/** Selection, drafts, tags and commands remain mounted across both library surfaces. */
export function LibraryWindow({ mode }: { mode: SizeMode }) {
  return mode === 'compact' ? <CompactLibrary /> : <RegularLibrary />;
}
