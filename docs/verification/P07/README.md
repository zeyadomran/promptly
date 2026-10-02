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

At `5642b8d`, hosted run 36996639088 again passed actual Windows shortcut delivery.
Its registration/conflict case failed because the full snapshot included an
independent geometry commit (revision 1 to 2, Compact bounds null to 440x640 at
292,40); open, pin and capture bindings did not change. The corrected test compares
every user preference except remembered geometry and checks all three actual OS
registrations after each conflict rejection. It does not constrain unrelated
geometry/revision writes. The original Windows artifact is retained.

The same run's Mac delivery receipt reported sent input, but all OS-callback and
command-phase counts remained zero; registrations were present and unsuspended,
with durable/native pin false. This rules out the command/settings path for that
run, without establishing why its posted target-key pair was not delivered. Both
original Mac artifacts remain retained. The test-only driver now posts actual
Control/Alt modifier transitions before the fixed target, observes bounded native
key state, and releases only its own held keys in reverse order on every outcome.
Every up event is allocated before any down; ownership is rechecked before each
down, and no new down starts after foreground loss. This fixture correction and
its unchanged required callback/pin/hide/show assertions need fresh hosted Mac
evidence; no production input injection or physical qualification is added.

The integration includes main `a03905d` and its owned native-fixture lifecycle fixes.
An additional regression invalidates deferred resume at accepted shutdown while
keeping settings controllers available through the drain. Full strict checks passed
with 286 tests in 62 files (282 handwritten modules); the Windows package and three
focused decoder/hook/registration-recorder cases passed. No new local delivery
attempt was made.

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

At `084d35e`, Mac run [36998101646](https://github.com/zeyadomran/promptly/actions/runs/36998101646)
again failed required application delivery: the guarded driver reported sent input
and observed key state, but actual Electron callback and command counts were zero.
Registrations were present and unsuspended, with native/durable pin false. The
byte-identical [driver](macos-084-driver.json) and [command](macos-084-command-final.json)
receipts are preserved here; the cause remains unknown.

The next diagnostic adds a separate hosted-only owned AppKit control. It registers
Control+Option F11 through Carbon with Chromium's same target, modifiers and
hot-key event handler. A passive session tap retains only scalar down/up counts
for that fixed chord, plus tap health; unrelated events are discarded. Each count
is capped at 1024. The unchanged guarded driver sends the chord only after actual
owned foreground readiness, and releases its preallocated owned keys in reverse
order on every outcome. The probe exits after a five-second observation window.
Final counts are retained even when foreground or delivery assertions fail; the
original failure remains primary if receipt collection or cleanup also fails.

The standalone control runs serially before Promptly shortcut registrations. It
uses a fresh temporary launch directory and native PID sidecar; fallback cleanup
checks the live command against the exact executable and fresh directory before
each signal, then requires observed owner exit. A stale sidecar never authorizes
termination of another process. No permission request, general key log, production
shortcut change or local input attempt is added.

A Carbon callback points the next investigation toward Electron's handler path;
exact session delivery with zero Carbon callbacks places that failure before
product dispatch. Neither diagnostic outcome qualifies the product or replaces
the unchanged required callback/pin/hide/show assertions. Windows strict checks
passed with 304 tests in 64 files (288 handwritten modules), including 18 new
scalar/privacy/owner regressions. Native Swift compilation and controlled Mac
observations remain pending fresh hosted CI.
The Windows package also passed. The hosted-only control test was discovered and
explicitly skipped on Windows; no local Carbon process or synthetic input was
started. Existing production/native delivery assertions are unchanged.

Review additionally requires explicit `GITHUB_ACTIONS=true`,
`RUNNER_ENVIRONMENT=github-hosted` and `RUNNER_OS=macOS`, as well as CI and the
macOS platform, before test or launch. The native control mirrors those hosted
markers. Inherited local `CI=true` and self-hosted runners cannot start this probe.
All 27 focused scalar/owner/hosted-gate regressions passed. The prior `fb41c67`
run remains separate evidence; the guarded head requires fresh CI observation.

The `fb41c67` Mac run
[37002571227](https://github.com/zeyadomran/promptly/actions/runs/37002571227)
failed control compilation before launch because the SDK's Swift import exposes
no `ByteCount` alias. The fixed-size event-ID buffer now uses Swift's public
[`numericCast`](https://developer.apple.com/documentation/swift/numericcast(_:))
with the destination type inferred from the imported `GetEventParameter`
signature. No control counter observation exists for that failed build. The
independent product-delivery failure remains retained and unqualified.
Full strict checks passed after the hosted correction: 313 tests in 65 files,
290 handwritten modules, TypeScript, ESLint and formatting. The Windows hosted
control remains skipped; package content is unchanged by this follow-up.
