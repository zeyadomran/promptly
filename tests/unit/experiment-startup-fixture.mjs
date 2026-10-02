import { createInterface } from 'node:readline';

const [delay = '0', mode = 'reply'] = process.argv.slice(2);
const requests = [];
let started = false;

function reply(request) {
  if (mode === 'hang' && request.command !== 'capabilities') return;
  process.stdout.write(`${JSON.stringify({ v: 1, id: request.id, status: 'ok' })}\n`);
  if (request.command === 'stop') process.exit(0);
}

createInterface({ input: process.stdin }).on('line', (line) => {
  const request = JSON.parse(line);

  if (started) reply(request);
  else requests.push(request);
});
setTimeout(() => {
  started = true;
  for (const request of requests) reply(request);
}, Number(delay));
