import type { ComponentProps } from 'react';

import { ShortcutKey } from '../../components/shared/ShortcutKey';

const keyName =
  /^(?:Shift|Ctrl|Alt|Enter|Escape|Delete|Backspace|Tab|F1|[A-Z]|Ctrl\+[A-Z,]|Alt\+Space)$/;

export function WikiCode({ children, className }: ComponentProps<'code'>) {
  if (typeof children === 'string' && className === undefined && keyName.test(children))
    return <ShortcutKey>{children}</ShortcutKey>;
  return <code className={className}>{children}</code>;
}
