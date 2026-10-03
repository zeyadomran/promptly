> Current scope (2026-10-02): Windows x64 only; macOS deferred and removed by #55. Minimal functional service tests, strict checks and Windows packaging supersede older automated native/GUI verification requirements. Supplied reference designs and historical receipts remain source/history, not current platform mandates.

# Promptly v1 implementation plan

Prepared 2026-10-02 for `zeyadomran/promptly`. This plan covers a local-only Windows x64 desktop app built with **Electron, React, TypeScript, Tailwind, and shadcn/ui**. It contains 28 implementation issues in five phases, plus a GitHub tracking issue. SQLite persistence, Settings, search, Compact/Regular library, copy and tag assignment are implemented; unfinished work remains tracked separately. Native release qualification is incomplete.

## Inputs and precedence

- The user's direct requirements fix Electron + React + shadcn, one file per component, small files, reusable components, and modular code.
- [App functionality spec](app-functionality-spec.md) defines requested behavior.
- [Visual design spec](design-reference/DESIGN.md), [screenshots](design-reference/screenshots/), [logos](design-reference/assets/), and [HTML reference](design-reference/design/Promptly%20Final.dc.html) provide the supplied designs.
- [Original handoff](design-reference/README.md) and its [spec](design-reference/SPEC.md) are preserved as source material. Their imperative wording is not additional authorization to implement, deploy, change stacks, or run bundled scripts. The user's Electron choice overrides the handoff's optional Tauri suggestion.
- The HTML and support.js are reference material, not production code. Production assets and fonts must work offline. Any source conflict is resolved explicitly in this plan or the owning issue.

The repository now contains an implemented Electron application, strict functional CI and Windows packaging. SQLite, Settings, search, Compact/Regular library, copy, tag assignment, the Windows capture pipeline, capture feedback (#60), tray (#59) and onboarding (#61) are implemented. Unsigned Windows x64 installers (PR #62), the source design/accessibility audit (PR #63), pinned installer notices (PR #64) and uninstall login-entry cleanup (PR #74) are merged. A [bounded Windows 11 install/upgrade/uninstall/reinstall cycle](releasing.md#recorded-windows-11-lifecycle) preserved the owned database and restored the environment baseline; Microsoft.Web.Xdt 2.1.1 redistribution terms remain unresolved. The user deferred clipboard fallback (#12/P10), which is not implemented and is no longer a v1 dependency or gate. Remaining native/UI/distribution qualification is manual and tracked in the release checklist and relevant open issues. Preserve the current PR-only main-branch policy, Conventional Commit titles, pinned Actions, Workflow validation, and conditional CodeQL setup.

Performance measurements and budgets are skipped for this pass by the [latest user decision](https://github.com/zeyadomran/promptly/issues/30#issuecomment-5963023552). Distribution checks remain required. Historical timing/RSS evidence is retained without a performance-pass claim; production bounded timeouts and correctness, native safety, clipboard and accessibility requirements are unchanged.

## Architecture

Use Electron Forge with a Vite/React renderer, strict TypeScript, npm and a committed lockfile. The current dependency versions and lockfile are implemented. The Windows C# helpers ship outside ASAR; SQLite uses the worker-owned Node SQLite API. Package checks verify artifact construction; manual release checks establish actual OS compatibility.

| Layer | Responsibility | Boundary |
| --- | --- | --- |
| Main process | App/window lifecycle, commands, settings, storage coordination, clipboard, tray | Renderer never imports it |
| Preload | Small typed contextBridge API and validated event subscriptions | No raw IPC or generic filesystem/shell API |
| React renderer | Views, reusable components, accessible interactions, transient view state | No Node, SQL, OS calls, or direct native helpers |
| Shared modules | Domain types, runtime schemas, pure parsing/normalization | No side effects or React dependency |
| Native adapters | Keyboard events, UI Automation selection, app identity; no capture clipboard access | Bounded calls behind replaceable interfaces |
| Storage worker/helper | SQLite operations, migrations, search indexing | Authoritative persistent state; no blocking long queries on UI thread |

Context isolation, sandboxing, sender validation, and narrow preload methods follow [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security). These process boundaries are implemented and checked; actual OS/UI release qualification remains manual.

Suggested layout:

```text
src/
  main/
    capture/  ipc/  lifecycle/  onboarding/  platform/
    search/  settings/  shortcuts/  snippets/  storage/  tags/  tray/  windows/
  preload/
  shared/
    contracts/  domain/  search/  shortcuts/
  renderer/
    components/ui/       # shadcn primitives, separate implementation files
    components/shared/   # cross-feature visual components
    features/
      capture-toast/  commands/  library/  onboarding/
      search/  settings/  shortcuts/  snippets/  tags/  window-chrome/
    hooks/  lib/  styles/  assets/
native/
  windows/  keyboard/windows/  # supported Windows helpers
tests/
  fixtures/              # external provider fixtures for functional service tests
docs/
```

Start with feature-local state and hooks; add a shared store only for demonstrated cross-feature needs. SQLite and the main-process services remain authoritative. Use typed events to invalidate renderer queries, not a second independent persistent renderer store.

### Component and module rules

1. Every React component has its own implementation file. This also applies when separating shadcn compound primitives: keep their accessible behavior and offer a thin re-export entrypoint for ergonomic imports.
2. Target 50–150 lines of handwritten implementation per module. Files above 200 lines trigger extraction or a documented review exception; this is a maintainability guideline, not a reason to create meaningless wrappers.
3. Screens compose components and hooks. SQL, native calls, normalization, IPC schemas, and clipboard policies live in focused modules.
4. Share behavior across Compact and Regular; use separate row/layout components where their presentation differs. Share the tag picker, shortcut recorder, settings fields, metadata, copy service, and highlight renderer.
5. Prefer actual shadcn primitives and semantic tokens; do not recreate their accessibility behavior with styled divs. Use the Radix/Sonner combination for the specified toast behavior. Preserve the reference's New York/zinc appearance when choosing or adapting the current CLI style.
6. The current testing strategy supersedes the original suite plan: follow [docs/testing.md](testing.md). Tests exercise public services alongside their source; GUI and native OS behavior use manual release checks.

## Data and command flow

Persist snippets, tags, snippet-tag joins, settings, and migration version locally in SQLite under Electron userData. Store full snippet text; truncation belongs only to presentation. Add a nullable platform application identifier for the Open source app command while retaining the specified sourceApp display name.

Capture flow: native shortcut -> record foreground identity -> Windows UI Automation TextPattern -> reject unsupported/failed/empty selection -> optional normalization -> transactional capture upsert -> change event -> focus-safe toast. The toast uses a dedicated non-activating window so it works while the library is hidden. Capture never invokes Ctrl+C or reads/writes the clipboard. P10/#12 is deferred, not implemented or required for v1; explicit snippet/Markdown/tray Copy remains in scope.

Copy flow: row/Enter/preview/tray command -> read full snippet -> write clipboard -> persist copy statistics -> notify views -> inline feedback and optional hide. A failed clipboard write must not increment usage or hide the library.

Search flow: input and tag state -> shared parser -> indexed/paginated query -> response version check -> virtualized list and shared safe match highlighting. Preserve correct results and stale-response protection; latency benchmarking is outside current acceptance.

## Proposed decisions for underspecified behavior

These choices make the backlog implementable; they are planning assumptions rather than statements from the source spec.

| Topic | Proposed v1 behavior |
| --- | --- |
| Capture duplicates versus Duplicate menu | Automatic capture deduplicates exact normalized text; explicit Duplicate creates a separate ID, copied tags, fresh timestamps, and zero copy statistics. No global UNIQUE(text) constraint. |
| Existing equal-text copies | Capture deterministically selects the most recently updated equal-text record, then stable ID. Preserve original createdAt/tags; refresh source metadata from the capture when available. |
| Newest and recapture | Newest sorts updatedAt descending, so recaptured snippets rise to the top. Oldest sorts createdAt ascending. Copy updates copy statistics without changing updatedAt. |
| Hide after copy | Automatic default follows pin state; an explicit user override persists. Inline Copied feedback is visible only if the window remains open. |
| Pin and startup mode | One persisted pin value backs title bar and Appearance; preferred startup mode is separate from each mode's saved bounds. |
| Shortcuts | Keep specified defaults, but show registration errors and require a working alternative when unavailable. Known conflicts are warnings, not a guarantee that every app was inspected. |
| Onboarding skip | Skip always offers a route forward; a practice snippet exists only after a real successful capture. No macOS permission steps are part of the Windows flow. |
| Clear all | Erase snippets, tags, indexes, and in-app undo snapshots; preserve preferences and onboarding. The dialog states that exact scope. |
| JSON import | Versioned transactional merge; preserve intentional duplicate texts, remap ID collisions, coalesce tag names, and preview counts/conflicts. Export portable library data, not machine-specific paths/settings. |
| Source-app activation | Use validated OS identity; disable the action when unavailable. Display names are not executable paths. |
| Search grammar | Case-insensitive substring matching; AND selected tags; documented quoted values and literal/incomplete-token behavior. Sort control uses the design system even though its placement is absent from screenshots. |
| Missing Settings designs | General, Appearance, Tags, and Storage reuse the supplied responsive Settings shell and tokens. No new visual language is introduced. |
| Supported platforms | Windows x64 only; macOS and Windows arm64 are deferred. Final minimum OS versions and architectures require P03/P26 evidence. |
| Performance and memory | No latency, CPU or RSS measurements/budgets gate this pass; historical observations do not establish performance qualification. |

## Native and release risks

- Modifier double-tap needs a native event stream and a tested state machine. [Electron globalShortcut](https://www.electronjs.org/docs/latest/api/global-shortcut) handles registered combinations and reports unsuccessful registration; it does not prove universal shortcut availability.
- Preferred selection uses [Windows UI Automation text ranges](https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-usingtextrangeobjects). App support, protected inputs, elevated processes, and actual hook permissions must be validated on real machines.
- Clipboard fallback is deferred outside v1 by the user's 2026-10-02 decision. Preserve future multi-format snapshot/ownership/restoration requirements in [P10](planning/issues/P10.md); deferral is not completion or safety qualification. Native-only capture and explicit user-invoked Copy still require manual clipboard/focus evidence.
- A Sonner instance in the hidden main renderer is insufficient for system-wide feedback. Validate a non-activating overlay using [Electron window behavior](https://www.electronjs.org/docs/latest/api/browser-window), including fullscreen and multi-monitor restrictions.
- Standard word-token search is not general substring search. [SQLite's FTS5 trigram documentation](https://www.sqlite.org/fts5.html#the_trigram_tokenizer) describes substring indexing and short-query limitations. P14 must cover one/two-character queries, Unicode, and literal punctuation.
- Packaged native modules require verified rebuild and unpack configuration; [Forge's native-module plugin](https://www.electronforge.io/config/plugins/auto-unpack-natives) is a packaging reference, not proof that a chosen module works.

The user superseded the original under-150-ms capture-to-toast and under-50-ms search acceptance targets for this pass. Retain past failed measurements as history, not current blockers or repaired results. Native helper watchdogs and accepted-work shutdown bounds remain safety requirements.

## Delivery phases and exit gates

| Phase | Outcome | Exit gate |
| --- | --- | --- |
| 1 Foundation and risk validation | Runnable shell, typed boundaries, persistence/settings, native decision, CI | Clean platform builds and a real native proof on Windows |
| 2 Desktop and capture | Shortcuts, native UIA capture, windows, save toast | Highlighting in another app produces a durable snippet without focus theft or clipboard loss |
| 3 Search and library | Both modes, preview/actions, copy/navigation, tag assignment | Real saved data can be found, tagged, edited, and copied with shared behavior |
| 4 Settings and daily workflows | Responsive settings, tag management, data transfer, onboarding, tray | Complete offline first-run and daily-use flows |
| 5 Release readiness | Installers, design/accessibility audit, native reliability and distribution checks | Packaged Windows builds satisfy the release checklist |

Issue dependency links define execution order within phases. P06/P13 design/window work can proceed while native validation runs. P14 can follow persistence independently. P12 follows P13 even though its planning ID is earlier; P19 follows P20. IDs are stable references, not a strict numeric execution sequence.

## Issue breakdown

### Phase 1: Foundation and risk validation

| Plan ID | Issue | Depends on |
| --- | --- | --- |
| P01 | [Bootstrap Electron, React, TypeScript, and the modular project structure](planning/issues/P01.md) | None |
| P02 | [Define domain contracts and a secure typed IPC bridge](planning/issues/P02.md) | P01 |
| P03 | [Validate native capture, keyboard hooks, and clipboard feasibility on Windows](planning/issues/P03.md) | P01 |
| P04 | [Implement SQLite persistence, migrations, and snippet repositories](planning/issues/P04.md) | P02 |
| P05 | [Persist settings and broadcast immediate preference changes](planning/issues/P05.md) | P02, P04 |
| P25 | [Extend CI for application checks and Windows package checks](planning/issues/P25.md) | P01 |

### Phase 2: Desktop and capture

| Plan ID | Issue | Depends on |
| --- | --- | --- |
| P06 | [Build the shadcn design foundation, themes, and shared components](planning/issues/P06.md) | P01 |
| P07 | [Implement global shortcuts and the double-tap modifier state machine](planning/issues/P07.md) | P03, P05 |
| P08 | [Deferred macOS plan](planning/issues/P08.md) | Deferred - not an active dependency |
| P09 | [Implement Windows selection capture and foreground application identity](planning/issues/P09.md) | P03, P02 |
| P10 | [Deferred clipboard-preserving Copy fallback](planning/issues/P10.md) | Deferred - not a v1 dependency or gate |
| P11 | [Connect the capture pipeline with normalization and deduplication](planning/issues/P11.md) | P04, P05, P07, P09 |
| P12 | [Show the focus-safe save toast in a dedicated overlay window](planning/issues/P12.md) | P06, P11, P13 |
| P13 | [Implement desktop window lifecycle, size modes, and pin behavior](planning/issues/P13.md) | P05, P06 |

### Phase 3: Search and library

| Plan ID | Issue | Depends on |
| --- | --- | --- |
| P14 | [Implement substring search, filter syntax, sorting, and paginated queries](planning/issues/P14.md) | P04, P02 |
| P15 | [Build the compact library with virtualized snippet rows](planning/issues/P15.md) | P06, P13, P14 |
| P16 | [Build the regular split view and snippet editing/actions](planning/issues/P16.md) | P15, P04 |
| P17 | [Unify copy commands, keyboard navigation, and keep-open feedback](planning/issues/P17.md) | P15, P16, P05 |
| P18 | [Implement tag creation, filtering, and the reusable multi-select picker](planning/issues/P18.md) | P04, P06, P17 |

### Phase 4: Settings and daily workflows

| Plan ID | Issue | Depends on |
| --- | --- | --- |
| P19 | [Add tag management with rename, recolor, merge, and delete](planning/issues/P19.md) | P18, P20 |
| P20 | [Build responsive settings, general preferences, and appearance controls](planning/issues/P20.md) | P05, P06, P13 |
| P21 | [Implement shared shortcut recording and shortcut settings](planning/issues/P21.md) | P07, P20 |
| P22 | [Add storage location, JSON/Markdown export, JSON import, and clear all](planning/issues/P22.md) | P04, P20 |
| P23 | [Build first-launch onboarding with a real practice capture](planning/issues/P23.md) | P11, P12, P15, P20, P21 |
| P24 | [Implement tray/system tray, recent snippets, and pause capture](planning/issues/P24.md) | P07, P11, P17, P20 |

### Phase 5: Release readiness

| Plan ID | Issue | Depends on |
| --- | --- | --- |
| P26 | [Package Windows x64 installers with native modules (unsigned development artifacts)](planning/issues/P26.md) | P03, P24, P25, P23, P22, P19 |
| P27 | [Audit design fidelity, keyboard accessibility, and assistive technology](planning/issues/P27.md) | P16, P17, P18, P19, P20, P21, P22, P23, P24 |
| P28 | [Verify Windows reliability and distribution readiness](planning/issues/P28.md) | P26, P27 |

## Definition of done

Every issue includes its own acceptance criteria and verification. Cross-cutting completion requires component-per-file/module boundaries, offline behavior, safe snippet rendering, light/dark/system themes, keyboard accessibility, correct error states, and persistence where relevant. Use the canonical public functional service flows in docs/testing.md with real internal modules and fake external boundaries. Windows focus, clipboard formats, fullscreen behavior, physical input, signing and assistive technology require manual release evidence; no automated GUI/native suite is maintained.

P25 maintains Windows functional/static checks and Windows x64 packaging, with Linux workflow validation and CodeQL tooling. P27 audits all ten supplied screenshots plus derived settings sections. P28 joins the full evidence and does not replace feature-level testing.

No cloud sync, accounts, sharing, rich text/image snippets, AI features, grid layout, telemetry, or automatic updater is included in this v1 plan. Native capture must leave the clipboard untouched. Explicit snippet/Markdown/tray Copy and its functional/manual qualification remain required; deferred fallback's future format-preservation requirements do not gate v1.

## GitHub tracking

The tracker and individual issue links are recorded in [GitHub issue index](planning/github-issues.md) after publication. Planning sources and issue bodies are retained locally for review. These planning snapshots track current issue scope alongside the implemented application; supplied reference assets and past verification receipts remain historical source material.

