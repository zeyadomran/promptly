import { Button } from '../../components/ui/button';
import { usePreferences } from '../settings/settings-context';
import { useLibrary } from './library-context';
import { initialQuery } from './page-cache';
import { saveShortcutLabel } from './save-shortcut-label';

export function LibraryEmpty() {
  const { state, model, selection } = useLibrary();
  const { settings } = usePreferences();
  const filtered =
    state.request.query !== '' || state.request.tagIds.length > 0 || state.request.untagged;

  return (
    <div className="library-empty" role="status">
      <p>{filtered ? 'No snippets match your search.' : 'Your library is empty.'}</p>
      {filtered ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            model.query(initialQuery);
            selection.focusSearch();
          }}
        >
          Clear search and filters
        </Button>
      ) : (
        <p className="text-muted-foreground">
          Select text in another app, then {saveShortcutLabel(settings.saveShortcut)} to save it.
        </p>
      )}
    </div>
  );
}
