import { useRef, useState } from 'react';

import { Button } from '../../components/ui/button';
import { Field, FieldLabel } from '../../components/ui/field';
import { Input } from '../../components/ui/input';
import type { DrawingSession } from './drawing-session';

export function DrawingTextField({
  session,
  focusCanvas
}: {
  session: DrawingSession;
  focusCanvas: () => void;
}) {
  const [text, setText] = useState(''),
    input = useRef<HTMLInputElement>(null);
  const commit = () => {
    if (session.commands.commitText(text)) focusCanvas();
  };

  const cancel = () => {
    session.commands.cancelText();
    focusCanvas();
  };

  return (
    <form
      className="drawing-text-field"
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      <Field>
        <FieldLabel htmlFor="drawing-text">Text</FieldLabel>
        <Input
          id="drawing-text"
          ref={input}
          autoFocus
          maxLength={10_000}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          placeholder="Type a label"
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Escape') {
              event.preventDefault();
              cancel();
            }
          }}
        />
      </Field>
      <Button type="button" variant="ghost" size="sm" onClick={cancel}>
        Cancel text
      </Button>
      <Button type="submit" size="sm" disabled={text.trim() === ''}>
        Add text
      </Button>
    </form>
  );
}
