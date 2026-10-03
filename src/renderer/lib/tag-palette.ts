import type { Tag } from '../../shared/contracts/domain';
import { tagPresetColors } from '../../shared/contracts/tag-colors';

export type TagColor = Tag['color'];

export const tagColors = tagPresetColors;

// sRGB equivalents of the original preset palette; named backup values remain valid.
const presetHex: Record<(typeof tagColors)[number], string> = {
  blue: '#5591dd',
  green: '#4ca563',
  red: '#d36c66',
  purple: '#9c7bd2',
  amber: '#c87a30',
  teal: '#00a6ae',
  pink: '#c36da8',
  lime: '#a29015'
};

export function tagColorHex(color: TagColor) {
  const preset = tagColors.find((item) => item === color);

  return preset === undefined ? color : presetHex[preset];
}

export function tagColorStyle(color: TagColor) {
  return { backgroundColor: tagColorHex(color) };
}
