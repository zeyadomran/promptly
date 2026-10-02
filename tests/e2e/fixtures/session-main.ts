import { app } from 'electron';

import { isHostedMacosProbe } from '../carbon-hosted';
import { createSessionOwner } from '../session-owner';

const profile = process.env['PROMPTLY_SESSION_PROFILE'];
const executable = process.env['PROMPTLY_SESSION_EXECUTABLE'];

if (
  !isHostedMacosProbe(process.platform, process.env) ||
  profile === undefined ||
  executable === undefined
)
  throw new Error('Owned hosted session bootstrap required');
app.setPath('userData', profile);
let controller: Awaited<ReturnType<typeof createSessionOwner>> | undefined;
let exiting = false;

declare global {
  var ownedSessionSidecar: Promise<Awaited<ReturnType<typeof createSessionOwner>>>;
}

globalThis.ownedSessionSidecar = app.whenReady().then(async () => {
  controller = await createSessionOwner(executable);
  return controller;
});
// Observe rejection immediately while retaining the same promise for the test's bounded await.
void globalThis.ownedSessionSidecar.catch(() => undefined);
app.on('before-quit', (event) => {
  if (exiting) return;
  event.preventDefault();
  exiting = true;
  void globalThis.ownedSessionSidecar
    .then((owner) => owner.close())
    .then(
      () => {
        app.exit(0);
      },
      () => {
        app.exit(1);
      }
    );
});
