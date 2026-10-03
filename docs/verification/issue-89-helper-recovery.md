# Issue 89: keyboard helper recovery

Baseline: `6817fa0d98e60c64e7c9cf510c65f5377ec4b1a1`.

The canonical `shortcuts/double-tap.test.ts` flow constructs the real
`NativeKeyboardHook` and `Shortcuts` around an owned external Node process.
Only the external frame producer and recovery clock are controlled. It does
not install a Windows keyboard hook or inspect another application's selection.

## Reproductions

`npx vitest run src/main/shortcuts/double-tap.test.ts` first failed because one
valid reset frame changed public hook status from installed to unavailable.
The same helper remained alive and continued emitting valid modifier frames.
Removing that permanent installation-state change restored subsequent capture
dispatch and kept the pre-reset capture admission invalidated.

The next slice terminated the owned helper after successful capture dispatch.
The same command failed because public status remained unavailable. Recovery
now retires the old process before starting another, and complete taps dispatch
again. The completed flow additionally verifies the controlled readiness
deadline, increasing retry delays, five-retry limit, stable-session budget reset,
recording ownership, sleep cancellation and shutdown cancellation. Owned process
exits are awaited during cleanup.

## Remaining limits

These reproductions confirm helper lifecycle defects. They do not establish
that those defects caused the reported failures in Claude Code, PowerShell,
Codex or other applications. Issue 89 requires a separate real selection and
physical-input check in the user's affected hosts before it can be closed.

The selection provider reads only `AutomationElement.FocusedElement` through
`TextPattern.GetSelection()` and `GetText()`. It requires that focused element
to have the foreground identity's PID, refuses password and higher-integrity
targets, and rechecks foreground identity after reading. A focused element
without TextPattern returns unsupported; a different focused PID returns
foregroundChanged; a provider with no selected text returns empty. Foreground
and capture transport requests each retain their existing 100 ms deadline.
No host is claimed inherently unsupported based on those source constraints.

Helper process health and successful installation do not prove Windows still
delivers physical events. Silent removal of a low-level hook is not detected
by this recovery change. No heartbeat, clipboard fallback, input injection,
elevation, subtree scanning or user-profile mutation is introduced.
