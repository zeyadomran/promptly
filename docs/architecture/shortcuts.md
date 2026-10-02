# Global shortcuts and modifier recognition

`Shortcuts` owns Electron registrations, recorder owners and capture-only pause.
`SettingsService` applies its reversible controller before committing preferences.
New registrations succeed before old registrations are released; rejected OS
registration, in-app aliases and SQLite rejection restore previous bindings.
Failed rollback quarantines callbacks and future preference mutations until restart.
Ownership is tracked independently of active dispatch: every rollback removal is
attempted and failed unregisters remain owned for later shutdown retry.
Startup reports requested defaults separately from actual registration: Windows
Alt+Space is permitted to be unavailable. Window recovery uses actual show/hide
registration and excludes recording, sleep and shutdown.

Capture pause gates only capture. Recorder ownership suspends all Electron
shortcuts and modifier recognition; each authorized WebContents owns its scope.
Completion, renderer destruction, main-frame navigation and renderer failure
release that owner. Resets, overflow, sleep and fresh hook sessions retain owners.
Owner release during shutdown stays idempotent without re-enabling shortcuts.
The shared P21 recorder controls now wire Settings to that scoped API. A renderer
owns one recording session across its capture/open/pin controls. IPC transitions
serialize, newer requests retire older acquires, and key input is accepted only
after main acknowledges suppression. Composition, AltGr text, repeats and lone
modifiers never become bindings. A valid chord waits for modifier release before
suppression ends and the settings transaction starts. Escape, Tab/Shift+Tab,
recorder blur, window blur, hidden context and unmount cancel and release ownership.

Shared accelerator validation, alias identity and known Windows reservations are
used in both renderer and main. Settings shows committed bindings and actual
registration/listener status; native registration errors survive the settings
transaction. Windows Alt+Space has an explanatory warning and an explicit
Ctrl+Alt+Space attempt. No alternate is silently chosen, no other app is scanned,
and registration is not evidence of physical shortcut delivery. Component reuse
for onboarding P23/#25 is available; that flow remains unimplemented here.

Windows reservations and the Alt+Space window-menu warning follow
[Microsoft's keyboard shortcuts](https://support.microsoft.com/en-us/accessibility/windows/keyboard-shortcuts-in-windows).
Electron documents [registration and suspension](https://www.electronjs.org/docs/latest/api/global-shortcut)
as the available OS boundary. Native rebind, rendering, assistive technology,
physical double taps and capture suppression still require manual qualification.

The dedicated keyboard helper never shares AX/UIA selection transport. Windows
uses a low-level hook and its own message loop; macOS uses a passive session event
tap. Callbacks return without suppressing typing and enqueue at most 64 sanitized
records. A writer performs stdout I/O outside the queue lock. Overflow clears the
queue and emits reset; main invalidates recognition for that session. Ordinary
keys produce cancellation without key codes or text. Injected Windows keys also
cancel recognition. Frames are strictly validated and bounded to 1 KiB; startup,
backward timestamps, excessive transport lag, pipe failure and termination reset
timing. Helpers retire with bounded cleanup.

Eight bits distinguish the physical left/right Shift, Control, Alt and Meta keys.
macOS uses device-dependent IOHID flags and verifies aggregate consistency;
aggregate-only flags cancel instead of guessing a physical side. Initial held-key
state is read outside callbacks. Recognition requires two completed press/release
pairs within the configured 150–600 ms release interval. Overlap, another modifier,
ordinary typing, repeated presses and holds cancel the sequence. Preference changes
and resume reset timing. A fresh session snapshot cannot turn an already-held key
into a first tap.
Native lifecycle transitions serialize with generations; a newer suspend retires
an old resume before another session can start. Losing the registered reopen route
on resume makes the existing window reachable.

Main commands toggle the existing `WindowLifecycle` and persist the shared pin
through SettingsService. The narrow capture gateway remains without a handler until
P11; status explicitly reports that absence and no capture result is fabricated.
Quit first stops command dispatch, drains geometry and accepted settings, then
closes storage and independent native resources. Normal and fatal shutdown share
the existing 40-second coordinator. Every owned unregister is attempted even if
another cleanup fails.
Stopping commands also invalidates pending resume synchronously. A late native
start is retired without restoring registrations, visibility recovery or callbacks;
active resources still close after accepted settings settle.

macOS reports actual Accessibility and Input Monitoring without requesting unrelated
permissions. Permission loss, Secure Input and tap disablement invalidate the tap.
Periodic checks publish changed permission snapshots; bare loss/retirement makes
unknown permissions explicit rather than retaining a stale granted value.
Combinations remain independently available. Windows hook installation is reported
honestly; the OS does not provide definitive detection of silent timeout removal.
Physical hardware delivery and permission transitions require qualification.

Primary API contracts: [Electron globalShortcut](https://www.electronjs.org/docs/latest/api/global-shortcut),
[Windows LowLevelKeyboardProc](https://learn.microsoft.com/en-us/windows/win32/winmsg/lowlevelkeyboardproc),
[Apple flagsChanged](https://developer.apple.com/documentation/coregraphics/cgeventtype/flagschanged),
[Apple keyState](https://developer.apple.com/documentation/coregraphics/cgeventsource/keystate(_:key:)),
and [Apple IOHID device masks](https://github.com/apple-oss-distributions/IOHIDFamily/blob/777ccd9698845aadf711e32d843c8c9b777431d9/IOHIDSystem/IOLLEvent.h).

The hosted test-only Carbon control follows Chromium's
[macOS accelerator listener](https://raw.githubusercontent.com/chromium/chromium/main/ui/base/accelerators/global_accelerator_listener/global_accelerator_listener_mac.mm):
Control+Option F11, `GetApplicationEventTarget`, registration options zero and a
`kEventHotKeyPressed` handler that verifies its own fixed hot-key ID. Its
[listen-only session tap](https://developer.apple.com/documentation/coregraphics/cgeventtapoptions/listenonly)
returns events unchanged and retains no general key stream. This independent
control partitions failed synthetic delivery; actual Promptly callbacks and
physical hardware qualification remain separate required evidence. See P07's
retained failures and bounded diagnostic scope.
