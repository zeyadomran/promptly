import { describe, expect, it } from 'vitest';

import { acceleratorSchema } from './accelerator';

describe('accelerator syntax', () => {
  it.each([
    'Alt+Space',
    'Option+Space',
    'CmdOrCtrl+Shift+S',
    'Control+Plus',
    'Meta+F24',
    'Shift+/',
    'Control+num1'
  ])('accepts %s without claiming registration', (value) => {
    expect(acceleratorSchema.safeParse(value).success).toBe(true);
  });
  it.each([
    'invalid',
    'Shift',
    'Control+',
    'Control+Ctrl+A',
    'Control+F25',
    'Control+Space+X',
    'Control+garbage',
    'Alt +Space'
  ])('rejects %s', (value) => {
    expect(acceleratorSchema.safeParse(value).success).toBe(false);
  });
});
