const mode = process.argv[2];

if (mode === 'silent') {
  for (const stage of ['mainEntered', 'uiInitialized'])
    process.stderr.write(
      `${JSON.stringify({ kind: 'owned-fixture-stage', stage, elapsedMs: 1 })}\n`
    );
}

process.on('SIGTERM', () => {
  if (mode === 'resist') return;
  if (mode === 'delayedClose') setTimeout(() => process.exit(0), 150);
  else process.exit(0);
});

if (mode === 'exit') {
  process.stderr.write('owned private fixture output');
  process.exit(42);
}

if (mode === 'malformed') process.stdout.write('private invalid metadata\n');
else if (mode === 'wrongPid') process.stdout.write('{"fixturePid":1}\n');
else if (mode === 'oversized') process.stdout.write('x'.repeat(4097));
else if (mode !== 'silent')
  process.stdout.write(`${JSON.stringify({ fixturePid: process.pid })}\n`);

setInterval(() => {}, 1000);
