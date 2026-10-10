import { ArrowDownIcon, ArrowUpIcon, XIcon } from 'lucide-react';

import { Button } from '../../components/ui/button';
import type { BundleEntry } from './bundle-state';

export function BundleOrderList({
  entries,
  pending,
  move,
  remove
}: {
  entries: BundleEntry[];
  pending: boolean;
  move: (id: string, delta: -1 | 1) => void;
  remove: (id: string) => void;
}) {
  return (
    <ol className="bundle-order" aria-label="Bundle order">
      {entries.map((entry, index) => (
        <li
          key={entry.id}
          className="bundle-order-item"
          onKeyDown={(event) => {
            if (
              pending ||
              !event.altKey ||
              event.ctrlKey ||
              event.metaKey ||
              event.nativeEvent.isComposing ||
              !['ArrowUp', 'ArrowDown'].includes(event.key)
            )
              return;
            event.preventDefault();
            event.stopPropagation();
            move(entry.id, event.key === 'ArrowUp' ? -1 : 1);
          }}
        >
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
