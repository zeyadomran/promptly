import { foldText, matchRanges } from '../../../shared/search/match-text';
import { parseQuery } from '../../../shared/search/parse-query';
import { HighlightedText } from '../../components/shared/HighlightedText';
import { AttachmentStrip } from '../attachments/AttachmentStrip';
import { VariableStatus } from '../compose/VariableStatus';
import { useLibrary } from '../library/library-context';
import { PreviewTagBar } from './PreviewTagBar';
import { useSnippetSession } from './snippet-context';
import { SnippetActions } from './SnippetActions';
import { SnippetEditor } from './SnippetEditor';
import { useSnippetDrawing } from './use-snippet-drawing';

export function SnippetPreview() {
  const { state: library } = useLibrary();
  const { state, session } = useSnippetSession();
  const drawing = useSnippetDrawing();
  const snippet = state.snippet;

  if (snippet === null)
    return (
      <aside className="snippet-preview snippet-preview-empty" aria-label="Snippet preview">
        <p role={state.error !== undefined ? 'alert' : 'status'}>
          {state.error ?? (state.loading ? 'Loading preview…' : 'Select a snippet to preview it.')}
        </p>
      </aside>
    );
  const ranges = matchRanges(
    snippet.text,
    parseQuery(library.request.query).text.map(foldText),
    previewLimits.highlights
  );

  return (
    <aside className="snippet-preview" aria-label="Snippet preview">
      {!state.editing && <PreviewTagBar snippet={snippet} />}
      {state.editing && snippet.id !== library.selectedId && (
        <p className="snippet-draft-notice" role="status">
          Editing the previous snippet. Apply or cancel to preview your new selection.
        </p>
      )}
      {state.editing ? (
        <SnippetEditor />
      ) : (
        <>
          <div className="snippet-full-text" tabIndex={0} aria-label="Full snippet text">
            {snippet.text.trim() === '' ? (
              <span className="text-muted-foreground">No text. Attachments only.</span>
            ) : (
              <HighlightedText text={snippet.text} ranges={ranges} />
            )}
          </div>
          <VariableStatus text={snippet.text} />
          <AttachmentStrip
            attachments={snippet.attachments}
            onAnnotate={(id) => {
              void drawing.open(id);
            }}
            onError={(message) => {
              session.report(message);
            }}
          />
          {state.error !== undefined && (
            <p role="alert" className="snippet-error">
              {state.error}
            </p>
          )}
          <SnippetActions snippet={snippet} />
        </>
      )}
    </aside>
  );
}

import { previewLimits } from '../../../shared/contracts/preview-limits';
