import { expect, it } from 'vitest';

import { DoubleTap } from './double-tap';

it('accepts completed physical taps and cancels typing or a held modifier', () => {
  let captures = 0;
  const taps = new DoubleTap('shift', 300, () => {
    captures += 1;
  });
  const press = (mask: number, timeMs: number) => {
    taps.accept({ kind: 'modifiers', mask, repeat: false, timeMs });
  };

  press(1, 0);
  press(0, 20);
  press(2, 100);
  expect(captures).toBe(0);
  press(0, 120);
  expect(captures).toBe(1);
  press(1, 200);
  press(0, 220);
  taps.accept({ kind: 'cancel', timeMs: 230 });
  press(1, 260);
  press(0, 280);
  expect(captures).toBe(1);
  press(1, 600);
  press(0, 901);
  press(1, 950);
  press(0, 970);
  expect(captures).toBe(1);
});
