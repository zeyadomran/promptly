import { ToggleGroup, ToggleGroupItem } from '../../../components/ui/toggle-group';
import { type TagColor, tagColorClasses, tagColors } from '../../../lib/tag-palette';

export function TagColorPicker({
  color,
  disabled,
  change
}: {
  color: TagColor;
  disabled: boolean;
  change: (color: TagColor) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={color}
      disabled={disabled}
      aria-label="Tag color"
      className="tag-management-colors"
      onValueChange={(value) => {
        const chosen = tagColors.find((item) => item === value);

        if (chosen !== undefined) change(chosen);
      }}
    >
      {tagColors.map((item) => (
        <ToggleGroupItem key={item} value={item} aria-label={item} title={item}>
          <span className={`tag-management-swatch ${tagColorClasses[item]}`} aria-hidden="true" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
