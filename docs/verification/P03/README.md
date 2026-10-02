# Owned native fixture lifecycle evidence

[Native CI run 36987596615](https://github.com/zeyadomran/promptly/actions/runs/36987596615),
Windows job 110776066658 at main `2b5fa20f0fd3f41bb0da6b5ab48e9ae71dc6b1ac`,
failed with a generic readiness `AbortError`. Its [filtered original failure excerpt](native-36987596615-windows-failure.txt)
is retained. That run recorded neither child exit nor stderr bytes, so its
underlying trigger remains unknown; it has not been rerun to replace the failure.

[Astra's independent reproduction](https://github.com/zeyadomran/promptly/issues/27#issuecomment-5948800025)
identified distinct lifecycle defects: exit42 was reported only as a five-second
timeout, a missing executable raised uncaught ENOENT, and close resolved before
observed process termination. Before the fix, a minimal owned Node subprocess
exit reproduced the generic `AbortError` at 5,017.92 ms without any receipt.

The follow-up was built from current main
`f2d90ba9d23b27a8a28d76006254e5a5c90845df`. Local clean installation and strict
type/lint/format/architecture checks passed, with 238 tests including 25 lifecycle
regressions. They exercise actual owned Node subprocesses for early exit42, missing
executable, malformed/wrong-PID/oversized metadata, silent five-second timeout,
observed/idempotent close and forced termination. Controlled event/identity seams
cover stream errors/closure, late events, cleanup timeout and stale macOS PID
sidecar refusal. A pipe EOF can precede the exit event: its failure remains
`outputClosed`, with the final observed exit42 recorded after cleanup, rather than
misreporting a timeout.

The Windows framework compiler and native protocol safety lane passed (21 malformed
options rejected before native access; 16 escaped payload boundaries). The actual
isolated Windows fixture lane passed all three modes and ten samples per mode,
with observed child-close receipts. Its [safe local lifecycle receipt](fixture-lifecycle-windows-local.json)
contains no raw selection or child output. These are disposable feasibility
timings, not production capture-to-toast or search qualification.

macOS compilation and actual LaunchServices ownership/termination require fresh
CI on the reviewed head; Windows tests do not establish those behaviors. No
production deadlines, permissions, signing, user profiles or performance gates
were changed. The original CI trigger remains unproven after this harness fix.

[Native CI 36994811590](https://github.com/zeyadomran/promptly/actions/runs/36994811590)
at `51478b94f07e1f25ce71c9f88893633c8847d15f` passed the actual macOS fixture
lane and ownership-verified cleanup. Windows selected-mode readiness still
failed: a live child produced zero stdout/stderr bytes at 5,001.55 ms, then its
SIGTERM close was observed at 5,031.55 ms. The [failed Windows receipt](fixture-lifecycle-51478b9-windows-failed.json)
and [successful macOS receipt](fixture-lifecycle-51478b9-macos.json) are retained.
The separate foundation matrix passed both OSes; there was no observed unit-test
worker leak in that run.

The next delta adds fixed, flushed Windows startup-stage markers and bounded safe
decoding into lifecycle receipts. It preserves WPF window/show/focus/timer behavior
and the five-second readiness deadline; explicit metadata flushing makes the
write boundary observable. Four additional decoder regressions cover split
frames, raw/unknown output rejection, byte and stage-count bounds. The existing
silent-subprocess timeout regression now proves known stage retention on failure.
The location and cause of the actual Windows startup stall remain unresolved
until the new stage evidence is available; this is diagnostic instrumentation,
not a claim of startup qualification.

The [local stage receipt](fixture-lifecycle-windows-startup-stages-local.json)
verifies that all three actual owned Windows fixtures emit decoded main/WPF,
shown, readiness and timer stages, with ten capture samples each and observed
termination. Local startup was 321–417 ms; this instrumentation check does not
reproduce or explain the CI stall. Fresh unchanged-deadline CI is the next signal.
