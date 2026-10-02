# Global shortcuts and modifier recognition

`Shortcuts` owns Electron registrations, recorder owners and capture-only pause.
`SettingsService` applies its reversible controller before committing preferences.
New registrations succeed before old registrations are released; rejected OS
registration, in-app aliases and SQLite rejection restore previous bindings.
Failed rollback quarantines callbacks and future preference mutations until restart.
Startup reports requested defaults separately from actual registration: Windows
Alt+Space is permitted to be unavailable. Window recovery uses actual show/hide
registration and excludes recording, sleep and shutdown.

Capture pause gates only capture. Recorder ownership suspends all Electron
shortcuts and modifier recognition; each authorized WebContents owns its scope.
Completion, renderer destruction, main-frame navigation and renderer failure
release that owner. Resets, overflow, sleep and fresh hook sessions retain owners.
The recorder UI belongs to P20; the scoped API is available for its future lifetime.

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

Main commands toggle the existing `WindowLifecycle` and persist the shared pin
through SettingsService. The narrow capture gateway remains without a handler until
P11; status explicitly reports that absence and no capture result is fabricated.
Quit first stops command dispatch, drains geometry and accepted settings, then
closes storage and independent native resources. Normal and fatal shutdown share
the existing 40-second coordinator. Every owned unregister is attempted even if
another cleanup fails.

macOS reports actual Accessibility and Input Monitoring without requesting unrelated
permissions. Permission loss, Secure Input and tap disablement invalidate the tap.
Combinations remain independently available. Windows hook installation is reported
honestly; the OS does not provide definitive detection of silent timeout removal.
Physical hardware delivery and permission transitions require qualification.

Primary API contracts: [Electron globalShortcut](https://www.electronjs.org/docs/latest/api/global-shortcut),
[Windows LowLevelKeyboardProc](https://learn.microsoft.com/en-us/windows/win32/winmsg/lowlevelkeyboardproc),
[Apple flagsChanged](https://developer.apple.com/documentation/coregraphics/cgeventtype/flagschanged),
[Apple keyState](https://developer.apple.com/documentation/coregraphics/cgeventsource/keystate(_:key:)),
and [Apple IOHID device masks](https://github.com/apple-oss-distributions/IOHIDFamily/blob/777ccd9698845aadf711e32d843c8c9b777431d9/IOHIDSystem/IOLLEvent.h).
