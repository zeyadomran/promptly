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
