import { copyFile, cp, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { _electron as electron, type ElectronApplication } from '@playwright/test';

import { assertProfileIdentity } from '../profile-identity';
import type { buildSessionSidecar } from './build-session-sidecar';
import { isHostedMacosProbe } from './carbon-hosted';
import { sessionDeadline } from './session-deadline';
import { sessionLifetime } from './session-lifecycle';
import { retireSession } from './session-retirement';

/** A copied package runs only this fixture main: no window, shortcuts or production services. */
export async function launchSessionSidecar(
  built: Awaited<ReturnType<typeof buildSessionSidecar>>,
  observeCleanup: (stage: 'child' | 'launcher', status: 'verified' | 'failed') => void = () =>
    undefined
) {
  if (!isHostedMacosProbe(process.platform, process.env))
    throw new Error('Session launcher requires GitHub-hosted macOS');
  const directory = await realpath(
    await mkdtemp(path.join(tmpdir(), 'promptly-session-launcher-'))
  );
  const bundle = path.join(directory, 'Promptly.app');
  const resources = path.join(bundle, 'Contents/Resources');
  const main = path.join(resources, 'app');
  const profile = path.join(directory, 'profile');
  let application: ElectronApplication | undefined;
  let lifetime: ReturnType<typeof sessionLifetime> | undefined;
  let closing: Promise<object> | undefined;
  let launchStarted = false;

  async function close() {
    closing ??= (async () => {
      if (application === undefined || lifetime === undefined)
        throw new Error('Owned Electron launcher exit cannot be verified');
      const ownedApplication = application;
      const ownedLifetime = lifetime;
      const result = await retireSession(
        () => ownedApplication.evaluate(async () => (await globalThis.ownedSessionSidecar).close()),
        () => ownedLifetime.close(() => ownedApplication.close()),
        observeCleanup
      );

      await rm(directory, { recursive: true, force: true });
      return result;
    })();
    return closing;
  }

  try {
    await cp(path.resolve(`out/Promptly-darwin-${process.arch}/Promptly.app`), bundle, {
      recursive: true
    });
    // Only the fresh owned copy is modified; the normal distributable remains untouched.
    await rm(path.join(resources, 'app.asar'), { force: true });
    await mkdir(main, { recursive: true });
    await mkdir(profile);
    await copyFile(built.main, path.join(main, 'main.cjs'));
    await copyFile(built.executable, path.join(resources, 'session-sidecar'));
    await writeFile(path.join(main, 'package.json'), JSON.stringify({ main: 'main.cjs' }));
    const environment = Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] =>
          entry[1] !== undefined && entry[0] !== 'ELECTRON_RUN_AS_NODE'
      )
    );

    launchStarted = true;
    application = await electron.launch({
      executablePath: path.join(bundle, 'Contents/MacOS/Promptly'),
      args: [`--user-data-dir=${profile}`],
      env: {
        ...environment,
        PROMPTLY_SESSION_PROFILE: await realpath(profile),
        PROMPTLY_SESSION_EXECUTABLE: await realpath(path.join(resources, 'session-sidecar'))
      },
      timeout: 10_000
    });
    lifetime = sessionLifetime(application.process());
    const ownedApplication = application;
    const actual = await sessionDeadline(
      application.evaluate(({ app }) => app.getPath('userData'))
    );

    await assertProfileIdentity(actual, profile);
    return {
      context: {
        parent: 'owned packaged Electron main',
        copiedBundle: true,
        differentBundlePathAndBootstrap: true,
        profileCanonicalMatch: true,
        identicalTccAttributionEstablished: false
      },
      ready: () =>
        sessionDeadline(
          ownedApplication.evaluate(async () => {
            return (await globalThis.ownedSessionSidecar).ready();
          })
        ),
      inspect: () =>
        sessionDeadline(
          ownedApplication.evaluate(async () => {
            return (await globalThis.ownedSessionSidecar).inspect();
          })
        ),
      final: () =>
        sessionDeadline(
          ownedApplication.evaluate(async () => {
            return (await globalThis.ownedSessionSidecar).final();
          })
        ),
      close
    };
  } catch (failure) {
    const errors: unknown[] = [failure];

    if (application !== undefined) await close().catch((error: unknown) => errors.push(error));
    else if (launchStarted) observeCleanup('launcher', 'failed');
    else await rm(directory, { recursive: true, force: true });
    throw new AggregateError(errors, 'Owned session launcher setup failed', { cause: failure });
  }
}
