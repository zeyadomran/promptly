const mode = process.argv[2];
const emit = (frame) => {
  process.stdout.write(JSON.stringify(frame) + '\n');
};

if (mode === 'malformed') emit({ kind: 'ready', installed: true, mask: 0, timeMs: 0, keyCode: 65 });
else if (mode === 'oversized') process.stdout.write('x'.repeat(2048));
else if (mode !== 'timeout') {
  emit({
    kind: 'ready',
    installed: mode !== 'denied',
    mask: 0,
    timeMs: 0,
    accessibility: false,
    inputMonitoring: mode !== 'denied'
  });
  if (mode === 'reset')
    setTimeout(() => {
      emit({ kind: 'reset', timeMs: 20 });
    }, 20);
}

process.stdin.resume();
process.stdin.on('end', () => {
  process.exit(0);
});
