import readline from 'node:readline';

// Owned provider deliberately never answers; stdin keeps it alive until retirement.
const lines = readline.createInterface({ input: process.stdin });

lines.on('line', () => {});
lines.on('close', () => process.exit(0));
