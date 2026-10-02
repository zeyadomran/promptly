# SQLite storage

P04 uses the SQLite built into Node in a dedicated `worker_threads` worker. No
native npm binding or Electron ABI rebuild is required. The production database
is `promptly.sqlite` in `app.getPath('userData')`. Renderer code receives the
existing named bridge methods; it cannot select database paths or send SQL.

## Transactions and durability

`StorageContext` opens SQLite with foreign keys, a five-second busy timeout, WAL,
and `synchronous=FULL`. All pending versioned migrations execute in one transaction,
including `user_version`; failures roll back schema and data changes. Future
schema versions are rejected rather than overwritten.

The worker owns the only connection and executes messages sequentially. Every
mutation increments the persisted metadata revision in its transaction, validates
the complete response before commit, and attaches a change event only after
commit. Reads and failed mutations do not increment it. On startup main seeds the
IPC subscription handshake with the reopened revision. The client publishes
committed events before resolving the corresponding request.

Startup and ordinary requests have 10-second and 30-second deadlines. Shutdown
immediately rejects new calls, then drains accepted requests under their existing
deadlines, without resetting or shortening them. Only after every accepted request
settles does it send close, with a separate five-second deadline. Drain plus close
is bounded by the remaining request budget plus five seconds (at most 35 seconds).
Closing during startup waits for its remaining ten-second deadline before the
five-second close phase. Timeout or worker exit rejects pending requests and any
drain waiter, stops the worker, and prevents further requests. Successful shutdown
closes SQLite and terminates the thread. If a worker fails after a commit but
before its reply, the caller must
reopen/query authoritative data rather than assume its write did not commit.
The ordinary queue is capped at 1,000 pending requests. The close control phase
begins only after that queue is empty; it never aborts valid writes merely because
their durable SQLite transactions take longer than five seconds in aggregate.

`createQuitCoordinator` in `src/main/lifecycle/quit-coordinator.ts` guards the
application's `before-quit` lifecycle. It prevents every quit event while cleanup
is pending, starts cleanup only once, and permits the final reentrant quit only
after cleanup settles. Failed cleanup is reported before that final quit. Later
native services can compose their bounded cleanup with `storage.close()` through
the same coordinator rather than maintain independent quitting flags.
Combined cleanup must await every resource's settlement, for example with
`Promise.allSettled`, so one failure cannot release another pending cleanup.

## Main service interfaces

`StorageClient(workerFile, databaseFile, onChange)` exposes `ready: Promise<number>`,
`call(operation, input)` with typed validated results, and idempotent `close()`.
`storageDesktopServices(client)` installs snippet/tag CRUD, duplicate, delete/undo,
tag relations, tag merge, and list queries. Missing native capture and clipboard
operations continue to return `UNAVAILABLE`. P05's separate main settings service
connects durable preferences and reversible native effects; see [settings](settings.md).

Main-only commands include:

- `captureSnippet({text, sourceApp, sourceAppId})`: raw, full capture text. Blank
  text returns `empty` without a mutation. P11 capture orchestration normalizes
  exactly once before submitting this command; P08/P09 adapters retain raw text.
- `recordSuccessfulCopy({id})`: atomically increments count and stamps the copy
  time. A later clipboard service calls this only after its clipboard write
  succeeds. P04 does not claim a successful clipboard action.
- `clearLibrary({})`: deletes snippets/tags and clears undo state while preserving
  preferences. The destructive renderer workflow belongs to P23.
- `getRevision({})`: authoritative persisted revision.

P05 extends `storageOperations` and `StorageEngine` with `getSettings` and
`updateSettings` for the existing `settings(key, value)` table. Settings transactions
share the global revision and publish only `settings` invalidations after commit.
Main serializes reversible native effects before the commit, and drains those
accepted effects/commits before storage closes through `closeSettingsStorage`.

## Identity, queries, and undo

Capture matches SHA-256 **and exact SQLite text equality**, then chooses the most
recent `updatedAt`, breaking ties by ascending UUID. Recapture preserves ID, creation
time, tags, and copy statistics while updating recapture time. If both capture source
fields are null, it preserves the existing provenance. When either field is available,
it replaces the complete source pair, including nulls, so a new display label cannot
inherit another application's identifier. An identifier-only capture clears the old
display label rather than attach it to a different identity. Explicit
Duplicate always creates a new UUID, copies tags/source, uses new timestamps, and
resets copy statistics. Renderer create/edit cannot supply source metadata.

List queries support AND tag IDs, untagged intersection, pagination, and all four
sorts with ascending UUID ties. Recently copied places nulls last. Any nonempty
text query uses P14's worker-owned folded substring snapshot and inline parser.
See [search semantics and indexing](search.md) for Unicode, punctuation, range,
invalidation, pagination and benchmark boundaries.

SQLite retains snippets as full TEXT. String reads use `CAST(... AS BLOB)` and UTF-8
decoding because Node 22's SQLite TEXT conversion truncates embedded NULs. Exact
capture comparison still uses the stored full text. P14 must test SQLite
`length`, `lower`, LIKE/FTS and tokenizer behavior for NULs, Unicode, one/two-character
queries, and literal punctuation; its real-runtime evaluation tests select the
in-memory path, which preserves the full decoded text.

Delete stores main-owned opaque UUID snapshots only after commit. Undo lasts
30 seconds, consumes a token only after a successful restoration, and is bounded
to 100 entries/8 MiB. It does not survive relaunch. Missing/expired tokens return
`NOT_FOUND`; an existing snippet ID or deleted tag returns `CONFLICT`. Clear-all
invalidates every token after its transaction commits. A renamed/recolored tag
restores its current metadata rather than resurrecting old tag state.

## Verification evidence

On Windows, Electron 44.5.1's actual worker loaded embedded Node 24.21.0/SQLite
3.53.4. Tests exercise temporary real databases, migration rollback/reopen,
foreign keys, exact Unicode/multiline/long/NUL text, deterministic recapture,
deliberate duplicate, sorted queries, tag transactions, bounded undo, and failed
copy-statistics writes. Worker tests cover 100 concurrent captures, 50 concurrent
copy-statistics commits, ordered publication, reopen, drain, crashes, startup
failure, and bounded shutdown.
Shutdown tests retain all 1,000 saturated-queue commits and the exact reopened
revision/count assertions. Controlled main-process clocks with an actual locked
SQLite worker verify that the five-second control deadline cannot cut short an
accepted write; stuck-worker fixtures verify the 30-second drain and separate
five-second close deadlines without relying on slow wall-clock sleeps.

`npm run check`, `npm run package`, and `npm run test:smoke` are the validation
commands. The smoke suite loads the real worker from the packaged asar on both
Windows and macOS CI, using an isolated temporary database; it verifies full text,
deduplication, and durable revision reopen. A separate real-storage IPC fixture
tests two live windows, commit invalidations, missing-service errors, opaque undo,
and the reopened subscription handshake. These fixtures are not production hooks.
Local Windows smoke passed; macOS proof comes from the PR's CI run, not a local claim.
