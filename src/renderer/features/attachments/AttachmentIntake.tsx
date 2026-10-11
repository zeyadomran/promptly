import { ClipboardPaste, Paperclip, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '../../components/ui/button';

export function AttachmentIntake({
  disabled,
  compact,
  count,
  drawingRefusal,
  onChoose,
  onPaste,
  onDraw,
  start,
  end
}: {
  disabled: boolean;
  compact: boolean;
  count: number;
  drawingRefusal: string | undefined;
  onChoose: () => void;
  onPaste: () => void;
  onDraw: (() => void) | undefined;
  start: ReactNode;
  end: ReactNode;
}) {
  const limit = `${String(count)} of 8 attachments · 10 MB each`;

  return (
    <div className="attachment-intake" data-compact={compact}>
      {start}
      <Button
        variant="outline"
        size={compact ? 'icon-sm' : 'sm'}
        disabled={disabled}
        aria-label={compact ? 'Add files' : undefined}
        title={`Add files (${limit})`}
        onClick={onChoose}
      >
        <Paperclip aria-hidden="true" />
        {!compact && 'Add files'}
      </Button>
      <Button
        variant="ghost"
        size={compact ? 'icon-sm' : 'sm'}
        disabled={disabled}
        aria-label={compact ? 'Paste attachment' : undefined}
        title="Paste attachment (Ctrl+Shift+V)"
        data-paste-attachment
        onClick={onPaste}
      >
        <ClipboardPaste aria-hidden="true" />
        {!compact && 'Paste attachment'}
      </Button>
      <Button
        variant="ghost"
        size={compact ? 'icon-sm' : 'sm'}
        disabled={disabled || onDraw === undefined || drawingRefusal !== undefined}
        aria-label={compact ? 'Draw' : undefined}
        title={drawingRefusal ?? 'Draw'}
        onClick={onDraw}
      >
        <Pencil aria-hidden="true" />
        {!compact && 'Draw'}
      </Button>
      {end}
      <span className={compact ? 'sr-only' : 'attachment-limit'}>{limit}</span>
    </div>
  );
}
