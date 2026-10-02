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
type/lint/format/architecture checks passed, with 232 tests including 19 lifecycle
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
