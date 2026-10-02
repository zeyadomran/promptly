# CI fixture observation and ownership

The Settings keyboard test now waits for actual renderer width and tab orientation
at 639/640px before sending the corresponding arrow key. It asserts the Tags tab
keeps focus and the same DOM node across resizing, without refocusing it. Storage
focus and selection assertions remain required. The owned Windows case passed in
3.8s, using real renderer/IPC/storage and substituted host preference operations.

Fatal startup uses the actual packaged executable in an immediately observed owned
subprocess with a fresh canonical profile and unsupported SQLite schema version.
Qualification requires the fixed initialization/storage-open diagnostics, exit 1,
observed close and PID death without forced termination, and unchanged database.
The finally receipt is written under Playwright output before profile deletion;
primary and evidence/cleanup failures remain available together. Production-main
unit assertions verify storage failure reaches neither native preference controllers
nor Settings initialization/window creation.

The successful Windows receipt is retained here. It includes `cleanupFailed`:
storage close rethrows the already failed readiness promise, while the shared fatal
coordinator still exits after cleanup attempts. This qualifies observed fatal exit,
not clean service shutdown. The earlier local receipt is also retained: its failure
was an extra test requirement for a raw unsupported-version diagnostic. Production
intentionally projects that error to `Unable to open local storage.`; the corrected
test requires that actual fixed signal without changing production behavior.

macOS matrix captures and recovery steps retain actual status/timing and owned-PID
match booleans before assertions. They never record text, selection ranges, source
names, or identity tokens. The native capture deadline remains 100ms with no retries
or warmups. This improves evidence for the unresolved recovery timeout; it does not
claim to fix its cause. Original main896 and search7597 failures remain retained by
the coordinator separately.

Worker test fixtures now own every client via `createClient`. Disposal retires the
factory synchronously, attempts all pending closes, awaits them, independently
checks terminal owned Worker thread IDs, and only then removes the directory.
It is idempotent and rejects late reopen attempts from a timed-out body's finally.
Pending cleanup failures are aggregated; already settled expected close rejections
remain checked by their original tests. A deferred-operation timeout regression
proves teardown can finish before body finally while still observing real worker
termination. Ten focused worker cases passed, including the unchanged 100 concurrent
recaptures/50 copy writes and 1,000-write saturation workload.

Both worker suites use an explicit **45-second teardown-only hook budget** covering
the existing 30-second accepted drain, five-second close and termination margin.
The ordinary body deadline remains unchanged. An actual installed-Vitest subprocess
regression retains an intentional 20ms body timeout while a pending close takes 300ms:
the old 100ms hook abandons cleanup; the explicit scaled teardown budget observes
termination and removal. Both child runs still exit 1 for the original body failure.
The two timeout regressions plus the ten existing ownership/workload cases pass.

Vitest serializes files only when `process.env['CI'] === 'true'`; local unset/other
values preserve file parallelism. This is a deliberate CI resource isolation policy
for file-level forks, SQLite workers and Vite builds. It does not establish the cause
of the original timeouts. All test, storage, search and native deadlines are unchanged.

No local native preference, user-profile, clipboard or input-injection qualification
was performed. macOS and hosted CI evidence is still required on the immutable PR.

Final local `CI=true npm run check` passed all strict TypeScript projects, ESLint
with zero warnings, architecture (357 modules), formatting, and 318 tests with one
macOS topology case skipped on Windows (76 files passed, one skipped). Windows
production packaging passed. No unchanged broad suites were rerun after this result.
The subsequent teardown-budget delta is verified by strict types/lint/architecture/
format and the 12 focused tests under `CI=true`; hosted CI runs the complete new head.
