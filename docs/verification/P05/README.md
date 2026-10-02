# P05 settings verification

Run `npm ci`, `npm run check`, `npm run test:design`,
`npm run test:packaged-design`, `npm run package`, and `npm run test:smoke`.
CI runs these checks on Windows and macOS. Local evidence is Windows x64; macOS
results must come from CI.

Unit tests use temporary real SQLite databases for durable defaults, upgrade from
schema 1, legacy hide booleans, all preference fields, independent mode bounds,
reopen/revision continuity, strict invalid patches/timing, failed writes, corrupt
JSON/values, and pin-dependent versus explicit hide policy. Injected controller
tests exercise partial native failures, SQLite trigger rejection, rollback/retry,
conflicting serialized updates, unavailable services, and accepted-effect shutdown
drain. Lifecycle tests ensure a drain failure still waits for database close.
Renderer subscriber tests cover handshake races, stale responses, bounded retry,
and disposal. Bootstrap and accelerator syntax tests reject malformed inputs.
Fake-timer Dock tests cover stalled startup, accepted settings/shutdown drain at
the native deadline, late show compensation after rollback, and late rejection
handling. A SQLite trigger regression verifies a first rollback failure is attempted
once, retains the durable revision, and quarantines all subsequent mutations.

`settings.spec.ts` starts the actual production renderer three times (labeled
main/settings/toast test roles) with sandboxed preload, the production IPC/window
factory, SettingsService, actual SQLite worker, and real native theme/pin adapters.
It verifies all three DOM themes/CSS/native pin values, an injected native failure
after actual theme/pin changes, strict invalid timing, missing tray rejection,
reload, durable reopen, and synchronous persisted initial snapshots. These are
test roles using the current shell; later issues own final settings/toast screens
and the toast's non-activating native lifecycle. Test fixtures never change this
machine's login registration, sign a build, or install capture/clipboard adapters.

The packaged design suite verifies unchanged nonce/CSP handling, Sonner and Radix
styles, blocked unauthorized styles, and fresh session nonces. Existing smoke
tests continue to cover preload isolation, untrusted frames/windows, worker
packaging, durable snippets/tags/revisions, and the raw development URL.

Native login/Dock implementations use the actual Electron APIs with readback, but
these tests intentionally avoid changing the host's login/Dock configuration.
Tray creation and OS accelerator registration remain unavailable pending their
own issues; stored defaults are not operational proof. No full settings screen,
window move/resize tracking, capture, or clipboard feature is claimed by P05.

Local Windows validation on 2026-10-02: clean install (0 audit vulnerabilities),
strict checks with 126 passing tests, 2 Chromium design tests, 1 packaged CSP test,
packaging, and all 7 Electron smoke tests passed. The settings test additionally
passed after strengthening the reload bootstrap assertion. Registry metadata
reported every direct dependency current except the documented TypeScript 6.0.3
compatibility exception (latest 7.0.2); no dependency pins or strict rules changed.

Standards review follow-up: strict checks now pass 130 tests, including stalled
Dock/late completion and first rollback failure regressions. Packaging, the
packaged CSP test, and all 7 Electron smokes passed again. Packaged tests use
fresh temporary profiles and verify `app.getPath('userData')` matches that profile,
so schema migration tests never share a user's live preference database.
