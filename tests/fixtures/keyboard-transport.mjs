import { createInterface } from 'node:readline';

const started = performance.now();
let lastTime = 0;
const write = (frame) => process.stdout.write(`${JSON.stringify(frame)}\n`);

if (!process.argv.includes('--silent'))
  write({ kind: 'ready', installed: true, mask: 0, timeMs: 0 });

const input = createInterface({ input: process.stdin });

input.on('line', (line) => {
  const frames = JSON.parse(line);
  const timeMs = Math.max(performance.now() - started, lastTime + 1);

  for (const [index, frame] of frames.entries()) write({ ...frame, timeMs: timeMs + index });
  lastTime = timeMs + frames.length;
});
input.on('close', () => process.exit(0));
