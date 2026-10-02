import type { Tag } from '../../shared/contracts/domain';

export type TagColor = Tag['color'];

export const tagColors = [
  'blue',
  'green',
  'red',
  'purple',
  'amber',
  'teal',
  'pink',
  'lime'
] as const satisfies readonly TagColor[];

export const tagColorClasses: Record<TagColor, string> = {
  blue: 'bg-[var(--tag-blue)]',
  green: 'bg-[var(--tag-green)]',
  red: 'bg-[var(--tag-red)]',
  purple: 'bg-[var(--tag-purple)]',
  amber: 'bg-[var(--tag-amber)]',
  teal: 'bg-[var(--tag-teal)]',
  pink: 'bg-[var(--tag-pink)]',
  lime: 'bg-[var(--tag-lime)]'
};
