import { CornerUpLeftIcon } from 'lucide-react';

import { Button } from '../../components/ui/button';

export function LibraryReturnAction({
  label,
  disabled,
  copy
}: {
  label: string | undefined;
  disabled: boolean;
  copy: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className="library-return-action"
      aria-label="Copy and return"
      disabled={disabled || label === undefined}
      title={
        label === undefined
          ? 'No previous app to return to.'
          : `Copy, then switch back to ${label}. Paste it yourself.`
      }
      onClick={(event) => {
        event.stopPropagation();
        copy();
      }}
    >
      <CornerUpLeftIcon aria-hidden="true" />
    </Button>
  );
}
