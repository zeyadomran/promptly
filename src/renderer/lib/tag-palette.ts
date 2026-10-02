export const tagColors = [
  'blue',
  'green',
  'red',
  'purple',
  'amber',
  'teal',
  'pink',
  'lime'
] as const;
export type TagColor = (typeof tagColors)[number];

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
