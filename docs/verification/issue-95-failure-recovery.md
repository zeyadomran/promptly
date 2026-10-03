# Issue 95: startup and storage recovery

Base: `aa440adaf3575608b2f40190b40738d9485f773a`.

Startup now retains fixed causes for invalid preferences, newer schema versions,
damaged databases and known SQLite access failures. The visible recovery dialog
includes the actual data folder and instructions to quit and retain the database,
WAL and SHM files before backup restoration. Unknown exceptions use fixed text;
SQL, malformed preference values and snippet content are not displayed.

A dead or timed-out worker retires desktop IPC, shortcut and tray commands before
showing one explicit Restart/Quit decision. Restart schedules a fresh process and
uses the existing bounded fatal cleanup. The last operation may already have
committed; nothing is replayed. A normal quit suppresses later restart decisions.
Fatal recovery cancels an optional native preference warning.

Tray and login initialization failures are optional only after persisted settings
validate. They retain the saved requests, quarantine unavailable controls, reject
changes to those keys and permit unrelated settings changes. Startup shows one
fixed warning. Tray availability uses the existing window recovery status. The
login checkbox remains the saved request; startup does not claim OS registration
success. Observe-only login startup and explicit retry remain issue 99's scope.

## Functional evidence

- Extended the existing real-worker search/publication flow: a throwing renderer
  subscriber initially escaped and left a committed write pending until timeout.
  Reply settlement now survives publication failure; another subscriber receives
  the committed revision, and exact updated text survives database reopen.
- The distinct storage startup flow initially returned only "Unable to open local
  storage." It now verifies safe visible causes for owned corrupt-preference,
  newer-schema and damaged files, with unchanged original file bytes.
- No existing flow owned whole-application fatal recovery. Its distinct public
  flow uses a real StorageClient, a controlled external worker and dialog/app
  effects, plus the real bounded shutdown. It verifies immediate command
  retirement, explicit restart, rejection of subsequent storage calls and exit
  only after cleanup settles. The initial implementation had no visible recovery.
- The existing settings flow covers accepted changes and rollback. A distinct
  optional initialization failure flow initially aborted startup; it now verifies
  requested preferences remain durable, unavailable native changes reject and an
  unrelated theme change survives reopen. It does not duplicate accepted-change
  rollback coverage.

`npm run check` passed: strict type checks, lint/architecture, formatting and all
24 functional files / 28 tests. Dependency installation used the current lockfile
and reported zero audit vulnerabilities.

Windows installer construction and independent review are tracked on the PR.
No installed application, user profile, clipboard or native registration was
operated. Functional fixtures do not qualify actual dialog rendering, native
login/tray behavior, accessibility or packaged restart delivery; these remain
bounded manual release checks under the existing policy.
