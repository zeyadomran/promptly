import { useEffect, useRef, useState } from 'react';

import type { TagSummary } from '../../../shared/contracts/domain';
import { Button } from '../../components/ui/button';
import { tagColors } from '../../lib/tag-palette';
import { TagDeleteDialog } from '../settings/tags/TagDeleteDialog';
import { TagEditorDialog } from '../settings/tags/TagEditorDialog';
import { type TagAction, TagManagementRow } from '../settings/tags/TagManagementRow';
import { useTagManagement } from '../settings/tags/use-tag-management';

type Target =
  | { action: 'create'; tag?: undefined; trigger: HTMLElement }
  | { action: TagAction; tag: TagSummary; trigger: HTMLElement };

export function TagsSettings() {
  const catalog = useTagManagement();
  const [target, setTarget] = useState<Target>();
  const currentTarget = useRef<Target | undefined>(undefined);
  const restoreTrigger = useRef<HTMLElement | undefined>(undefined);
  const notify = catalog.notify;
  const selectedTag = target?.tag;
  const newTag = useRef<HTMLButtonElement>(null);
  const unavailable =
    selectedTag !== undefined &&
    catalog.loaded &&
    !catalog.pending &&
    catalog.readError === undefined &&
    !catalog.tags.some((tag) => tag.id === selectedTag.id);

  useEffect(
    () => () => {
      currentTarget.current = undefined;
    },
    []
  );

  useEffect(() => {
    if (!unavailable) return;
    let canceled = false;

    void Promise.resolve().then(() => {
      if (canceled || currentTarget.current !== target) return;
      currentTarget.current = undefined;
      setTarget(undefined);
      notify('This tag is no longer available. The tag list has been updated.');
    });
    return () => {
      canceled = true;
    };
  }, [unavailable, target, notify]);

  const open = (next: Target) => {
    catalog.begin();
    restoreTrigger.current = next.trigger;
    currentTarget.current = next;
    setTarget(next);
  };

  const close = () => {
    currentTarget.current = undefined;
    setTarget(undefined);
  };

  const finish = (captured: Target, saved: boolean) => {
    if (saved && currentTarget.current === captured) close();
  };

  const restoreFocus = () => {
    const trigger = restoreTrigger.current;

    if (trigger?.isConnected === true && !trigger.matches(':disabled')) trigger.focus();
    else if (newTag.current?.isConnected === true && !newTag.current.disabled)
      newTag.current.focus();
    else document.querySelector<HTMLElement>('.settings-navigation [data-state="active"]')?.focus();
  };

  const dialog = { pending: catalog.pending, error: catalog.error, close, restoreFocus };
  const disabled = catalog.pending || catalog.blocked || !catalog.loaded;

  return (
    <div className="tag-management">
      <div className="tag-management-toolbar">
        <p>Rename or recolor tags across your library.</p>
        <Button
          ref={newTag}
          disabled={disabled}
          onClick={(event) => {
            open({ action: 'create', trigger: event.currentTarget });
          }}
        >
          New tag
        </Button>
      </div>
      {catalog.message !== undefined && <p role="status">{catalog.message}</p>}
      {catalog.error !== undefined && target === undefined && (
        <p className="settings-row-error" role="alert">
          {catalog.error}
        </p>
      )}
      {(catalog.readError !== undefined || catalog.blocked) && (
        <div className="tag-management-notice">
          {catalog.readError !== undefined && (
            <p className="settings-row-error" role="alert">
              {catalog.readError}
            </p>
          )}
          <Button
            variant="outline"
            disabled={catalog.pending}
            onClick={() => {
              void catalog.refresh();
            }}
          >
            Refresh tags
          </Button>
        </div>
      )}
      {!catalog.loaded && catalog.readError === undefined && <p role="status">Loading tags…</p>}
      {catalog.loaded && catalog.tags.length === 0 && (
        <p>No tags yet. Create a tag to organize your snippets.</p>
      )}
      {catalog.tags.length > 0 && (
        <table className="tag-management-table">
          <caption className="sr-only">Library tags and snippet counts</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Snippets</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {catalog.tags.map((tag) => (
              <TagManagementRow
                key={tag.id}
                tag={tag}
                disabled={disabled}
                open={(action, trigger) => {
                  open({ action, tag, trigger });
                }}
              />
            ))}
          </tbody>
        </table>
      )}
      {target !== undefined && (target.action === 'create' || target.action === 'edit') && (
        <TagEditorDialog
          {...dialog}
          tag={target.tag}
          initialColor={tagColors[catalog.tags.length % tagColors.length] ?? 'blue'}
          save={async (name, color) => {
            const saved = await catalog.run(
              () =>
                target.tag === undefined
                  ? window.promptly.createTag({ name, color })
                  : window.promptly.updateTag({ id: target.tag.id, name, color }),
              'Tag saved.',
              'That name is already in use. Choose another name.'
            );

            finish(target, saved);
          }}
        />
      )}
      {target?.action === 'delete' && (
        <TagDeleteDialog
          {...dialog}
          tag={target.tag}
          remove={async () => {
            const saved = await catalog.run(
              () => window.promptly.deleteTag({ id: target.tag.id }),
              'Tag deleted. Snippets were kept.'
            );

            finish(target, saved);
          }}
        />
      )}
    </div>
  );
}
