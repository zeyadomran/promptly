# Test policy

CI uses functional service tests, strict static checks and actual unsigned Windows x64 installer construction. There is no automated GUI or native E2E suite. Each base flow has one canonical functional definition; extend that flow when behavior changes. Add a separate case only for distinct logic that the flow cannot exercise. Functional tests run once on Windows CI, alongside static checks and packaging.

Keep application modules real and observe public service outcomes. Use a real owned SQLite database for persistence and reopen it to verify durable state. Inject external OS, time or database failure boundaries when necessary; avoid private-method, call-count and own-module mock assertions. Keep temporary files isolated and close owned providers/databases before deletion.

## TDD

For new behavior, agree on its public seam and work one red-to-green vertical slice at a time: write one failing behavioral test, then implement only enough to pass it. Consolidating existing coverage is not a new red/green claim. Keep expected results independently specified rather than derived from implementation details.

## Current functional coverage

| File | Canonical behavior |
| --- | --- |
| `search/search-library.test.ts` | Real-worker AND/filter/sort/pagination, literal highlights, committed reply/publication isolation and durable reopen |
| `renderer/features/snippets/snippet-session.test.ts` | Dirty draft cancellation/application, missing/imported data and stale selection reads |
| `renderer/features/library/library-model.test.ts` | Paged browsing, command-eligible selection and reveal clearance, typed search debounce and revision/query reconciliation |
| `main/copy/service.test.ts` | Authoritative copy/Markdown, durable statistics, external clipboard/database failure and entered-write retirement |
| `main/tray/coordinator.test.ts` | Updated recent items, authoritative main-owned copy routing, capture-only pause, reversible tray visibility and retired native-menu ownership |
| `main/capture/service.test.ts` | Native Windows selection through real SQLite, conservative normalization, exact recapture, suppression/clear/import cancellation, pre-deferral admission and entered-save retirement |
| `main/onboarding/coordinator.test.ts` | Real practice capture, durable completion/reopen, unsupported recovery and Skip/owner retirement without fabricated data |
| `main/capture-toast/service.test.ts` | Committed confirmation replacement, validated open/focus activation, preferences/display placement, main-owned fade/deadline and retirement during asynchronous window creation |
| `renderer/features/library/library-command-service.test.ts` | Partial-success copied feedback and read-only refresh without IPC replay |
| `renderer/features/library/library-keyboard.test.ts` | Configured local commands/cancel, scoped navigation/copy, native typing/activation, editor/IME/overlay ownership and clear-then-hide |
| `storage/library-flow.test.ts` | Real database create/tag/edit/duplicate/delete/undo, JSON and Markdown export, clear/import/reopen, tag rename/collision/atomic membership merge and tag-only deletion |
| `main/snippets/tag-picker.test.ts` | Shared picker all-tag choices, assigned-first and catalog ordering, creation/reuse, atomic membership changes, revisions and captured-target lifetime through real SQLite |
| `storage/transfer/import-safety.test.ts` | Invalid import rejection and atomic collision/membership handling under an external SQLite write failure |
| `settings/service.test.ts` | Legacy defaults, durable local/global preference changes and conflict rejection, rejected native-effect rollback and uninstall login cleanup without changing retained preferences |
| `settings/startup-effects.test.ts` | Optional native startup failure retains requested preferences, exposes unavailable controls and permits unrelated durable changes |
| `storage/startup-failure.test.ts` | Real worker rejects damaged, corrupt-preference and newer databases with safe visible causes while retaining owned file bytes |
| `lifecycle/failure-recovery.test.ts` | Dead worker rejects commands without replay, retires commands before explicit restart/quit and preserves bounded cleanup ownership |
| `settings/application-services.test.ts` | Running app version, authorized fixed repository opening, malformed URL rejection and external browser failure through desktop operations |
| `windows/visibility.test.ts` | Recorder focus and owner release through real shortcuts, suspended command dispatch, restored open command and reachability on genuine route loss |
| `platform/native/native-process.test.ts` | Hung external provider deadline and retired-process rejection |
| `shortcuts/double-tap.test.ts` | Completed physical modifier taps, input/hold cancellation, real external helper resync/death/readiness recovery, retry bounds and recorder/sleep/close ownership |
| `shortcuts/transactions.test.ts` | Legacy global binding startup, atomic shortcut defaults/reset/reopen with retained unrelated settings/data, and rejected OS replacement preserve authoritative preferences and previous live bindings |
| `renderer/features/shortcuts/recording-session.test.ts` | Recorder suppression, logical/numpad/local key mapping, Escape recording and Tab exit, key release before commit, cancellation and stale acquisition retirement through fake IPC |
| `shortcuts/session-shutdown.test.ts` | A late native resume cannot revive commands after accepted shutdown |

Add functional coverage when its behavior is implemented; absent features have no placeholders. Native provider fixtures are controlled external Node processes, not proof of actual OS capture or activation. Do not add stress, screenshot matrices, performance gates or diagnostic frameworks unless explicitly requested. Failures in retained functional behavior block merging.

## Manual release checks

Before qualifying a release, use a packaged application with a fresh owned profile on Windows x64 and verify:

- Shell rendering, offline assets, theme, CSP/sandbox/IPC rejection and keyboard focus.
- First-launch onboarding, actual selection in its readonly practice prompt, real saved/duplicate confirmation, Back/Skip/restart and NVDA accessibility.
- Window mode/geometry/pin, hide/reactivate/second launch, reachable recovery, quit, multi-monitor and fullscreen behavior.
- Settings persistence, native login/permission outcomes and responsive navigation.
- Native chooser/reveal and library transfer UI; actual global shortcut delivery, physical modifier recognition, owned selection capture and source activation.
- Unsigned install/upgrade/uninstall and database preservation, using [the release guide](releasing.md).
- Windows tray visibility, taskbar theme/DPI icons, pause/resume, recent-item full-text copy, recovery after hiding and complete Quit drainage.

Native preferences must be captured before application initialization and restored/read back after shutdown. Verify owned process death before deleting profiles; retain the tree if death is unverified. Use only owned selection/input/clipboard fixtures, never a user's data or desktop application. These checks are manual qualification work, not a replacement automated fixture framework.

Performance measurements and budgets are skipped for this pass by the [latest user decision](https://github.com/zeyadomran/promptly/issues/30#issuecomment-5963023552). Distribution checks remain required. Historical timing/RSS evidence is retained without a performance-pass claim; production bounded timeouts and correctness, native safety, clipboard and accessibility requirements are unchanged.

## Historical qualification

Historical receipts and failure reports remain under `docs/`. Removing E2E, repeated native variants, 10k/50 ms benchmarks and tracing does not fix their failures or qualify performance, permissions, physical input, assistive technology, fullscreen or multi-monitor behavior. The native capture deadline remains 100 ms. The Windows helper MTA correction aligns UI Automation threading guidance; its effect on earlier hosted capture timeouts is unproven. Functional CI verifies service behavior and package construction, not OS delivery or a complete capture-save-copy product.
