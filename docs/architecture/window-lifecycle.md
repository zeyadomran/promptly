# Desktop window lifecycle

`WindowLifecycle` owns one library window and at most one Settings/onboarding window.
Main obtains the single-instance lock before initialization; a second launch and
macOS activation reveal the existing library in its current mode. Explicit Quit
settles window commands and saves normal geometry before SettingsService drains
accepted settings effects/commits and the storage worker closes. Save failures are
reported, and following storage/native cleanup still runs. Normal and fatal exits
share the bounded 40-second shutdown coordinator; accepted geometry commits drain
before settings effects, then storage and the native helper close.

Compact defaults to 440×640, with width fixed at 440 and minimum height 420.
Regular defaults to 1000×640, with minimum 760×480. Each mode stores its own normal
rectangle through SettingsService, never changing `defaultSizeMode`. Restores and
display changes use Electron DIP work areas, retain negative coordinates on
connected displays, and clamp the complete rectangle onto an available display.
When the work area is smaller than the normal minimum, reachability takes priority.
Settings starts at 800×640 with a 440×420 minimum and its layout changes at 640px;
onboarding has the 760×510 window contract. P20 and P23 own their later full contents.

Mode and visibility commands serialize in main. macOS can interpolate native bounds
over approximately 180ms; reduced motion and Windows use an immediate resize.
Another mode request, a display change, or shutdown settles the destination rather
than persisting an intermediate animation frame. Native user move/resize events
cancel interpolation and make the user's resulting rectangle the new stable bounds.
Maximize/fullscreen rectangles never
replace normal bounds; mode switching waits for macOS fullscreen exit before sizing.

The `WindowRecovery` interface reports actual tray, shortcut and Dock availability.
Requested `showInTray` and shortcut settings are not evidence of registration.
Until P24/#26 and P07/#9 inject real native controllers, Windows hide minimizes to
the taskbar and close quits cleanly; macOS close hides while the Dock is available.
Hiding the Dock first reveals the main window. Without any recovery registration,
macOS keeps that window visible and close quits. Launching the app again recovers
the running instance. A native menu and the footer expose explicit Quit.

One persisted `alwaysOnTop` value backs title controls, footer, Settings and native
pinning. macOS uses `setVisibleOnAllWorkspaces` with `visibleOnFullScreen`; Windows
uses native always-on-top behavior and cannot promise placement above exclusive
fullscreen apps. The hidden native title bar retains macOS traffic lights and
Windows caption controls. CSS reserves their hit regions, drags only the title
background, and marks controls `no-drag`.

All new commands use the existing exact-URL/main-frame validation and runtime
schemas. Auxiliary windows use the same restricted asset handler, cryptographic
style nonce, sandbox and live settings bootstrap. The initial show waits for both
renderer load and ready-to-show, so a late ready event cannot reopen a hidden window.
Failed renderer loads destroy the owned registered window, allowing a fresh retry.
Initialization also rejects on window closure, webContents destruction or renderer
exit, and has a 15-second load/readiness deadline. The gate observes late load
rejection, removes its listeners/timer on every outcome, and releases the lifecycle's
pending open so a later request constructs a fresh window.
A narrow preload focus signal
lets a later library input opt in with `data-promptly-search`; `useWindow` focuses
that input on reveal. No global show/hide shortcut is claimed as registered today.

## Verification

- Pure tests cover negative monitor origins, disconnected/partly visible windows,
  current DPI work areas, small displays and per-kind defaults, plus actual versus
  requested recovery availability and focus subscription disposal.
- `tests/e2e/window-lifecycle.spec.ts` exercises the packaged production process:
  independent mode geometry, pin/title/footer/restart, second launch, hide recovery,
  display reconciliation, preferred startup mode and platform-specific close.
- `tests/e2e/window-chrome.spec.ts` checks title hit-region CSS, theme changes,
  auxiliary dimensions, Settings across 640px, native pin convergence, validated
  unavailable tray/shortcut mutations, CSP and the later search focus contract.
- The existing CI platform matrix runs those packaged tests on Windows and macOS.

Physical monitor unplug/replug at mixed DPI, macOS Spaces with a different app in
fullscreen, native caption/traffic-light pointer hit targets, drag/resize while
the macOS animation runs, VoiceOver and Narrator remain manual platform checks.
Automated geometry tests and event reconciliation are not physical monitor evidence.

Native behavior follows Electron's [BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window),
[app](https://www.electronjs.org/docs/latest/api/app) and
[screen](https://www.electronjs.org/docs/latest/api/screen) contracts.
