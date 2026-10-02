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
