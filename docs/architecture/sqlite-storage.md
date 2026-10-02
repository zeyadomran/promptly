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

Startup, requests, and shutdown have 10-second, 30-second, and five-second limits.
Timeout or worker exit rejects pending requests and stops the worker. Shutdown
drains submitted writes, rejects new calls, closes SQLite, and terminates the
thread. If a worker fails after a commit but before its reply, the caller must
reopen/query authoritative data rather than assume its write did not commit.
The ordinary queue is capped at 1,000 pending requests; shutdown reserves one
control slot so a saturated queue can drain within the same five-second deadline.

## Main service interfaces

`StorageClient(workerFile, databaseFile, onChange)` exposes `ready: Promise<number>`,
`call(operation, input)` with typed validated results, and idempotent `close()`.
`storageDesktopServices(client)` installs snippet/tag CRUD, duplicate, delete/undo,
tag relations, tag merge, and list queries. Missing native capture, clipboard,
and settings operations continue to return `UNAVAILABLE`.

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

P05 can extend `storageOperations` and `StorageEngine` handlers for the existing
`settings(key, value)` table and reuse `StorageContext.transaction` and its revision.
It must coordinate OS side effects/rollback in its main service. Settings service
commands should publish `settings` invalidations after committing.

## Identity, queries, and undo

Capture matches SHA-256 **and exact SQLite text equality**, then chooses the oldest
`createdAt`, breaking ties by ascending UUID. Recapture preserves ID, creation time,
tags, and copy statistics while updating recapture time/source metadata. Explicit
Duplicate always creates a new UUID, copies tags/source, uses new timestamps, and
resets copy statistics. Renderer create/edit cannot supply source metadata.

List queries support AND tag IDs, untagged intersection, pagination, and all four
sorts with ascending UUID ties. Recently copied places nulls last. Any nonempty
text query returns `UNAVAILABLE`; P14 owns text/inline-filter parsing and indexing.
The main repository query method is ready for that extension.

SQLite retains snippets as full TEXT. String reads use `CAST(... AS BLOB)` and UTF-8
decoding because Node 22's SQLite TEXT conversion truncates embedded NULs. Exact
capture comparison still uses the stored full text. P14 must test SQLite
`length`, `lower`, LIKE/FTS and tokenizer behavior for NULs, Unicode, one/two-character
queries, and literal punctuation before claiming complete substring search.

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

`npm run check`, `npm run package`, and `npm run test:smoke` are the validation
commands. The smoke suite loads the real worker from the packaged asar on both
Windows and macOS CI, using an isolated temporary database; it verifies full text,
deduplication, and durable revision reopen. A separate real-storage IPC fixture
tests two live windows, commit invalidations, missing-service errors, opaque undo,
and the reopened subscription handshake. These fixtures are not production hooks.
Local Windows smoke passed; macOS proof comes from the PR's CI run, not a local claim.
