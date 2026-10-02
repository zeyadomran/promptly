import { app } from 'electron';

import { prepareSquirrelLogin } from '../settings/login-preferences';

// This side-effect dependency runs before electron-squirrel-startup's eager handler.
if (process.platform === 'win32')
  prepareSquirrelLogin(app, process.argv[1], (error) => {
    console.error('Unable to remove Promptly login registration during uninstall:', error);
  });
