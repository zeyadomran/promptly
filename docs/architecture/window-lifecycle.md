# Windows desktop window lifecycle

Promptly supports Windows x64. `WindowLifecycle` owns one library window and at
most one Settings/onboarding window. Main obtains the single-instance lock before
initialization; a second launch reveals the existing library in its current mode.
Explicit Quit settles commands and normal geometry before Settings effects,
accepted storage work and native resources drain through the existing bounded
40-second shutdown coordinator. Save/cleanup failures remain reported.

Compact defaults to 440×640, with fixed 440 width and minimum height 420. Regular
defaults to 1000×640, with minimum 760×480. Each mode stores its own normal rectangle
through SettingsService; resizing never changes the next-launch default mode.
Electron DIP work areas preserve negative coordinates on connected displays and
clamp the complete rectangle to an available display. Small work areas prioritize
reachability over normal minima. Explicit finite native limits refresh on mode,
move/resize and display/DPI changes. Settings starts at 800×640 with a 440×420
minimum and its layout changes at 640px; onboarding uses the 760×510 contract.

Mode and visibility commands serialize in main. Windows mode switches resize
immediately after restoring a normal window; maximized/fullscreen rectangles never
replace stored normal bounds. Fullscreen exit is observed before normal sizing.
Display changes reconcile existing windows against current work areas.
Successful geometry persistence or an authoritative unchanged rectangle clears
the last save error, so a transient failure does not permanently block switching
mode or quitting.

`WindowRecovery` reports actual tray/controller and show/hide shortcut availability;
requested preferences do not prove registration. Hide uses a recovery route when
available, otherwise minimizes to the taskbar. Without a recovery route, closing
the main window quits. Tray support remains tracked in #26. Native menus and the
footer expose explicit Quit. Relaunching recovers an existing instance. The global
Open command focuses a visible but unfocused window; it hides only a focused
window. Resume keeps hidden windows hidden while an actual tray or Open shortcut
remains available. A minimized taskbar window also remains a usable route. Only
total route loss reveals a hidden window automatically.

One persisted `alwaysOnTop` value backs title controls, footer, Settings and native
Windows pinning. Placement above exclusive fullscreen applications is not promised.
The hidden native title bar uses Windows caption controls. CSS reserves their hit
regions, drags only the title background, and marks interactive controls `no-drag`.

Commands retain exact-URL/main-frame validation and runtime schemas. Auxiliary
windows use restricted assets, a cryptographic style nonce, sandboxing and live
Settings bootstrap. Initial show waits for renderer load and ready-to-show;
closure, webContents destruction, renderer exit or the 15-second readiness deadline
reject initialization and permit a fresh later request. Late load rejection is
observed and listeners/timers are retired. No late ready event reopens a hidden
window. A narrow preload focus signal reaches the renderer's single guarded
library keyboard/focus owner; it preserves editing and overlay ownership.

After initial readiness, ordinary windows distinguish renderer death from
unresponsiveness. Renderer death shows an explicit Reload window/Quit choice;
reload destroys the unusable window and creates a fresh sandboxed window from
saved library data and startup preferences. Unsaved edits cannot be recovered.
An unresponsive renderer offers Keep waiting/Reload window/Quit, defaults to
waiting and explains that reload discards unsaved edits. It does not recreate
the window automatically. A responsive event dismisses the warning; a crash
while waiting changes the decision to renderer death. One owner coalesces Open
requests with that decision. Fatal recovery and quit retire the decision before
cleanup; no later response recreates a window or replays a saved operation.

## Verification

The canonical public recovery service flow checks actual route availability and
Windows hide/minimize behavior. Follow [testing policy](../testing.md): strict
checks and Windows packaging are automated; no GUI/native suite is maintained.
Mixed-DPI monitor changes, native caption/drag targets, fullscreen, Narrator and
physical focus/shortcut behavior remain manual Windows release checks. Earlier
cross-platform receipts in verification are historical and do not qualify this
current Windows-only artifact.

Native behavior follows Electron's [BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window),
[app](https://www.electronjs.org/docs/latest/api/app) and
[screen](https://www.electronjs.org/docs/latest/api/screen) contracts.
