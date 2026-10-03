import { acceleratorKey } from './accelerator';

/** Shift alone still produces text in other apps; global bindings must not consume it. */
export function globalBindingAllowed(accelerator: string): boolean {
  const key = acceleratorKey(accelerator, 'win32');

  if (!key.startsWith('shift+')) return true;
  const parts = key.split('+');

  if (parts.length !== 2) return true;
  const printable = parts[1] ?? '';

  return !(
    printable.length === 1 ||
    printable === 'space' ||
    printable === 'plus' ||
    /^num(?:[0-9]|dec|add|sub|mult|div)$/.test(printable)
  );
}
