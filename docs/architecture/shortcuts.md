> Current scope is Windows x64 only. Earlier macOS requirements/history below are superseded; functional service tests are automated and native/UI release qualification is manual.

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
modifiers never become bindings. A valid chord waits for its captured key and all modifiers to be released before
suppression ends and the settings transaction starts. Escape, Tab/Shift+Tab,
recorder blur, window blur, hidden context and unmount cancel and release ownership.

## Local commands

Settings also records every Promptly-owned local command: next/previous snippet,
copy, delete and its optional alternative, focus search, edit tags, open Settings,
clear search or hide, and cancel a text edit. Defaults retain the original keys.
`localShortcuts` is a fixed strict preference record; old databases missing that
row read the defaults. Each committed change survives the existing SQLite settings
transaction and change notification path. Local keys may be single keys or
combinations; global shortcuts still require a modifier. Tab stays focus navigation.
Local recording accepts Escape and supplies Cancel; Tab, blur and owner retirement
still cancel. All bindings wait for key release before committing.

The shared conflict check rejects new global/local collisions and duplicate local
actions before replacing preferences. Clear/hide and editor cancel can share a key
because their owners do not overlap. Legacy global bindings that happen to collide
with a new local default keep working at startup. Settings displays the collision
until the local binding is changed; unrelated preferences can still be saved.
Profiles with several legacy collisions can resolve them one binding at a time.
Renderer and main compare the exact command pair and key for every collision;
remaining legacy pairs may persist, but replacing one with a new pair is rejected.
Global registration checks only global commands so upgrading never discards an
older working native binding solely because a new local default was introduced.

Library dispatch reads committed settings and retains editor, overlay, IME,
AltGr and repeat ownership. Only next/previous repeat. Search and editors retain
ordinary typing, selection, clipboard and text-navigation keys under remapping;
buttons retain native activation. The tag command remains available during text
editing when its binding is safe for editable controls. Editor cancellation owns
its separate binding; validation rejects cancellation keys that native editing
would always consume and explains the accepted choices. Footer and copy hints show the committed keys. Cmdk/Radix
selection, arrow navigation, dialog dismissal and native control activation remain
accessibility controls, rather than additional Promptly command bindings.

Shared accelerator validation, alias identity and known Windows reservations are
used in both renderer and main. Recorder characters follow the logical keyboard
layout; supported numpad keys keep distinct `num*` identities. Only unsupported
Alt-produced glyphs on letter positions use a base-letter fallback. The
[Electron accelerator list](https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts)
defines the supported logical punctuation and distinct numpad names.
Settings shows committed bindings and actual
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

The dedicated keyboard helper never shares UIA selection transport. It uses a
Windows low-level hook and its own message loop. Callbacks return without suppressing typing and enqueue at most 64 sanitized
records. A writer performs stdout I/O outside the queue lock. Overflow clears the
queue and emits reset; main invalidates recognition for that session. Ordinary
keys produce cancellation without key codes or text. Injected Windows keys also
cancel recognition. Frames are strictly validated and bounded to 1 KiB; startup,
backward timestamps, excessive transport lag, pipe failure and termination reset
timing. Helpers retire with bounded cleanup.

Eight bits distinguish the physical left/right Shift, Control, Alt and Meta keys.
Initial held-key
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

Windows hook installation is reported honestly; the OS does not provide definitive
detection of silent timeout removal. Physical hardware delivery remains a manual
release check. The removed macOS probes and earlier delivery receipts are retained
as historical verification, not maintained runtime or testing paths.

Primary API contracts: [Electron globalShortcut](https://www.electronjs.org/docs/latest/api/global-shortcut)
and [Windows LowLevelKeyboardProc](https://learn.microsoft.com/en-us/windows/win32/winmsg/lowlevelkeyboardproc).
