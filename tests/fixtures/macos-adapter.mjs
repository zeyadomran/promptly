import readline from 'node:readline';

const mode = process.argv[2];
const lines = readline.createInterface({ input: process.stdin });
const source = { pid: 42, name: 'Owned Fixture', id: 'dev.promptly.fixture' };
let permissionsCalls = 0;

lines.on('line', (line) => {
  const request = JSON.parse(line);
  const reply = { v: 1, id: request.id, status: 'ok' };

  switch (request.command) {
    case 'capabilities':
      Object.assign(reply, {
        platform: 'darwin',
        selection: 'AXSelectedText',
        warmupReady: true,
        warmupMs: 1,
        startupMs: 1
      });
      break;
    case 'foreground':
      Object.assign(reply, { identity: 'a'.repeat(32), source });
      break;
    case 'permissions':
      Object.assign(reply, {
        accessibility: permissionsCalls++ === 0 ? 'granted' : 'denied',
        inputMonitoring: 'denied',
        inputMonitoringRequiredFor: 'passiveKeyboardHook',
        selectionRequires: 'accessibility'
      });
      break;
    case 'capture':
      if (mode === 'denied' || permissionsCalls > 1) reply.status = 'permissionDenied';
      else
        Object.assign(reply, {
          identity: 'a'.repeat(32),
          source,
          text: ' 雪🙂\n\u0000 ',
          characterCount: 7,
          elapsedMs: 1
        });
      break;
    case 'activate':
      if (request.identity !== 'a'.repeat(32)) reply.status = 'foregroundChanged';
      break;
  }

  process.stdout.write(JSON.stringify(reply) + '\n');
});
