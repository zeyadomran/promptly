import { spawn } from 'node:child_process';

import { startMacosFixture } from './fixture-macos.mjs';
import { startPipeFixture } from './fixture-pipe.mjs';

/** Optional arguments allow owned subprocess regressions through this same lifecycle. */
export function startFixture(executable, mode, args = ['--fixture', mode]) {
  if (process.platform === 'darwin' && args[0] === '--fixture')
    return startMacosFixture(executable, mode);
  const child = spawn(executable, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  return startPipeFixture(child, mode);
}
