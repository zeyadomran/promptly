import { type TagColor, tagColorClasses } from '../../lib/tag-palette';
import { cn } from '../../lib/utils';

interface TagDotProps {
  color: TagColor;
  label?: string;
  size?: 'chip' | 'row';
}

/** Color is decoration; callers always render the tag's name alongside it. */
export function TagDot({ color, label, size = 'chip' }: TagDotProps) {
  return (
    <span
      className={cn(
        'inline-block shrink-0 rounded-[2px]',
        tagColorClasses[color],
        size === 'chip' ? 'size-1.5' : 'size-[7px]'
      )}
      aria-hidden={label === undefined ? true : undefined}
      role={label === undefined ? undefined : 'img'}
      aria-label={label}
    />
  );
}
