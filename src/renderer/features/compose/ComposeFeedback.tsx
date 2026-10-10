import { Button } from '../../components/ui/button';
import { useCompose } from './compose-context';

export function ComposeFeedback({
  show
}: {
  show: (destination: 'queue' | 'library', id: string) => Promise<void>;
}) {
  const { model, state } = useCompose();
  const saved = state.saved;

  if (saved === undefined)
    return state.draft === undefined && state.error !== undefined ? (
      <p className="workspace-feedback" role="alert">
        {state.error}
      </p>
    ) : null;
  return (
    <>
      <div className="workspace-feedback" role="status">
        <span>
          Saved to {saved.destination === 'queue' ? 'Queue' : 'Library'}.
          {saved.returned === 'unavailable' || saved.returned === 'denied'
            ? ' Unable to return; your prompt is saved.'
            : saved.returned === 'returned'
              ? ` Returned to ${saved.returnLabel ?? 'your previous app'}.`
              : ''}
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            void show(saved.destination, saved.id).catch(() => {
              model.report('Saved. Unable to show the entry. Try again.');
            });
          }}
        >
          Show
        </Button>
      </div>
      {state.error !== undefined && (
        <p role="alert" className="workspace-feedback workspace-feedback-error">
          {state.error}
        </p>
      )}
    </>
  );
}
