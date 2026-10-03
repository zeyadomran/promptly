import { useId } from 'react';

import { type TagColor, tagColorHex, tagColors, tagColorStyle } from '../../../lib/tag-palette';

export function TagColorPicker({
  color,
  disabled,
  change
}: {
  color: TagColor;
  disabled: boolean;
  change: (color: TagColor) => void;
}) {
  const pickerId = useId();
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
      <label className="tag-management-hex-chip" htmlFor={pickerId} data-disabled={disabled}>
        <span className="library-tag-dot" style={tagColorStyle(color)} aria-hidden="true" />
        <span>{hex}</span>
        <input
          id={pickerId}
          type="color"
          aria-label="Choose custom tag color"
          value={hex}
          disabled={disabled}
          onChange={(event) => {
            change(event.target.value);
          }}
        />
      </label>
    </div>
  );
}
