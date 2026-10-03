# Preference recovery (#99)

Launch-at-login startup now observes native registration without changing it. Settings shows the actual Windows launch state separately from the retained request. An explicit toggle applies even when its requested value matches the database; a rejected transaction restores the preceding native registration and approval state.

This follows the pinned [Electron 44.5.1 Windows implementation](https://github.com/electron/electron/blob/v44.5.1/shell/browser/browser_win.cc#L616-L686): setting an enabled login item removes the Windows StartupApproved disablement. The [native status API](https://www.electronjs.org/docs/latest/api/app#appgetloginitemsettingsoptions-macos-windows) distinguishes the Run entry from whether the executable will actually launch. Startup must therefore read rather than reapply the persisted boolean.

Settings also offers an explicit retry of current global registrations. It does not write preferences, runs through the existing registration owner, and rejects recording, sleep, shutdown and quarantined ownership. A failed modifier listener still requires its existing recovery/restart path; global binding retry does not promise listener repair or native delivery.

New printable Shift-only global bindings are rejected. Retained legacy values remain readable and visible as unavailable, including duplicate unsafe bindings; they are excluded from native registration, retry and conflict claims. Missing known local-shortcut fields receive defaults; malformed present values and unknown fields still fail startup validation.

Tray copy status expires after three seconds. Replacement restarts its deadline; hiding, native retirement and command shutdown cancel the pending timer.

## Functional evidence

The existing settings flow failed before the fix because a partial local-shortcut row rejected initialization. It also reproduced startup turning an owned Windows-disabled login entry back on. The existing shortcut transaction flow reproduced legacy Shift text bindings being registered, and the tray flow reproduced feedback that did not expire. These flows pass after the change, with durable reopen, actual-status outcomes, explicit native rollback, retry suppression and timer retirement assertions. The real storage-worker startup flow verifies malformed nested values retain database bytes and safe failure guidance.

Tests control Electron's external OS API and time boundaries; they do not write the user's registry, login state or profile. Actual Windows startup execution, physical shortcut delivery and Settings rendering remain manual release qualification under [the test policy](testing.md).
