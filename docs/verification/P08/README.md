# macOS source activation evidence

[`activation-f72db61-macos-failed.json`](activation-f72db61-macos-failed.json) is the
unchanged owned-fixture receipt from [run 36986169102](https://github.com/zeyadomran/promptly/actions/runs/36986169102),
macOS job 110771584839 at `f72db61814daa1225ce99bbe43f9b57ac23ba058`.
Initial Promptly window readiness and fixture identity succeeded. The test failed
at the Promptly foreground precondition with the fixture still foreground; no
production activation occurred. The receipt contains owned-app state and timings,
without selection text or unrelated application identity.

The follow-up requests macOS application focus once in test setup and verifies
actual app/window/native foreground state before its one unchanged 100 ms
production activation. Local Windows strict checks and packaging do not qualify
that macOS behavior. Fresh macOS CI must pass; the human TCC, architecture,
fullscreen and signed-distribution matrix remains open.

After integrating main `f2d90ba9d23b27a8a28d76006254e5a5c90845df`, local Windows
validation passed 216 unit tests, type checking, strict lint, architecture and
formatting checks, plus Forge packaging. The isolated packaged foundation,
window lifecycle, failed-load recovery, close-during-load recovery and
unsupported-owned-schema startup tests all passed (five cases). Actual resolved
temporary profile identity was checked for each successful launch; the macOS
activation case was skipped on this Windows host.

[`activation-424fcdc-macos-failed.json`](activation-424fcdc-macos-failed.json) preserves
the subsequent [run 36991774202](https://github.com/zeyadomran/promptly/actions/runs/36991774202)
failure at `424fcdcf9279a23e61be7c1c5b16c0d023817090`. The owned fixture identity
succeeded in 3.97 ms, Promptly's app/window state reported active/focused/visible,
and the fixture reported background. The native adapter's display-PID comparison
returned both matches false, before any production activation. Its status and
metadata availability were not recorded, so the observed cause remains unknown.

Review confirmed that an `ok` native identity may legally contain `source: null`.
Requiring optional display metadata to establish owned foreground was an invalid
test precondition. The revised owned AppKit fixture independently compares fresh
`NSWorkspace.frontmostApplication.processIdentifier` with the packaged Electron
main process's actual PID, returning only a boolean through its private temporary
directory. A fresh native match is required before the same single 100 ms activation;
adapter status must still be `ok`. Receipts add status, source availability, owned
matches and timings, without unrelated app identity or selected text. Exact text,
selection range, pasteboard counter and forged-capability assertions remain intact.

The file observer regressions verify fresh responses rather than stale matches,
invalid PID rejection before signaling, and safe rejection of malformed responses.
They do not qualify macOS focus or Swift compilation on this Windows host. Fresh
macOS CI and review must verify that behavior; no production identity guards,
protocols, activation deadline or activation retry policy changed.

After integrating main `a03905d44d09fab8c006238f4984c3301b38c96c`, Windows strict
checks passed 249 tests in 56 files, type checking, lint, architecture and formatting.
The eight owned-observer regressions passed, and the main-owned activation harness
built successfully through Vite. Windows Forge packaging passed. The macOS
activation case was explicitly skipped on this Windows host; these results do not
establish the OS foreground behavior.

[`activation-70f770d-macos-failed.json`](activation-70f770d-macos-failed.json) is the
unchanged receipt from [run 36997414033](https://github.com/zeyadomran/promptly/actions/runs/36997414033),
macOS job 110807202257. The independent native observer proved Promptly's actual
main PID was foreground, while app/window checks succeeded and the fixture was
background. The production adapter returned `foregroundChanged` in 1.56 ms,
before activation. Initial fixture identity had succeeded in 3.15 ms.

The production identity requires `NSRunningApplication.launchDate`, which
[Apple documents](https://developer.apple.com/documentation/appkit/nsrunningapplication/launchdate)
as available only for applications launched by LaunchServices. The fixture uses
LaunchServices; Playwright directly starts the Promptly executable. This is a
possible guard mismatch, not a proven cause of the failure. The next test-only
discriminator returns `launchDateAvailable` alongside the independent owned-PID
match. It reads that property only when the foreground PID matches the supplied
owned Promptly PID, and exposes only two booleans. Strict decoding rejects extra
metadata. The production status must still be `ok`, so this diagnostic does not
turn the failed precondition into a passing test or change any identity guards,
activation deadline, capture assertion or retry policy.

Local Windows verification of this diagnostic delta passed all strict checks and
252 tests in 56 files, including 11 owned-observer response regressions. Actual
Swift compilation and the owned-PID launch-date observation require fresh macOS CI.
The production package contents are unchanged from the packaged `70f770d` head.

[`activation-82c101a-macos-failed.json`](activation-82c101a-macos-failed.json) retains
the failure from [run 36998321957](https://github.com/zeyadomran/promptly/actions/runs/36998321957),
macOS job 110810021823. The actual owned Promptly PID was foreground and its native
launch date was unavailable, while production identity returned `foregroundChanged`
in 1.12 ms. This confirms the missing-date prerequisite failure; source activation
was never attempted. The receipt remains byte-identical to its CI artifact.

The production correction follows Apple's public
[`processIdentifier` guidance](https://developer.apple.com/documentation/appkit/nsrunningapplication/processidentifier):
retain the original `NSRunningApplication` and compare it using `isEqual` against
each fresh PID resolution. Both applications must be live with the same positive
PID and bundle, and required actual foreground must equal the retained instance.
Nonnil recorded launch dates add supplemental checks; nil dates never permit bare
PID/bundle identity. Main-held capability/opaque token and post-activation checks
remain intact, with the same 100 ms deadline and unchanged forged-capability,
text, selection and pasteboard assertions.

Twenty-two owned Swift seam cases exercise equal distinct nil-date objects,
unequal lifetime despite identical PID/bundle/date, termination, missing instances,
changed PID/bundle/date and foreground. The fixture build compiles and runs these
cases on macOS. The packaged activation flow now runs separately for LaunchServices
and direct-launched owned source apps; the latter must prove a nil launch date before
actual source capture, Promptly foreground and the single background activation.
After the direct source exits, another capture with its retained capability must
reject `foregroundChanged`; it cannot inspect a subsequent PID owner.
Local Windows strict checks cannot qualify Swift compilation or these OS behaviors;
fresh macOS native and packaged CI remain required.

Windows validation of the source-identity correction passed all strict checks,
252 unit tests, 17 focused adapter/observer tests and Forge packaging. Both actual
macOS activation cases are discovered but skipped on Windows. The 22 Swift seam
cases and OS source/handoff behavior are pending native and packaged macOS CI;
their execution is not claimed from this development host.

At `b2fff47`,
[run 36999868036](https://github.com/zeyadomran/promptly/actions/runs/36999868036)
passed the LaunchServices source handoff and accepted directly launched Promptly
with a nil launch date. The direct-source case failed before helper initialization:
its native foreground match was false. The original
[passing LS receipt](activation-b2fff47-macos-launchServices.json) and
[failed direct receipt](activation-b2fff47-macos-direct.json) are retained unchanged.
This does not qualify the direct-source flow.

The test setup now uses an independently verified foreground LaunchServices
fixture as coordinator. It resolves the exact live owned direct fixture, verifies
its nonnil executable and bundle, and calls Apple's public
[`yieldActivation(to:)`](https://developer.apple.com/documentation/appkit/nsapplication/yieldactivation(to:)).
Only after acknowledgment does the direct target call `app.activate()` itself.
Native readiness waits for actual foreground identity within the same five-second
fixture readiness bound; a denial remains false and fails the assertion. No
force-activation API, arbitrary startup sleep, input injection or TCC change is
introduced. Direct spawn and the nil-launch-date assertion remain required.

The direct fixture now registers its exit observer before readiness and requires
an actual ChildProcess exit before checking its terminated source capability.
A timeout or sent signal cannot substitute for death. Cleanup requests graceful
stop, then waits for bounded owned-handle TERM/KILL completion and rejects if exit
remains unobserved. Repeated close shares the same settled operation. LaunchServices
fallback signals additionally require fresh exact executable/launch-directory
identity; bare sidecar PIDs do not authorize signaling. Six regressions include
the review's no-exit reproduction, late TERM/KILL exit, idempotence and ownership
validation failure while retiring the owned launcher.

These are fixture corrections. Production retained/fresh/foreground application
equality, opaque capabilities, the single activation, 100 ms request deadlines,
75 ms activation bound, forged identity rejection and text/selection/pasteboard
postconditions remain unchanged. Actual native compilation and direct-source OS
handoff require fresh macOS CI; Windows checks do not establish them.

Review also corrected swallowed cleanup failures: setup errors now aggregate their
original cause and safe cleanup outcomes, and the final durable receipt includes
helper/fixture/Electron cleanup status and failure count. Normal completion fails
on any unverified cleanup; an existing setup/assertion error stays primary. Four
regressions prove rejected fixture cleanup cannot pass, every cleanup still runs,
prior failures are preserved, and nested setup outcomes contain no raw contents.
Ten additional owner regressions cover stale/invalid sidecars, exact live argv and
signal/death races. Integration includes main `8a827ef` (Settings UI); clean install
and Windows packaging passed after that merge. Final strict/native CI evidence is
reported separately below.
Post-integration Windows validation passed clean install, strict TypeScript,
zero-warning ESLint/architecture (309 handwritten modules), formatting and 280
tests in 63 files. All 31 focused exit/owner/observer/cleanup regressions passed.
Forge packaging passed; both actual macOS activation cases were discovered and
explicitly skipped locally. Original `b2fff47` receipt hashes match their CI files.
Fresh macOS compilation, cooperative source setup and complete capture/activation
remain required; no runtime qualification is claimed from this Windows host.
