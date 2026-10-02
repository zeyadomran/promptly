import { spawnSync } from 'node:child_process';

function run(command, env = process.env) {
  const result = spawnSync(command, { shell: true, stdio: 'inherit', env });

  if (result.status !== 0) throw new Error(`${command} failed (${result.status}).`);
}

try {
  run('npm run package', { ...process.env, PROMPTLY_DESIGN_FIXTURE: '1' });
  run('npx playwright test --config playwright.packaged-design.config.ts');
} finally {
  // Restore the normal distributable even if the fixture verification fails.
  const env = { ...process.env };

  delete env.PROMPTLY_DESIGN_FIXTURE;
  run('npm run package', env);
}
