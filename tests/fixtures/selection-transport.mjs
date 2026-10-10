import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

const tokens = [];
const source = { pid: 1, name: 'Owned provider', id: 'owned-provider' };
const input = createInterface({ input: process.stdin });

input.on('line', (line) => {
  const request = JSON.parse(line);
  let result = { status: 'invalidRequest' };

  if (request.command === 'capabilities')
    result = {
      status: 'ok',
      platform: 'win32',
      selection: 'UIAutomation.TextPattern',
      warmupReady: true,
      warmupMs: 0,
      startupMs: 0,
      integrityLevel: 8192
    };
  else if (request.command === 'foreground') {
    const identity = randomBytes(16).toString('hex');

    tokens.push(identity);
    if (tokens.length > 32) tokens.shift();
    result = { status: 'ok', identity, source };
  } else if (request.command === 'activationTarget') {
    const identity = tokens.at(-1);

    result =
      identity === undefined ? { status: 'foregroundChanged' } : { status: 'ok', identity, source };
  } else if (request.command === 'validate' || request.command === 'activate')
    result = { status: tokens.includes(request.identity) ? 'ok' : 'foregroundChanged' };
  process.stdout.write(`${JSON.stringify({ ...result, v: 1, id: request.id })}\n`);
});
input.on('close', () => process.exit(0));
