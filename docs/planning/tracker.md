# Promptly v1 implementation tracker

Build the supplied local-only macOS and Windows app using **Electron + React + TypeScript + Tailwind + shadcn/ui**.

The [implementation plan](https://github.com/zeyadomran/promptly/blob/9ae58db85e64afcb3b397e1467823a4bb0726c0a/docs/implementation-plan.md) defines architecture, delivery order, proposed behavior for ambiguous requirements, and release gates. The [functional spec](https://github.com/zeyadomran/promptly/blob/9ae58db85e64afcb3b397e1467823a4bb0726c0a/docs/app-functionality-spec.md), [visual spec](https://github.com/zeyadomran/promptly/blob/9ae58db85e64afcb3b397e1467823a4bb0726c0a/docs/design-reference/DESIGN.md), and [ten supplied screenshots](https://github.com/zeyadomran/promptly/tree/9ae58db85e64afcb3b397e1467823a4bb0726c0a/docs/design-reference/screenshots) are preserved with the plan.

## Required code structure

- Every React component gets its own implementation file, including separated shadcn compound components with thin re-export entrypoints.
- Target 50–150 lines per handwritten module; review/extract files over 200 lines.
- Screens compose reusable components and hooks. SQL, IPC, native APIs, clipboard handling, and business rules belong in focused services.
- Keep Electron main, preload, renderer, and shared contracts separate. Use runtime-validated narrow IPC, sandboxed renderers, and authoritative local storage.
- Compact and Regular share search, selection, tags, copy commands, and keyboard behavior.

## Delivery phases

1. Foundation: scaffold, IPC/domain contracts, native feasibility, SQLite, settings, and CI.
2. Desktop capture: native adapters, shortcuts, clipboard preservation, capture orchestration, windows, and non-activating toast.
3. Library: substring search, both layouts, snippet actions, copy/navigation, and tag assignment.
4. Daily workflows: responsive settings, tag administration, data transfer, onboarding, and tray.
5. Release: packaged installers, design/accessibility verification, native regression, and performance evidence.

## Decisions and release risks

- Automatic capture deduplicates; deliberate Duplicate creates a separate record.
- Newest uses updatedAt so recapture resurfaces an item; copying does not alter that timestamp.
- Hide-after-copy follows pin state by default and supports an explicit override.
- Clipboard fallback must preserve formats and newer concurrent user copies; skip unsafe fallback.
- A dedicated non-activating overlay displays save feedback while the main window is hidden.
- Shortcut conflict detection is best-effort. Windows Alt+Space availability and terminal Copy behavior require real validation.
- Search is substring-based, including one/two-character queries; ordinary word FTS alone is insufficient.
- Clear all erases library data and in-app undo, retaining preferences/onboarding.
- JSON import validates before a transactional merge, preserves deliberate duplicate text, and resolves ID/tag conflicts.
- Native adapter choice, minimum OS versions, signing credentials, and memory budget require implementation evidence.

## Release acceptance

- [ ] All implementation issues below are complete with their own acceptance evidence.
- [ ] Both OSes support the complete highlight → capture → search → tag → copy workflow in packaged builds.
- [ ] No clipboard loss, focus theft, false success, or unresolved data-loss defects.
- [ ] Capture-to-toast under 150 ms and complete search updates under 50 ms at 10k snippets are measured; deviations remain blockers.
- [ ] Light/dark/system themes, all ten design references, keyboard operation, VoiceOver/NVDA, and responsive Settings are verified.
- [ ] Offline operation, installer/native-module compatibility, and release signing status are verified.

Cloud sync, accounts, sharing, rich text/image snippets, AI features, grid layouts, telemetry, and automatic updates remain outside v1.

## Implementation issues

### Phase 1: Foundation and risk validation

- [ ] [P01 — Bootstrap Electron, React, TypeScript, and the modular project structure](https://github.com/zeyadomran/promptly/issues/3)
- [ ] [P02 — Define domain contracts and a secure typed IPC bridge](https://github.com/zeyadomran/promptly/issues/4)
- [ ] [P03 — Validate native capture, keyboard hooks, and clipboard feasibility on both OSes](https://github.com/zeyadomran/promptly/issues/5)
- [ ] [P04 — Implement SQLite persistence, migrations, and snippet repositories](https://github.com/zeyadomran/promptly/issues/6)
- [ ] [P05 — Persist settings and broadcast immediate preference changes](https://github.com/zeyadomran/promptly/issues/7)
- [ ] [P25 — Extend CI for application checks and macOS/Windows build smoke](https://github.com/zeyadomran/promptly/issues/27)

### Phase 2: Desktop and capture

- [ ] [P06 — Build the shadcn design foundation, themes, and shared components](https://github.com/zeyadomran/promptly/issues/8)
- [ ] [P07 — Implement global shortcuts and the double-tap modifier state machine](https://github.com/zeyadomran/promptly/issues/9)
- [ ] [P08 — Implement macOS selection capture, permissions, and source app identity](https://github.com/zeyadomran/promptly/issues/10)
- [ ] [P09 — Implement Windows selection capture and foreground application identity](https://github.com/zeyadomran/promptly/issues/11)
- [ ] [P10 — Implement clipboard-preserving Copy fallback with concurrency protection](https://github.com/zeyadomran/promptly/issues/12)
- [ ] [P11 — Connect the capture pipeline with normalization and deduplication](https://github.com/zeyadomran/promptly/issues/13)
- [ ] [P12 — Show the focus-safe save toast in a dedicated overlay window](https://github.com/zeyadomran/promptly/issues/15)
- [ ] [P13 — Implement desktop window lifecycle, size modes, and pin behavior](https://github.com/zeyadomran/promptly/issues/14)

### Phase 3: Search and library

- [ ] [P14 — Implement substring search, filter syntax, sorting, and paginated queries](https://github.com/zeyadomran/promptly/issues/16)
- [ ] [P15 — Build the compact library with virtualized snippet rows](https://github.com/zeyadomran/promptly/issues/17)
- [ ] [P16 — Build the regular split view and snippet editing/actions](https://github.com/zeyadomran/promptly/issues/18)
- [ ] [P17 — Unify copy commands, keyboard navigation, and hide-after-copy behavior](https://github.com/zeyadomran/promptly/issues/19)
- [ ] [P18 — Implement tag creation, filtering, and the reusable multi-select picker](https://github.com/zeyadomran/promptly/issues/20)

### Phase 4: Settings and daily workflows

- [ ] [P19 — Add tag management with rename, recolor, merge, and delete](https://github.com/zeyadomran/promptly/issues/22)
- [ ] [P20 — Build responsive settings, general preferences, and appearance controls](https://github.com/zeyadomran/promptly/issues/21)
- [ ] [P21 — Implement shared shortcut recording and shortcut settings](https://github.com/zeyadomran/promptly/issues/23)
- [ ] [P22 — Add storage location, JSON/Markdown export, JSON import, and clear all](https://github.com/zeyadomran/promptly/issues/24)
- [ ] [P23 — Build first-launch onboarding with a real practice capture](https://github.com/zeyadomran/promptly/issues/25)
- [ ] [P24 — Implement tray/menu bar, recent snippets, and pause capture](https://github.com/zeyadomran/promptly/issues/26)

### Phase 5: Release readiness

- [ ] [P26 — Package macOS and Windows installers with native modules and signing support](https://github.com/zeyadomran/promptly/issues/28)
- [ ] [P27 — Audit design fidelity, keyboard accessibility, and assistive technology](https://github.com/zeyadomran/promptly/issues/29)
- [ ] [P28 — Verify end-to-end reliability, performance budgets, and release readiness](https://github.com/zeyadomran/promptly/issues/30)

