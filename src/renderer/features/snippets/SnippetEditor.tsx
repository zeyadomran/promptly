import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { useLibrarySelection } from '../library/library-context';
import { editorCancelCommand } from '../library/library-keyboard';
import { usePreferences } from '../settings/settings-context';
import { useSnippetSession } from './snippet-context';

export function SnippetEditor() {
  const { session, state } = useSnippetSession();
  const selection = useLibrarySelection();
  const { settings } = usePreferences();
  const cancel = () => {
    void session.discard();
    selection.focusSearch();
  };

  const save = async () => {
    if (await session.save()) selection.focusSearch();
  };

  return (
    <div className="snippet-editor">
      <label className="sr-only" htmlFor="snippet-edit-text">
        Edit snippet text
      </label>
      <Textarea
        id="snippet-edit-text"
        data-snippet-editor
        autoFocus
        maxLength={1_000_000}
        value={state.draft}
        readOnly={state.pending}
        onChange={(event) => {
          session.change(event.target.value);
        }}
        onKeyDown={(event) => {
          if (
            !state.pending &&
            editorCancelCommand(
              {
                key: event.key,
                code: event.code,
                meta: event.metaKey,
                ctrl: event.ctrlKey,
                alt: event.altKey,
                shift: event.shiftKey,
                repeat: event.repeat,
                composing: event.nativeEvent.isComposing || event.key === 'Process',
                prevented: event.defaultPrevented,
                altGraph: event.getModifierState('AltGraph')
              },
              settings.localShortcuts
            )
          ) {
            event.preventDefault();
            event.stopPropagation();
            cancel();
          }
        }}
      />
      {state.error !== undefined && (
        <p role="alert" className="snippet-error">
          {state.error}
        </p>
      )}
      <div className="snippet-editor-actions">
        <Button
          variant="outline"
          disabled={state.pending}
          onClick={() => {
            cancel();
          }}
        >
          Cancel
        </Button>
        <Button
          disabled={state.pending || state.missing || state.draft.trim() === ''}
          onClick={() => {
            void save();
          }}
        >
          {state.pending ? 'Applying' : state.conflict ? 'Replace saved text' : 'Apply changes'}
        </Button>
      </div>
    </div>
  );
}
