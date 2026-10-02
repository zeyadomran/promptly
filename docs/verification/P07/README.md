# P07 shortcut qualification

## Current minimal verification

The user-approved cleanup retains one actual product shortcut flow and three
distinct logic cases: physical double-tap cancellation, rejected OS registration
rollback, and shutdown invalidation of a late resume. Carbon/session probes and
their exclusive native runners, copied launchers and infrastructure suites are
retired. The sections below and all raw receipts are historical evidence.

The product flow keeps capture paused and requires durable pin plus actual
hide/show results. Windows retains Control+Alt+F11/F10; the owned macOS fixture
uses Control+Alt+K/J with SDK physical key constants. Native input is restricted
to GitHub-hosted runners and freshly verified owned foreground processes. No
production default binding or supported-key restriction changed.

At `b47f2c80070e1a7f600d2adfa2b093c112def706`, the owned K control received one
Carbon callback while the F11 control received none. The byte-identical receipts
are [K](macos-b47-k-control.json), [F11](macos-b47-f11-control.json), and the
[failed product result](macos-b47-command-final.json). That control did not qualify
the new Electron K/J flow or physical function-key support.

At `60e3e9c893ca13d26e8fb688f63e58ce475184b7`, hosted run
[37026563074](https://github.com/zeyadomran/promptly/actions/runs/37026563074)
passed the actual product shortcut flow on Windows (5 seconds) and macOS
(14.2 seconds). The unchanged durable pin and hide/show assertions passed;
final [Windows](windows-60e3-shortcut-final.json) and
[macOS](macos-60e3-shortcut-final.json) receipts retain the committed pin and
visible main window. This qualifies the fixed hosted synthetic-input flow,
including macOS K/J on that runner's layout, not physical hardware or arbitrary
keyboard layouts. Earlier F11 failures remain historical and unexplained.

Both hosted preference-restoration receipts report `restorationOk: true` and
matching initial/restored values: [Windows](windows-60e3-packaged-transfer-restoration.json)
and [macOS](macos-60e3-packaged-transfer-restoration.json). These small receipts and
the successful owned-input receipts are copied byte-for-byte from the CI artifact.
The overall run still failed the separate native selection flow (Windows
110.50 ms, macOS 274.31 ms); successful shortcut delivery does not qualify that
flow or make the combined CI green.

The new macOS native input slice cannot run safely on the local Windows host.
No local red/green runtime result is claimed for it. The connected capture
pipeline is absent, so the old trailing capture injection/unavailable-handler
assertion was removed rather than presented as an implemented base flow.

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

At `5e5595d`, Mac run
[37002935742](https://github.com/zeyadomran/promptly/actions/runs/37002935742)
compiled and ran the LaunchServices control. Its foreground matched, handler and
registration returned zero, and the unchanged guarded driver reported sent input.
Carbon callbacks were zero. Its passive tap was unavailable (`listening=false`,
`tapInstalled=false`), so zero session counts cannot establish missing delivery.
The byte-identical [control](macos-5e-carbon-control.json),
[driver](macos-5e-driver.json), and [final product command](macos-5e-command-final.json)
receipts are retained. Product callbacks remained zero and pin false; this failed
product gate and its unknown cause remain unchanged.

The next bounded discriminator adds a passive fixed-chord sidecar spawned inside
an owned Electron main process. Both native builds finish before launching it,
then the separate LaunchServices Carbon control starts. The launcher uses a fresh
copy of the packaged Promptly bundle with only its copied resources replaced by a
minimal test bootstrap: no product services, windows, or shortcut registration.
The actual distributable is untouched. A fresh profile is supplied at launch and
the resolved `app.getPath('userData')` is checked by canonical directory identity.
The receipt explicitly records the copied bundle and differing path/bootstrap;
this does **not** establish identical TCC attribution or inherited permission.

The sidecar's ready state and a fresh inspection immediately before the unchanged
guarded driver must both report listening access, an installed enabled listenOnly
session tap, no Secure Input, and no tap disable event. Otherwise this control
probe sends no input and retains an inconclusive receipt. The required independent
product-delivery case remains unchanged. Only Control+Option F11 down/up counts and
tap health survive the callback; unrelated events are discarded and every count
is capped at 1024. Hosted markers are required at build, launcher, Electron
bootstrap, child-owner and native boundaries; no local tap/input is attempted.

The native diagnostic lifetime is ten seconds; receipt polling is bounded to
three seconds and remote bootstrap/evaluation to four. Final counters and safe
cleanup-stage outcomes are saved in `finally`, including setup failure after
Electron starts. Child retirement is attempted before independent launcher
retirement, even after a rejected or never-settling bootstrap. Stop requests cannot
bypass the 500 ms owned-handle fallback intervals; successful signals or close
events never substitute for observed exit. The copied bundle/profile is removed
only after both child and launcher retirement verify exit. If startup yields no
launcher handle or termination cannot be established, the owned copy is retained
and cleanup is reported unverified. No stale PID authorizes a signal.

Main `af0ff00` is integrated with both selection and keyboard helpers/resources,
typed permission and shortcut IPC, and settings-first native cleanup preserved.
Local Windows verification passed clean install (451 packages, zero audit findings),
full strict checks (382 tests in 79 files, 361 handwritten modules), and packaging.
The 59 focused scalar/privacy/hosted/lifecycle/integration regressions passed;
new deferred-bootstrap, hung-close and dual-failure cases exercise cleanup without
native input. The hosted-only control is skipped locally. Fresh hosted Swift
compilation, tap availability and controlled counters remain pending; neither
diagnostic outcome qualifies product delivery or physical/background behavior.

At `07b0a25`, Mac [run 37008864110](https://github.com/zeyadomran/promptly/actions/runs/37008864110)
(job 110843505180) failed the copied Electron launcher with ICU/GPU resource lookup
errors after sidecar tap-ready success and before fresh inspection/control input.
The byte-identical [failed control](macos-07-carbon-control-failed.json) and
[final product command](macos-07-command-final-failed.json) receipts are retained.
Windows foundation and both native lanes passed on that head. The failure is not
rerun or counted as successful observation.

Review established a copy topology defect: Node `fs.cp` defaults to rewriting
relative symlinks against the source tree, so copied framework links pointed into
the original bundle. The owned copy helper now explicitly sets
`verbatimSymlinks: true`. A real relative framework-chain regression moves the
original and verifies copied link text, canonical resource containment and readable
ICU sentinel. This test requires Unix/macOS relative-symlink semantics and is
skipped on Windows. Local strict checks passed: 382 tests plus one platform skip
in 80 files, 363 handwritten modules; focused sidecar checks passed 27 with the
same one platform skip. The native driver, input/tap guards and all product gates
are unchanged. Packaging was not repeated for this test-only copy correction.
Fresh macOS CI must verify topology and whether the resource crash is repaired;
its observed cause and product delivery remain unqualified.

## Carbon callback and local dispatch discriminator

At `a0f0a84`, public hosted Mac [run 37009871264](https://github.com/zeyadomran/promptly/actions/runs/37009871264)
kept the copied Electron launcher and session tap healthy. The fresh fixed-chord
tap observed exactly one down and one up, enabled with no disablements; child,
launcher and Carbon owner cleanup verified exit. The Carbon control had actual
foreground, successful handler/registration and guarded sent input, but zero
successful decoded Carbon callbacks. Product callbacks still remained zero and
pin false. Byte-identical [control](macos-a0-carbon-control.json) and [failed
product](macos-a0-command-final.json) receipts are retained. Their SHA-256 hashes
are respectively `1a751d380e301ba6bb39a1cd019cb90c82425dc320b3711e38097c5d23e5f61f`
and `ba7b836fa9fcb20a3b3e335c841b24941969969bfc3e8ecf5cfa944dd9b8587f`.
This proves that the copied context now reached the observation stage; it does
not identify the product delivery failure's cause.

The owned control now records bounded `handlerEntered` before parameter decoding,
`parameterFailed` for missing/undecodable events and `idMismatch` for decoded
unexpected signature/ID. The existing `carbonPressed` count and native callback
return statuses are preserved. Each count saturates at 1024. A pure Swift seam
tests entry-before-decode, failed parameters, mismatched signature/ID, successful
decode, local observations and saturation without AppKit input or permissions.
That native regression requires macOS and is skipped on Windows.

A local AppKit monitor accepts only keycode 103 with Control/Option and no
Command/Shift before reading character identity. It retains only bounded down/up
counts and booleans indicating whether F11 identity, function or numeric-pad
classification was observed; it never retains arbitrary characters or raw flags.
It returns the exact original NSEvent, preserving dispatch, and normal final
cleanup removes it before writing the receipt. Installation is required before
probe input; final removal is required and any failure remains in settled cleanup
evidence. Final counters still persist on driver/assertion failures. The existing
session readiness, secure-input, permission, foreground and death guards remain.

Apple documents that [local monitors](https://developer.apple.com/documentation/appkit/nsevent/addlocalmonitorforevents(matching:handler:))
observe application dispatch and may return an unchanged event. Events consumed
before `sendEvent` or by nested tracking loops need not reach this monitor, so
zero local counts alone do not establish an earlier nondelivery cause. AppKit
[function classification](https://developer.apple.com/documentation/appkit/nsevent/modifierflags-swift.struct/function)
includes F/navigation keys; it does not by itself establish physical Fn state or
a Carbon registration requirement. No Fn guess or injection-driver change is made.

Main `896a8a` is integrated normally, preserving sender-scoped transfer/recorder
IPC and transfer-before-window/settings/native retirement. The shared selection
launch/readiness setup was extracted to keep bootstrap within the existing module
size limit, with identical native options and readiness logging. No product gate,
driver, TCC/signing permission, timing deadline or fixture lifetime is weakened.
No local native input or monitor was launched. Exact-head hosted compilation,
observation and real product delivery remain required before merge.

Local Windows validation for this delta passed: clean install (451 packages,
zero audit findings); full strict checks (424 passed, three native/platform skips,
92 test files, 406 handwritten modules), including schema/privacy/hosted/ownership
regressions; package. The hosted Carbon case was explicitly discovered and skipped
without creating a control, tap, launcher or input. The pure Swift regression and
AppKit control compilation/runtime are unrun locally and required on fresh Mac CI.

## Separate physical-letter control

The reviewed `86e391` hosted run reached both a healthy passive session observer and
owned AppKit local dispatch: down/up counts were one in each, F11 character/function
identity was true, and Carbon handler entry remained zero. Foreground, registration,
monitor removal and both process cleanup receipts were verified. The product still
failed with zero callbacks and pin false. Byte-identical [86 control](macos-86-carbon-control.json)
and [86 product](macos-86-command-final.json) receipts retain this failure; SHA-256 values
are `997128149ff0097b5ad7d5238b50f0c2e06c82348f31d6605877a949ce62ae72`
and `ba7b836fa9fcb20a3b3e335c841b24941969969bfc3e8ecf5cfa944dd9b8587f`.
Zero handler entry excludes decode/ID mismatch as the failing stage in that run;
it does not identify why Carbon recognition/dispatch did not occur.

The diagnostic now runs two **separate** fixed controls: `ctrl-option-f11` and
`ctrl-option-k` (physical ANSI_K). Each case creates fresh copied Electron/session
owners, profiles and a LaunchServices Carbon control. Swift and TypeScript accept
only these names; ready/final/inspect receipts must identify the requested chord.
Both passive monitors gate the selected physical key and unchanged modifiers before
retaining any counts or character-identity booleans. The local monitor returns the
original NSEvent. Existing F11 character evidence remains separate from the new
fixed-K character boolean. No arbitrary characters, identities or raw flags are logged.

The original F11/product driver actions and modifier/ownership/held-key/release
sequence remain unchanged. One additional `carbon-letter-k` action selects physical
key 40 only under explicit GitHub-hosted macOS guards. Both cases still require a
fresh healthy tap immediately before guarded input; unavailable observation is
inconclusive and sends no probe input. Final counters and observed cleanup remain
durable on failures. This adds no Fn flags, permission requests, signing changes,
local input, production shortcut changes, or relaxed product timing/delivery gates.

A positive K callback with zero F11 narrows key-class recognition. Both remaining
zero despite matching session/local delivery leaves shared synthetic-to-Carbon
recognition/dispatch unresolved. Neither observation qualifies product delivery or
proves that a host is unsupported. Actual Swift compilation and both observations
remain required on fresh hosted macOS CI; Windows local validation cannot prove them.

Fallback native retirement now requires fresh exact executable, owned launch directory
**and selected chord** before each signal. Both labels permit observed owned retirement;
an otherwise matching process with the other label is rejected without signaling.
This closes the two-chord argv mismatch found in review, preserving the existing
identity checks before TERM/KILL and observed exit requirement.

The immutable issue #27 / PR #48 checkpoint `87160c0` is integrated as a dependency,
including the responsive Settings setup correction, worker fixture ownership and
CI-only file scheduling. No changes were made to that issue's timing/workload policies.
The main-test merge retained the existing startup/shutdown split and transplanted the
new no-settings-before-storage-failure assertions into the startup tests.

Final local Windows validation passed full strict checks: 449 tests passed, three
native/platform skips in 97 files, all TypeScript targets, strict ESLint/Prettier and
architecture (418 handwritten modules). The focused probe/schema/ownership lane passed
61 tests with one appropriate Swift Windows skip. Packaging passed with identical
product/build code before the final test-only retirement correction. Both hosted
control cases were discovered and skipped locally without any process, tap or input.
Actual Mac compilation/observations and product delivery remain unrun for this delta;
fresh exact-head hosted CI and review are required. Existing failures are retained.
