import { useId } from 'react';

import { customTagColorSchema } from '../../../../shared/contracts/domain';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '../../../components/ui/toggle-group';
import { type TagColor, tagColorHex, tagColors, tagColorStyle } from '../../../lib/tag-palette';

export function TagColorPicker({
  color,
  draft,
  disabled,
  change,
  changeDraft
}: {
  color: TagColor;
  draft: string;
  disabled: boolean;
  change: (color: TagColor) => void;
  changeDraft: (draft: string) => void;
}) {
  const pickerId = useId();
  const hexId = useId();
  const errorId = useId();
  const valid = customTagColorSchema.safeParse(draft).success;

  return (
    <div className="tag-management-field">
      <ToggleGroup
        type="single"
        value={color}
        disabled={disabled}
        aria-label="Preset tag colors"
        className="tag-management-colors"
        onValueChange={(value) => {
          const chosen = tagColors.find((item) => item === value);

          if (chosen !== undefined) change(chosen);
        }}
      >
        {tagColors.map((item) => (
          <ToggleGroupItem key={item} value={item} aria-label={item} title={item}>
            <span
              className="tag-management-swatch"
              style={tagColorStyle(item)}
              aria-hidden="true"
            />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="tag-management-custom-color">
        <div className="tag-management-field">
          <Label htmlFor={pickerId}>Color picker</Label>
          <input
            id={pickerId}
            type="color"
            value={tagColorHex(color)}
            disabled={disabled}
            className="tag-management-color-input"
            onChange={(event) => {
              change(event.target.value);
            }}
          />
        </div>
        <div className="tag-management-field">
          <Label htmlFor={hexId}>Hex color</Label>
          <Input
            id={hexId}
            value={draft}
            disabled={disabled}
            maxLength={32}
            spellCheck={false}
            autoComplete="off"
            placeholder="#12abef"
            aria-invalid={!valid}
            aria-describedby={valid ? undefined : errorId}
            onChange={(event) => {
              changeDraft(event.target.value);
            }}
          />
        </div>
      </div>
      {!valid && (
        <p id={errorId} className="settings-row-error" role="alert">
          Enter # followed by six hex digits (0–9, A–F).
        </p>
      )}
    </div>
  );
}
