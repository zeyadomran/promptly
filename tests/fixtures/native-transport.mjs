import readline from 'node:readline';

const mode = process.argv[2];
const lines = readline.createInterface({ input: process.stdin });

if (mode === 'block-eof') setInterval(() => {}, 1000);

lines.on('line', (line) => {
  const request = JSON.parse(line);
  const response = { v: 1, id: request.id, status: 'ok' };

  if (mode === 'hang') return;
  if (mode === 'crash') process.exit(2);
  if (mode === 'partial') {
    process.stdout.write('{"v":1');
    process.exit(0);
  }

  if (mode === 'invalid') response.status = 'unexpected';
  if (mode === 'old') process.stdout.write(JSON.stringify({ ...response, id: 'retired' }) + '\n');
  if (mode === 'oversized') {
    process.stdout.write(' '.repeat(6_356_993));
    return;
  }

  process.stdout.write(JSON.stringify(response) + '\n');
});
lines.on('close', () => {
  if (mode !== 'block-eof') process.exit(0);
});
