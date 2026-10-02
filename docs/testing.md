# Test policy

Each base app flow has one canonical smoke definition. Extend that flow when behavior changes. Add a lower-level case only for distinct logic that the smoke cannot practically exercise. Shared smoke definitions run on both supported operating systems; shared logic runs once on Windows CI.

Keep the suite small. Stress tests, repeated visual matrices, performance qualification and diagnostic frameworks require an explicit request. Essential failures in the retained actual flows block merging.

## TDD

For new behavior, agree on its public seam and work one red-to-green vertical slice at a time: write one failing behavioral test, then implement only enough to pass it. Observe results through public interfaces. Inject external OS, time or database boundaries when needed; keep application collaborators real and avoid private-method or call-count assertions. Consolidating existing tests is not a new red/green claim.

## Current suite

Eight smoke definitions cover the implemented base app:

| File | Flow owner |
| --- | --- |
| `foundation.spec.ts` | Packaged shell, offline assets, CSP, sandbox and rejected IPC |
| `window-lifecycle.spec.ts` | Window modes, geometry, pin, reachability and quit |
| `settings-preferences.spec.ts` | Preference persistence, native outcome, responsive focus and return to main |
| `storage-packaged.spec.ts` | Snippet/tag CRUD, duplicate/delete/undo, export/clear/import and restart |
| `shortcut-delivery.spec.ts` | Actual hosted OS shortcut callbacks persist pin and hide/show the owned app |
| `windows-selection.spec.ts` | Ordinary owned Unicode selection through the production Windows adapter |
| `macos-selection.spec.ts` | Ordinary owned selection and return to the saved source |
| `startup-failure.spec.ts` | Owned unsupported database, fatal exit and observed process death; Windows only |

Eight Node logic cases cover real-worker search/filter/sort/pagination and committed invalidation, import atomicity/colliding tag memberships, rejected native Settings effects, hung provider retirement, forged/retired macOS source identities, completed physical modifier taps, shortcut registration rollback and shutdown invalidation of a late resume. There are 16 authored cases and 21 platform executions: five shared smokes on both OSes, one native smoke per OS, one fatal-startup smoke on Windows, and eight logic cases once.

The actual shortcut flow uses fixed owned input on GitHub-hosted runners only;
local skips do not qualify native delivery. macOS fixture K/J delivery remains
required in CI, with Windows F11/F10 unchanged. Absent features have no
placeholders. When the real library UI is implemented, replace overlapping
worker-flow coverage instead of duplicating it.

## Owned runtime boundary

Packaged smokes use a private copy with the production main, preload, renderer and storage worker. They use canonical fresh profiles and preserve framework symlinks. Local runs substitute only login and Dock preference application before loading production startup; they do not qualify actual native preferences. Hosted ephemeral Windows/macOS runners capture native preferences before initialization, restore/read back after production drain, and retain receipts before deleting profiles. Native chooser completion is substituted only in the storage flow.

Close all owned processes and observe death before removing their directories. Retain the owned tree and fail cleanup when death is unverified. Keep primary and cleanup failures together. Native selection uses only owned fixtures and retains the production 100 ms deadline. Raw selection text, source tokens and user data stay out of receipts.

## Historical qualification

Historical receipts and failure reports remain under `docs/`. Removing duplicate matrices, the 10k/50 ms search gate, repeated native variants and tracing infrastructure does not resolve their failures or qualify their performance, permissions, physical input, assistive technology, fullscreen or multi-monitor behavior. Those qualifications remain open. The minimal suite verifies implemented base functionality, not a complete capture-save-copy product.
