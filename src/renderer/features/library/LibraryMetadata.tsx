import type { Snippet } from '../../../shared/contracts/domain';
import { LibraryCopyStatus } from './LibraryCopyStatus';

export function LibraryMetadata({ snippet, copied }: { snippet: Snippet; copied: boolean }) {
  const metadata = [snippet.tags.map((tag) => tag.name).join(', '), snippet.sourceApp]
    .filter((part) => part !== null && part !== '')
    .join(' · ');

  return (
    <div className="library-row-meta">
      <span className="library-row-source">{metadata || 'Untagged'}</span>
      {copied && <LibraryCopyStatus />}
    </div>
  );
}
