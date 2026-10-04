import { type TagColor, tagColorHex, tagColors, tagColorStyle } from '../../../lib/tag-palette';
import { TagCustomColorPopover } from './TagCustomColorPopover';

export function TagColorPicker({
  color,
  disabled,
  change
}: {
  color: TagColor;
  disabled: boolean;
  change: (color: TagColor) => void;
}) {
  const hex = tagColorHex(color);

  return (
    <div className="tag-management-color-controls">
      <div className="tag-management-colors" role="group" aria-label="Preset tag colors">
        {tagColors.map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabled}
            className="tag-management-swatch"
            style={tagColorStyle(item)}
            aria-label={item}
            aria-pressed={tagColorHex(item) === hex}
            onClick={() => {
              change(item);
            }}
          />
        ))}
      </div>
      <TagCustomColorPopover color={color} disabled={disabled} change={change} />
    </div>
  );
}
