import { PaperclipIcon } from 'lucide-react';

import type { SnippetPreview } from '../../../shared/contracts/domain';
import { relativeTime } from '../snippets/relative-time';
import { VariableCount } from '../variables/VariableCount';
import { LibraryCopyStatus } from './LibraryCopyStatus';
import { LibraryRowTags } from './LibraryRowTags';

export function LibraryMetadata({
  snippet,
  copied,
  regular
}: {
  snippet: SnippetPreview;
  copied: boolean;
  regular: boolean;
}) {
  const time = relativeTime(snippet.createdAt);

  return (
    <div className="library-row-meta">
      <span className="library-row-origin" data-has-tags={snippet.tags.length > 0}>
        {copied ? (
          <LibraryCopyStatus />
        ) : (
          <time dateTime={snippet.createdAt}>
            {regular ? time : time.replace(' ago', '').replace('just now', 'now')}
          </time>
        )}
        {snippet.sourceApp !== null && (
          <span className="library-row-source">{snippet.sourceApp}</span>
        )}
      </span>
      <VariableCount count={snippet.variableCount} />
      {snippet.attachments.length > 0 && (
        <span
          className="library-attachment-count"
          aria-label={`${String(snippet.attachments.length)} attachments, copied separately`}
        >
          <PaperclipIcon aria-hidden="true" />
          {snippet.attachments.length}
        </span>
      )}
      {snippet.tags.length > 0 && <LibraryRowTags tags={snippet.tags} />}
    </div>
  );
}
