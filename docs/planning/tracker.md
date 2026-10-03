# Promptly v1 implementation roadmap

> Current scope (2026-10-02): Windows x64 only. macOS is deferred and is not a dependency or release gate. #55 removes its implementation. Use minimal functional service tests, one canonical test per flow; native/UI qualification remains manual. This supersedes older cross-platform acceptance text and historical comments.

# Promptly v1 implementation tracker

Build the supplied local-only Windows app using **Electron + React + TypeScript + Tailwind + shadcn/ui**.

The [implementation plan](https://github.com/zeyadomran/promptly/blob/main/docs/implementation-plan.md) defines architecture, delivery order, proposed behavior for ambiguous requirements, and release gates. The [functional spec](https://github.com/zeyadomran/promptly/blob/main/docs/app-functionality-spec.md), [visual spec](https://github.com/zeyadomran/promptly/blob/main/docs/design-reference/DESIGN.md), and [ten supplied screenshots](https://github.com/zeyadomran/promptly/blob/main/docs/design-reference/screenshots) are preserved with the plan.

## Required code structure

- Every React component gets its own implementation file, including separated shadcn compound components with thin re-export entrypoints.
- Target 50–150 lines per handwritten module; review/extract files over 200 lines.
- Screens compose reusable components and hooks. SQL, IPC, native APIs, clipboard handling, and business rules belong in focused services.
- Keep Electron main, preload, renderer, and shared contracts separate. Use runtime-validated narrow IPC, sandboxed renderers, and authoritative local storage.
- Compact and Regular share search, selection, tags, copy commands, and keyboard behavior.

## Delivery phases

1. Foundation: scaffold, IPC/domain contracts, native feasibility, SQLite, settings, and CI.
2. Desktop capture: native UIA adapters, shortcuts, capture orchestration, windows, and non-activating toast.
3. Library: substring search, both layouts, snippet actions, copy/navigation, and tag assignment.
4. Daily workflows: responsive settings, tag administration, data transfer, onboarding, and tray.
5. Release: packaged installers, design/accessibility verification, native reliability, and distribution evidence.

## Decisions and release risks

- Automatic capture deduplicates; deliberate Duplicate creates a separate record.
- Newest uses updatedAt so recapture resurfaces an item; copying does not alter that timestamp.
- Hide-after-copy follows pin state by default and supports an explicit override.
- Clipboard fallback (#12/P10) is **deferred, not implemented** and outside v1 dependencies/gates. Capture uses Windows UIA only, never Ctrl+C or clipboard reads/writes; unsupported/failed/empty selections save nothing with truthful state. Explicit snippet/Markdown/tray Copy and its clipboard qualification remain required.
- A dedicated non-activating overlay displays save feedback while the main window is hidden.
- Shortcut conflict detection is best-effort. Windows Alt+Space availability and native capture support require real validation.
- Search is substring-based, including one/two-character queries; ordinary word FTS alone is insufficient.
- Clear all erases library data and in-app undo, retaining preferences/onboarding.
- JSON import validates before a transactional merge, preserves deliberate duplicate text, and resolves ID/tag conflicts.
- Native adapter choice, minimum OS versions, signing credentials and distribution compatibility require qualification evidence.

Performance measurements and budgets are skipped for this pass by the [latest user decision](https://github.com/zeyadomran/promptly/issues/30#issuecomment-5963023552). Distribution checks remain required. Historical timing/RSS evidence is retained without a performance-pass claim; production bounded timeouts and correctness, native safety, clipboard and accessibility requirements are unchanged.

## Release acceptance

- [ ] All active v1 implementation issues below have their own acceptance evidence; deferred P08/P10 are excluded, not marked complete.
- [ ] Windows supports the complete highlight → capture → search → tag → copy workflow in packaged builds.
- [ ] No clipboard loss, focus theft, false success, or unresolved data-loss defects.
- [ ] Distribution artifacts, install/upgrade/uninstall and database preservation are verified; signing/credential gaps are stated explicitly.
- [ ] Light/dark/system themes, all ten design references, keyboard operation, NVDA, and responsive Settings are verified.
- [ ] Offline operation, installer/native-module compatibility, and release signing status are verified.

macOS support, Linux support, cloud sync, accounts, sharing, rich text/image snippets, AI features, grid layouts, telemetry, and automatic updates remain outside v1.

## Current priority

- [x] #55 Remove macOS implementation and restrict builds to Windows x64.
- Windows capture (#13), tag management (#22), capture feedback (#15), tray (#26) and onboarding (#25) are implemented; their issues remain open for manual acceptance evidence.
- Unsigned installers (PR #62), source accessibility audit (PR #63), pinned installer notices (PR #64) and uninstall login-entry cleanup (PR #74) are merged. A [bounded Windows 11 install/upgrade/uninstall/reinstall cycle](../releasing.md#recorded-windows-11-lifecycle) preserved the owned database and restored the environment baseline. Remaining #28 compatibility/native checks, accessibility (#29), checklist qualification requirements and Microsoft.Web.Xdt 2.1.1 terms stay unresolved; see the [release checklist](../qa/release-checklist.md).

## Implementation issues

### Phase 1: Foundation and risk validation

- [x] [P01 — Bootstrap Electron, React, TypeScript, and the modular project structure](https://github.com/zeyadomran/promptly/issues/3)
- [x] [P02 — Define domain contracts and a secure typed IPC bridge](https://github.com/zeyadomran/promptly/issues/4)
- [ ] [P03 — Validate native capture, keyboard hooks, and clipboard feasibility on Windows](https://github.com/zeyadomran/promptly/issues/5)
- [x] [P04 — Implement SQLite persistence, migrations, and snippet repositories](https://github.com/zeyadomran/promptly/issues/6)
- [x] [P05 — Persist settings and broadcast immediate preference changes](https://github.com/zeyadomran/promptly/issues/7)
- [x] [P25 — Extend CI for application checks and Windows build smoke](https://github.com/zeyadomran/promptly/issues/27)

### Phase 2: Desktop and capture

- [x] [P06 — Build the shadcn design foundation, themes, and shared components](https://github.com/zeyadomran/promptly/issues/8)
- [ ] [P07 — Implement global shortcuts and the double-tap modifier state machine](https://github.com/zeyadomran/promptly/issues/9)
- Deferred: #10 macOS support is outside the current release; implementation is removed by #55.
- [ ] [P09 — Implement Windows selection capture and foreground application identity](https://github.com/zeyadomran/promptly/issues/11)
- Deferred, not implemented: [P10 / #12 clipboard-preserving Copy fallback](https://github.com/zeyadomran/promptly/issues/12) is outside v1 and is not a capture/release gate.
- [ ] [P11 — Connect the capture pipeline with normalization and deduplication](https://github.com/zeyadomran/promptly/issues/13)
- [ ] [P12 — Show the focus-safe save toast in a dedicated overlay window](https://github.com/zeyadomran/promptly/issues/15)
- [ ] [P13 — Implement desktop window lifecycle, size modes, and pin behavior](https://github.com/zeyadomran/promptly/issues/14)

### Phase 3: Search and library

- [ ] [P14 — Implement substring search, filter syntax, sorting, and paginated queries](https://github.com/zeyadomran/promptly/issues/16)
- [ ] [P15 — Build the compact library with virtualized snippet rows](https://github.com/zeyadomran/promptly/issues/17)
- [ ] [P16 — Build the regular split view and snippet editing/actions](https://github.com/zeyadomran/promptly/issues/18)
- [ ] [P17 — Unify copy commands, keyboard navigation, and keep-open feedback](https://github.com/zeyadomran/promptly/issues/19)
- [ ] [P18 — Implement tag creation, filtering, and the reusable multi-select picker](https://github.com/zeyadomran/promptly/issues/20)

### Phase 4: Settings and daily workflows

- [ ] [P19 — Add tag management with rename, recolor, merge, and delete](https://github.com/zeyadomran/promptly/issues/22)
- [ ] [P20 — Build responsive settings, general preferences, and appearance controls](https://github.com/zeyadomran/promptly/issues/21)
- [ ] [P21 — Implement shared shortcut recording and shortcut settings](https://github.com/zeyadomran/promptly/issues/23)
- [ ] [P22 — Add storage location, JSON/Markdown export, JSON import, and clear all](https://github.com/zeyadomran/promptly/issues/24)
- [ ] [P23 — Build first-launch onboarding with a real practice capture](https://github.com/zeyadomran/promptly/issues/25)
- [ ] [P24 — Implement Windows system tray, recent snippets, and pause capture](https://github.com/zeyadomran/promptly/issues/26)

### Phase 5: Release readiness

- [ ] [P26 — Package Windows installers with native modules](https://github.com/zeyadomran/promptly/issues/28)
- [ ] [P27 — Audit design fidelity, keyboard accessibility, and assistive technology](https://github.com/zeyadomran/promptly/issues/29)
- [ ] [P28 — Verify Windows reliability and distribution readiness](https://github.com/zeyadomran/promptly/issues/30)
