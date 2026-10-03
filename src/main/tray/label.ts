export function trayLabel(text: string): string {
  const plain = Array.from(text, (unit) =>
    unit.charCodeAt(0) < 32 || unit.charCodeAt(0) === 127 ? ' ' : unit
  ).join('');
  const units = Array.from(plain.replace(/\s+/g, ' ').trim());

  return (units.slice(0, 50).join('') + (units.length > 50 ? '…' : '')).replaceAll('&', '&&');
}
