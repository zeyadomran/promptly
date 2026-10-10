import { ArrowDownIcon, ArrowUpIcon, GripVerticalIcon, XIcon } from 'lucide-react';

import { shortcutLabel } from '../../../shared/shortcuts/accelerator';
import { Button } from '../../components/ui/button';
import { usePreferences } from '../settings/settings-context';
import { bundleMoveCommand } from './bundle-keyboard';
import type { BundleEntry } from './bundle-state';
import { useBundleReorder } from './use-bundle-reorder';

export function BundleOrderList({
  entries,
  pending,
  move,
  remove,
  reorder
}: {
  entries: BundleEntry[];
  pending: boolean;
  move: (id: string, delta: -1 | 1) => void;
  remove: (id: string) => void;
  reorder: (id: string, beforeId: string | undefined) => void;
}) {
  const drag = useBundleReorder(pending, reorder);
  const { settings } = usePreferences();
  const moveHints = (
    [
      ['up', settings.localShortcuts.moveUp],
      ['down', settings.localShortcuts.moveDown]
    ] as const
  )
    .flatMap(([direction, binding]) =>
      binding === null
        ? []
        : [`${shortcutLabel(binding, window.promptly.platform)} to move ${direction}`]
    )
    .join(' or ');

  return (
    <ol className="bundle-order" aria-label="Bundle order">
      {entries.map((entry, index) => (
        <li
          key={entry.id}
          className="bundle-order-item"
          data-bundle-order-id={entry.id}
          data-dragging={drag.draggedId === entry.id || undefined}
          onKeyDown={(event) => {
            const command = bundleMoveCommand(
              {
                key: event.key,
                code: event.code,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                altKey: event.altKey,
                shiftKey: event.shiftKey,
                repeat: event.repeat,
                isComposing: event.nativeEvent.isComposing,
                altGraph: event.getModifierState('AltGraph')
              },
              { pending, prevented: event.defaultPrevented },
              settings.localShortcuts
            );

            if (command === undefined) return;
            event.preventDefault();
            event.stopPropagation();
            move(entry.id, command);
          }}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="bundle-drag-handle"
            disabled={pending}
            aria-label={`Drag snippet ${String(index + 1)} to reorder${moveHints === '' ? '' : `, or use ${moveHints}`}`}
            onPointerDown={(event) => {
              drag.start(entry.id, event);
            }}
            onPointerMove={drag.move}
            onPointerUp={drag.finish}
            onPointerCancel={drag.finish}
            onLostPointerCapture={drag.finish}
          >
            <GripVerticalIcon />
          </Button>
          <span className="bundle-order-number">{index + 1}</span>
          <span className="bundle-order-label">
            {entry.label}
            {entry.missing ? (
              <span className="workflow-error">No longer in the library</span>
            ) : (
              entry.changed && <span className="workflow-note">Changed since you selected it</span>
            )}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending || index === 0}
            aria-label={`Move snippet ${String(index + 1)} up`}
            onClick={() => {
              move(entry.id, -1);
            }}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending || index === entries.length - 1}
            aria-label={`Move snippet ${String(index + 1)} down`}
            onClick={() => {
              move(entry.id, 1);
            }}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label={`Remove snippet ${String(index + 1)}`}
            onClick={() => {
              remove(entry.id);
            }}
          >
            <XIcon />
          </Button>
        </li>
      ))}
    </ol>
  );
}
