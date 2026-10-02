# Settings persistence and effects

SQLite's worker-owned `settings(key, value)` table is the sole preference authority.
Schema migration 2 persists typed defaults, fills missing keys without replacing
explicit values, and migrates legacy boolean hide-after-copy overrides. Invalid
stored JSON or invalid recognized values fail startup with an actionable recovery
error rather than silently overwriting preferences. Unknown rows are retained for
forward-compatible data preservation; newer database schema versions still fail.

Defaults are System theme, Compact startup, pin off, normalization and confirmation
toast on, Shift double-tap at 300 ms, Alt+Space (the macOS Option key), no pin
shortcut, login off, tray/dock requested on, and onboarding incomplete. The
`automatic` hide-after-copy policy follows the persisted shared pin value. `always`
and `never` remain explicit overrides. `shouldHideAfterCopy` is a pure policy helper;
P17 must call it only after a successful clipboard write and statistics commit.

`rememberedBounds` holds independently validated Compact and Regular rectangles.
Saving geometry never changes `defaultSizeMode`, which selects the next startup
mode. P13/#14 owns resize/move tracking, display-aware positioning, and mode
switching; it must submit remembered rectangles through `SettingsService`, rather
than access storage directly or turn every resize into a new startup preference.
The initial window uses the selected mode's stored bounds and pin value. Renderer
preferences do not expose arbitrary window commands.

## Immediate updates and native availability

The named `getSettings` and nonempty strict `updateSettings` bridge methods return
validated settings snapshots with the shared durable revision. Updates serialize
in one main-process service: read SQLite, validate a complete candidate, apply
changed native controllers, commit the settings transaction, then expose the
committed bootstrap snapshot. The worker publishes a `settings` invalidation only
after commit. Reads and rejected updates leave the durable revision unchanged.
All renderers refetch authoritative snapshots through `createSettingsClient` and
`useSettings`; stale responses, the subscription handshake, reload, and disposal
are handled without a second authoritative store. P20/#21 supplies the controls.

Native controllers explicitly declare their keys and reversible `apply(settings)`
operation. A rejected operation must allow `apply(previous)` to restore any
partial effect. On an effect failure or rejected SQLite transaction, all attempted
controllers receive the last working snapshot; rollback waits for every result,
including synchronous failures. A rollback failure reports a restart/recovery
error rather than claiming the previous OS state was successfully restored.
Further mutations remain unavailable until restart after a rollback failure.
Controller implementations must use bounded native deadlines; synchronous
Electron APIs and a five-second Dock show deadline are wired today. The uncancelable
native show promise is still observed after timeout; its late completion reconciles
visibility to the latest controller target, including a rollback to hidden. Late
recovery errors are reported and the Dock controller refuses further changes.
Effect and commit rejection share one rollback path; any first rollback failure
quarantines mutations immediately and is never retried automatically.

Real adapters set native theme/window backgrounds, pin existing windows with
verification, and login registration with readback. macOS additionally uses the
Dock show/hide APIs with visibility readback. Windows Dock changes return
`UNAVAILABLE`. Tray visibility returns `UNAVAILABLE` until P24/#26 injects its
controller. P07/#9 supplies the real reversible shortcut controller, with actual
OS registration, duplicate detection and rollback quarantine. Stored defaults are
requested configuration, not proof of a tray or registered shortcut. Timing
150–600 ms, toast, normalization, onboarding, hide policy, and startup mode are
validated durable configuration. The shortcut controller consumes timing updates
and resets recognition; P11 must consume normalization/toast preferences.
Accelerator validation checks syntax before the controller verifies registration.
No native capture or clipboard success is synthesized here.

If the worker dies after SQLite commits but before replying, the outcome cannot
be inferred from the missing reply. Restart/reopen the authoritative database to
reconcile preferences, as with other storage commands. A healthy SQLite rejection
is an uncommitted transaction and supports immediate rollback.

## First paint and shutdown

Main reads and validates persisted settings, applies `nativeTheme.themeSource`,
and initializes native effects before constructing/showing its first window.
The existing restricted file handler injects a validated `data-theme` into the
entry HTML before CSS loads while retaining the per-session cryptographic nonce
and path allowlist. No inline script or relaxed CSP is introduced. Preload receives
a validated initial snapshot through app-owned arguments. Production additionally
uses one fixed synchronous bootstrap IPC endpoint to obtain the latest committed
snapshot before each renderer/reload runs; it reads only main's derived snapshot,
never SQL, and enforces the same registered main-frame/exact-URL authorization.
That channel is never exposed to renderer code. `applyTheme` runs before React,
and one settings/theme owner per renderer handles subsequent committed updates.
System observes native OS changes; explicit themes override them.

`SettingsService.close()` synchronously rejects new requests, then drains accepted
initialization, effects, rollback, and database commits. `closeSettingsStorage`
waits for that drain before closing the worker, including cleanup failure paths.
`createQuitCoordinator` prevents all quit events until cleanup settles. Native
services may dispose concurrently with the settings/storage chain only if disposal
does not invalidate a controller needed by accepted settings work. Use
`Promise.allSettled` for independent cleanup resources; never close SQLite in
parallel with settings drain. Controllers should stop accepting external work
first, drain settings, and then release resources required by their apply/rollback.

Primary native API references: [theme](https://www.electronjs.org/docs/latest/api/native-theme),
[application login and Dock](https://www.electronjs.org/docs/latest/api/app), and
[accelerator syntax](https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts/).
