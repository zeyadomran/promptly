import { useId, useState } from 'react';

import { customTagColorSchema } from '../../../../shared/contracts/domain';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { type TagColor, tagColorHex } from '../../../lib/tag-palette';

export function TagCustomColorEditor({
  color,
  change
}: {
  color: TagColor;
  change: (color: TagColor) => void;
}) {
  const [draft, setDraft] = useState(tagColorHex(color));
  const id = useId();
  const parsed = customTagColorSchema.safeParse(draft);
  const apply = () => {
    if (parsed.success) change(parsed.data);
  };

  return (
    <div className="tag-custom-color-editor">
      <Label htmlFor={id}>Custom hex color</Label>
      <Input
        id={id}
        value={draft}
        maxLength={7}
        spellCheck={false}
        autoComplete="off"
        aria-describedby={`${id}-hint`}
        aria-invalid={!parsed.success}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          if (!event.nativeEvent.isComposing) apply();
        }}
      />
      <p id={`${id}-hint`}>Use six hex digits, such as #12abef.</p>
      <Button type="button" size="sm" disabled={!parsed.success} onClick={apply}>
        Apply color
      </Button>
    </div>
  );
}
