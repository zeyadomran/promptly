# Promptly v1 implementation tracker

Build the supplied local-only macOS and Windows app using **Electron + React + TypeScript + Tailwind + shadcn/ui**.

The [implementation plan](https://github.com/zeyadomran/promptly/blob/docs/v1-implementation-plan/docs/implementation-plan.md) defines architecture, delivery order, proposed behavior for ambiguous requirements, and release gates. The [functional spec](https://github.com/zeyadomran/promptly/blob/docs/v1-implementation-plan/docs/app-functionality-spec.md), [visual spec](https://github.com/zeyadomran/promptly/blob/docs/v1-implementation-plan/docs/design-reference/DESIGN.md), and [ten supplied screenshots](https://github.com/zeyadomran/promptly/blob/docs/v1-implementation-plan/docs/design-reference/screenshots) are preserved with the plan.

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

Issue links are being populated from the reviewed 28-item backlog.

