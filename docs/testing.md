# Test policy

CI uses functional service tests, strict static checks and actual Windows/macOS packaging. There is no automated GUI or native E2E suite. Each base flow has one canonical functional definition; extend that flow when behavior changes. Add a separate case only for distinct logic that the flow cannot exercise. Shared functional tests run once on Windows CI; both OS jobs check and package the application.

Keep application modules real and observe public service outcomes. Use a real owned SQLite database for persistence and reopen it to verify durable state. Inject external OS, time or database failure boundaries when necessary; avoid private-method, call-count and own-module mock assertions. Keep temporary files isolated and close owned providers/databases before deletion.

## TDD

For new behavior, agree on its public seam and work one red-to-green vertical slice at a time: write one failing behavioral test, then implement only enough to pass it. Consolidating existing coverage is not a new red/green claim. Keep expected results independently specified rather than derived from implementation details.

## Current functional coverage

| File | Canonical behavior |
| --- | --- |
| `search/search-library.test.ts` | Real-worker AND/filter/sort/pagination, literal highlights and committed invalidation |
| `renderer/features/library/library-model.test.ts` | Paged browsing, command-eligible selection and revision/query reconciliation |
| `main/copy/service.test.ts` | Authoritative copy/Markdown, durable statistics, external clipboard/database failure and entered-write retirement |
| `renderer/features/library/library-command-service.test.ts` | Partial-success copied feedback and read-only refresh without IPC replay |
| `renderer/features/library/library-keyboard.test.ts` | Scoped navigation/copy, editor/IME/overlay ownership and clear-then-hide |
| `storage/library-flow.test.ts` | Real database create/tag/edit/duplicate/delete/undo, JSON and Markdown export, clear/import and reopen |
| `storage/transfer/import-safety.test.ts` | Invalid import rejection and atomic collision/membership handling under an external SQLite write failure |
| `settings/service.test.ts` | Successful preference save/reopen and rejected native-effect rollback |
| `windows/visibility.test.ts` | Reachability when an external recovery route appears or disappears |
| `platform/native/native-process.test.ts` | Hung external provider deadline and retired-process rejection |
| `platform/macos/macos-selection.test.ts` | Forged and retired source identity rejection at the adapter boundary |
| `shortcuts/double-tap.test.ts` | Completed physical modifier taps and cancellation by intervening input or a hold |
| `shortcuts/transactions.test.ts` | Rejected OS binding replacement preserves authoritative preferences and the previous live command |
| `renderer/features/shortcuts/recording-session.test.ts` | Recorder suppression, validated key events, modifier release before commit, cancellation and stale acquisition retirement through fake IPC |
| `shortcuts/session-shutdown.test.ts` | A late native resume cannot revive commands after accepted shutdown |

Add functional coverage when its behavior is implemented; absent features have no placeholders. Native provider fixtures are controlled external Node processes, not proof of actual OS capture or activation. Do not add stress, screenshot matrices, performance gates or diagnostic frameworks unless explicitly requested. Failures in retained functional behavior block merging.

## Manual release checks

Before qualifying a release, use a packaged application with a fresh owned profile on each supported OS and verify:

- Shell rendering, offline assets, theme, CSP/sandbox/IPC rejection and keyboard focus.
- Window mode/geometry/pin, hide/reactivate/second launch, reachable recovery, quit, multi-monitor and fullscreen behavior.
- Settings persistence, native login/Dock/permission outcomes and responsive navigation.
- Native chooser/reveal and library transfer UI; actual global shortcut delivery, physical modifier recognition, owned selection capture and source activation.

Native preferences must be captured before application initialization and restored/read back after shutdown. Verify owned process death before deleting profiles; retain the tree if death is unverified. Use only owned selection/input/clipboard fixtures, never a user's data or desktop application. These checks are manual qualification work, not a replacement automated fixture framework.

## Historical qualification

Historical receipts and failure reports remain under `docs/`. Removing E2E, repeated native variants, 10k/50 ms benchmarks and tracing does not fix their failures or qualify performance, permissions, physical input, assistive technology, fullscreen or multi-monitor behavior. The native capture deadline remains 100 ms. The Windows helper MTA correction aligns UI Automation threading guidance; its effect on earlier hosted capture timeouts is unproven. Functional CI verifies service behavior and package construction, not OS delivery or a complete capture-save-copy product.
