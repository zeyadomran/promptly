# Handoff: Promptly (desktop app, macOS and Windows)

## Overview
Promptly saves highlighted text from any app with a global shortcut (default: double-tap Shift, ⇧⇧). Users can then search, tag, filter, and click a snippet to copy it. The target users are power users of AI coding tools who collect prompts.

This folder contains:
- `SPEC.md`: **full functional spec** covering capture, search, tagging, settings, onboarding, tray, and non-functional requirements. Treat it as the source of truth for behavior.
- `DESIGN.md`: **visual spec** covering tokens, typography, components, and every screen with exact measurements and colors.
- `design/Promptly Final.dc.html`: the final design reference. Open it in a browser (keep `support.js` next to it). It shows the flow and all final screens in light and dark.
- `assets/`: the app logo and a menu bar/tray template icon (SVG).
- `screenshots/`: 2x PNGs of every final screen, named by section (1.1–1.4 onboarding, 2.x compact, 3.x regular, 4.x settings).

## About the design files
The HTML files are **design references**: prototypes showing the intended look and layout, not production code. Recreate them in the target stack using its normal patterns. If no codebase exists yet, use **Tauri (or Electron) + React + TypeScript + Tailwind + shadcn/ui**, with SQLite (FTS5) for storage. The UI was designed on shadcn/ui primitives with default zinc tokens, so use the real shadcn components, not custom ones.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, and copy are final. Match them closely. All values are in `DESIGN.md`.

## Screens (see DESIGN.md §4 for details)
1. **Onboarding** (4-step window, 760×510): Welcome → Accessibility access (macOS only) → Choose a shortcut → Try it.
2. **Main window, Compact** (default, 440 px wide): search, tag chips with a "+" button, a 2-line list with tag dots, and a footer with the pin status.
3. **Main window, Regular** (~1000 px): search with filter syntax, toggleable tag chips plus "New tag", a single-line list, and a preview pane with tags, an "Add tag" button, the full text, and Copy/Edit/⋯ actions, plus a keyboard-hint footer.
4. **Settings** (responsive): side nav at ≥640 px wide; below 640 px, scrollable tabs and stacked controls.

Both main-window sizes share title bar controls: the **Always on top** pin, **Theme** (Light → Dark → System), and a **Compact/Regular** segmented toggle. Only list layouts exist; there is no grid view.

## Interactions (summary; full detail in SPEC.md)
- **Click a row = copy its full text.** The row shows "✓ Copied" for 1.5 s. `Enter` copies the selected row; `↑/↓` move the selection.
- Search filters instantly (≤50 ms) and highlights matches in yellow. Selected tag chips combine with AND.
- The save toast ("Saved to Promptly" + a one-line preview) must not steal focus and **has no actions**.
- Pin = window always on top. It persists across launches and shows in the footer.
- Each size mode remembers its own window size and position.

## State (minimum)
- `snippets[]`, `tags[]` (persisted in SQLite)
- `query`, `selectedTagIds[]`, `sort`, `selectedSnippetId`, `copiedSnippetId` (transient)
- `sizeMode: 'compact' | 'regular'`, `alwaysOnTop: boolean`, `theme: 'light' | 'dark' | 'system'`, `shortcut config`, `doubleTapMs` (persisted settings)

## Files
- `design/Promptly Final.dc.html`: final screens (sections 1–4 match the screens above)
- `DESIGN.md`, `SPEC.md`, `assets/*`
