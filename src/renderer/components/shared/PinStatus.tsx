import { cn } from '../../lib/utils';

interface PinStatusProps {
  pinned: boolean;
}

export function PinStatus({ pinned }: PinStatusProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-meta text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', pinned ? 'bg-success' : 'bg-border')}
      />
      {pinned ? 'Always on top' : 'Not pinned'}
    </span>
  );
}
