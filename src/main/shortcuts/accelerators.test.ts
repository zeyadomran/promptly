import { expect, it, vi } from 'vitest';

import { Accelerators } from './accelerators';

it('attempts every owned unregister when one cleanup fails and preserves the error', () => {
  const registered = new Set<string>();
  const unregister = vi.fn((accelerator: string) => {
    if (accelerator === 'Control+F10') throw new Error('Owned unregister failure');
    registered.delete(accelerator);
  });
  const dispatch = vi.fn();
  const callbacks: (() => void)[] = [];
  const accelerators = new Accelerators(
    {
      register: (accelerator, callback) => {
        registered.add(accelerator);
        callbacks.push(callback);
        return true;
      },
      unregister,
      isRegistered: (accelerator) => registered.has(accelerator),
      setSuspended: vi.fn()
    },
    dispatch
  );

  accelerators.replace([
    { accelerator: 'Control+F10', key: 'control+f10', action: 'open' },
    { accelerator: 'Control+F11', key: 'control+f11', action: 'pin' }
  ]);
  expect(() => {
    accelerators.close();
  }).toThrow(AggregateError);
  expect(unregister).toHaveBeenCalledTimes(2);
  expect(registered.has('Control+F11')).toBe(false);
  for (const callback of callbacks) callback();
  expect(dispatch).not.toHaveBeenCalled();
});
