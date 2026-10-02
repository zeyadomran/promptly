import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { app } from 'electron';

import { hostedNativePreferences } from './settings-native-preferences';

const profile = process.env['PROMPTLY_SETTINGS_UI_PROFILE'];

if (profile === undefined) throw new Error('Owned native profile required.');
app.setPath('userData', profile);
const native = hostedNativePreferences(profile);

if (!native.enabled) throw new Error('Ephemeral native qualification required.');
const exit = app.exit.bind(app);
let restored = false;
let restoration: Promise<void> | undefined;
const phase = (stage: string) => {
  writeFileSync(path.join(profile, 'native-transfer-phase.json'), JSON.stringify({ stage }));
};

const restore = () => {
  restoration ??= native.restore().finally(() => {
    restored = true;
  });
  return restoration;
};

// Production's shared shutdown drain reaches will-quit only after settings/storage/native cleanup.
app.on('will-quit', (event) => {
  if (restored) return;
  event.preventDefault();
  phase('restoring');
  void restore().then(
    () => {
      app.quit();
    },
    () => {
      exit(1);
    }
  );
});
// Fatal production exit also follows its bounded drain; retain restoration before releasing the process.
app.exit = (code = 0) => {
  void restore().then(
    () => {
      exit(code);
    },
    () => {
      exit(1);
    }
  );
};

void app
  .whenReady()
  .then(() => {
    native.capture();
    writeFileSync(
      path.join(profile, 'native-transfer-initial.json'),
      JSON.stringify({
        hosted: true,
        initial: {
          login: app.getLoginItemSettings().openAtLogin,
          dock: process.platform === 'darwin' && (app.dock?.isVisible() ?? false)
        }
      })
    );
    phase('native-captured-before-product-initialize');
    createRequire(path.join(__dirname, 'main.cjs'))('./production-main.cjs');
    phase('production-main-loaded');
  })
  .catch(() => {
    phase('owned-wrapper-startup-failed');
    app.exit(1);
  });
