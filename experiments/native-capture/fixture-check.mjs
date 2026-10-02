import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';

export async function checkWindowsFixtures(executable, helper) {
  const evidence = [];

  for (const [mode, expected] of [
    ['selected', 'ok'],
    ['empty', 'empty'],
    ['password', 'secureInput']
  ]) {
    const fixture = spawn(executable, ['--fixture', mode], {
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true
    });
    const lines = createInterface({ input: fixture.stdout });
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 5000);

    try {
      const [line] = await once(lines, 'line', { signal: abort.signal });
      const { fixturePid } = JSON.parse(line);
      const elapsed = [];

      for (let sample = 0; sample < 10; sample++) {
        const result = await helper.request('capture', {
          expectedPid: fixturePid,
          includeText: true
        });

        assert.equal(result.status, expected, `Controlled ${mode} fixture`);
        assert.equal(result.source?.pid, fixturePid);

        if (expected === 'ok') assert.equal(result.text.trim(), 'Promptly fixture selection');
        else assert.equal(result.text, undefined);
        elapsed.push(result.elapsedMs);
      }

      evidence.push({
        fixture: mode,
        status: expected,
        samples: 10,
        maxNativeMs: Math.max(...elapsed)
      });
    } finally {
      clearTimeout(timer);
      lines.close();
      fixture.kill();
    }
  }

  return evidence;
}
