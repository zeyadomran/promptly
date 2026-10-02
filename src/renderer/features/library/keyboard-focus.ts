import type { LibraryFocus } from './library-keyboard';

/** Inspect the composed path so nested/shadow editors retain their native keys. */
export function keyboardFocus(event: KeyboardEvent): LibraryFocus {
  const path = event.composedPath().filter((item): item is HTMLElement => item instanceof HTMLElement);

  if (path.some((element) => element.matches('[role="dialog"], [role="alertdialog"], [role="menu"], [data-promptly-overlay]')))
    return 'overlay';
  if (document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"]') !== null)
    return 'overlay';
  if (path.some((element) => element.matches('[data-promptly-search]'))) return 'search';
  if (path.some((element) => element.isContentEditable || element.matches('input, textarea, select, [role="textbox"], [role="combobox"]')))
    return 'editor';
  if (path.some((element) => element.matches('button, a, [role="button"], [role="checkbox"], [role="switch"], [role="radio"]')))
    return 'control';
  return 'library';
}
