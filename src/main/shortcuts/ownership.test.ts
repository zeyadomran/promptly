import { expect, it, vi } from 'vitest';

import { Accelerators } from './accelerators';
import type { Binding } from './bindings';

const binding = (number: number): Binding => ({
  key: `control+f${String(number)}`,
  accelerator: `Control+F${String(number)}`,
  action: 'open'
});

it.each(['throw', 'readback'] as const)(
  'retains failed %s rollback removals for a later close',
  (failure) => {
    const actual = new Set<string>();
    const callbacks: (() => void)[] = [];
    let blocked = true;
    const unregister = vi.fn((accelerator: string) => {
      if (blocked && accelerator === 'Control+F3') {
        if (failure === 'throw') throw new Error('Owned removal denied');
        return;
      }

      actual.delete(accelerator);
    });
    const dispatch = vi.fn();
    const accelerators = new Accelerators(
      {
        register: (accelerator, callback) => {
          if (accelerator === 'Control+F5') return false;
          actual.add(accelerator);
          callbacks.push(callback);
          return true;
        },
        unregister,
        isRegistered: (accelerator) => actual.has(accelerator),
        setSuspended: vi.fn()
      },
      dispatch
    );

    accelerators.replace([binding(1), binding(2)]);
    expect(() => {
      accelerators.replace([binding(3), binding(4), binding(5)]);
    }).toThrow(AggregateError);
    expect(unregister.mock.calls.map(([accelerator]) => accelerator)).toEqual([
      'Control+F3',
      'Control+F4'
    ]);
    expect(actual).toEqual(new Set(['Control+F1', 'Control+F2', 'Control+F3']));
    for (const callback of callbacks) callback();
    expect(dispatch).not.toHaveBeenCalled();
    expect(() => {
      accelerators.close();
    }).toThrow(AggregateError);
    expect(actual).toEqual(new Set(['Control+F3']));
    blocked = false;
    accelerators.close();
    expect(actual.size).toBe(0);
    expect(unregister.mock.calls.at(-1)).toEqual(['Control+F3']);
  }
);
