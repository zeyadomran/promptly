import assert from 'node:assert/strict';

import { DoubleTap } from './double-tap';

export function completedTapFlow(): void {
  let captures = 0;
  const observed: { tap: number; elapsedMs: number | undefined }[] = [];
  const taps = new DoubleTap(
    'shift',
    300,
    () => {
      captures += 1;
    },
    (tapNumber, elapsedMs) => {
      observed.push({ tap: tapNumber, elapsedMs });
    }
  );
  const press = (mask: number, timeMs: number) => {
    taps.accept({ kind: 'modifiers', mask, repeat: false, timeMs });
  };

  press(1, 0);
  press(0, 20);
  assert.deepEqual(observed, [{ tap: 1, elapsedMs: undefined }]);
  press(2, 100);
  assert.equal(captures, 0);
  press(0, 120);
  assert.equal(captures, 1);
  assert.deepEqual(observed.at(-1), { tap: 2, elapsedMs: 100 });
  press(1, 200);
  press(0, 220);
  taps.accept({ kind: 'cancel', timeMs: 230 });
  press(1, 260);
  press(0, 280);
  assert.equal(captures, 1);
  press(1, 600);
  press(0, 901);
  press(1, 950);
  press(0, 970);
  assert.equal(captures, 1);
}
