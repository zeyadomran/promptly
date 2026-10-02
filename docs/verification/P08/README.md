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
