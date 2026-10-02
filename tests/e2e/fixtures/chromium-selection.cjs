const { app, BrowserWindow } = require('electron');

app.commandLine.appendSwitch('force-renderer-accessibility');
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 500, height: 200, webPreferences: { sandbox: true } });

  await window.loadURL(
    'data:text/html;charset=utf-8,' +
      encodeURIComponent(
        '<textarea aria-label="Owned Promptly selection" autofocus>Chromium 雪🙂 exact\nowned fixture</textarea>'
      )
  );
  await window.webContents.executeJavaScript(
    'document.querySelector("textarea").focus(); document.querySelector("textarea").select();'
  );
  window.show();
  window.focus();
});
app.on('window-all-closed', () => app.quit());
