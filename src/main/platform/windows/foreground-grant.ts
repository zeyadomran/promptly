import { createRequire } from 'node:module';

import type { load } from 'koffi';

interface ForegroundModule {
  load: typeof load;
}

function isForegroundModule(value: unknown): value is ForegroundModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    'load' in value &&
    typeof value.load === 'function'
  );
}

/** Bind once during main startup, outside the bounded activation request. */
export function createForegroundGrant(): (pid: number) => boolean {
  if (process.platform !== 'win32') return () => false;
  try {
    // The main bundle is CommonJS. Optional addon loading belongs inside this startup guard.
    const nativeModule: unknown = createRequire(__filename)('koffi');

    if (!isForegroundModule(nativeModule)) return () => false;
    const library = nativeModule.load('user32.dll');
    const grant: (pid: number) => unknown = library.func(
      '__stdcall',
      'AllowSetForegroundWindow',
      'int',
      ['uint32_t']
    );

    return (pid) => {
      // Never admit ASFW_ANY or a renderer-supplied process identifier.
      if (!Number.isInteger(pid) || pid <= 0 || pid >= 0xffffffff) return false;
      try {
        const result = grant(pid);

        return typeof result === 'number' && result !== 0;
      } catch {
        return false;
      }
    };
  } catch {
    return () => false;
  }
}
