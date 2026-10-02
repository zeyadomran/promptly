# P07 shortcut qualification

Local Windows 11 x64 verification passed:

- `npm run check`: strict TypeScript 6.0.3, zero-warning ESLint, formatting,
  architecture (263 handwritten modules), 253 tests in 55 files.
- `npm run package`: distributable includes the production keyboard helper.
- Five applicable packaged cases: physical decoder/backpressure, actual hook
  installation/restart, registration/conflict/recorder lifecycle, chrome and
  durable window lifecycle. The final recovery-test change passed its focused rerun.
- `npm run test:design`: both theme/keyboard cases.
- `npm run test:packaged-design`: real Radix/Sonner with unauthorized styles
  rejected, nonce freshness across two owned processes, normal package restored.
- The final owned Windows delivery driver compiled with warnings as errors;
  it was not launched again after the local foreground denial.

At initial head `edd748b`, hosted run 36994861653 passed the complete Windows
foundation lane, including actual shortcut delivery. macOS native decoding,
hook installation and registration/recorder cases passed, but pin remained false
after the driver reported posted input. That receipt does not establish callback
delivery. The original failure artifact is retained; the next diagnostic head keeps
the same driver and the required pin/hide/show assertions and adds bounded callback,
command-result, native pin, durable preference and registration/suspension receipts.
No synthetic input is counted as physical hardware qualification.

Review corrections add independent ownership for every successfully registered
binding, all-attempted rollback cleanup and late-close retry; fresh permission-loss
snapshots; recorder release during shutdown without resuming commands; recovery
after a lost resume registration; and generation-ordered native transitions so a
newer suspend wins over a late resume. All 260 tests in 57 files and strict checks
passed after these corrections (268 handwritten modules). Fresh hosted evidence
and review remain pending.
The corrected Windows package and three focused decoder/hook/registration-recorder
cases also passed. The observer installed against actual Electron registrations and
saved its receipt; no new local delivery attempt was made. The test diagnostic
observer keeps only scalar counters (capped at 1024) and the last command outcome.
Main emits sanitized command phases only when an app-local listener exists; it
retains no history and adds no renderer API or product controls.

Owned fixtures always use isolated temporary profiles. Decoder fixtures construct
native events without posting input; they test the production eight-side decoding,
left/right overlap, repeat detection and sanitized cancellation. Windows additionally
blocks the output writer while offering 10,000 records and verifies bounded callback
handoff plus overflow reset. These fixtures do not prove physical hardware delivery.

Pure sequences cover inclusive 150/300/600 ms boundaries, holds/repeats, ordinary
keys, overlap, preference changes, discontinuous timestamps and held session startup.
Service/SQLite/IPC tests cover capture-only pause, multiple recorder owners surviving
reset and sleep, changed bindings while recording, registration/commit rejection,
rollback quarantine, helper failure and observed retirement. Main shutdown tests
hold geometry and settings drains and verify native disposal waits for both.

Packaged tests assert actual Electron registration and conflicts, durable unchanged
settings after rejection, recorder reload cleanup, suspend/resume, native hook
installation and fresh-session disposal. The delivery test keeps a separate hard
assertion that fixed test combinations reach the real OS registration and toggle
visibility/pin. Its owned driver verifies foreground identity before sending keys;
activation denial is typed and sends no keys. Playwright's launcher PID is not used
as Electron's identity; the test reads the actual main-process PID and verifies its
owned native window handle.

Local Windows delivery is **unqualified**: the OS denied activation of the separately
owned foreground driver. The hosted assertion remains required and is not skipped
or weakened. Local installation and decoder evidence do not substitute for it.
macOS compilation, actual hook/combination delivery and permissions require hosted
evidence. Manual qualification still includes physical modifier taps and both-side
overlap on each OS, background real-app delivery, Secure Input, permission revocation,
sleep across actual sessions and Windows silent hook timeout removal. Capture has
no pipeline handler yet; recorder controls arrive in their later issue.

P13 geometry, shared pin and both Dock recovery contracts remain covered. The Dock
test deliberately owns recorder suspension so its no-shortcut/no-Dock reachability
case continues to test a genuinely unavailable recovery route. No claim is made
that the existing manual fullscreen or assistive-technology gaps are resolved here.
