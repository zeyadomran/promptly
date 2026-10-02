> Current scope is Windows x64 only (2026-10-02). The supplied original reference remains unchanged in design-reference; this maintained spec reflects the current product scope. Functional service tests are automated; Windows UI/native release qualification is manual.

# Promptly: App Functionality Spec

You are helping build **Promptly**, a Windows x64 desktop app that lets users save highlighted text from any application with a global keyboard shortcut, then search, tag, filter, and copy it later. The primary users are power users of AI coding tools (Claude Code, Codex, Cursor, etc.) who collect prompts to reuse or try later.

UI is built on **shadcn/ui** components (Button, Input, Badge, Toggle/ToggleGroup, Switch, Slider, Tabs, Dialog, DropdownMenu, Tooltip, Sonner toast, ScrollArea, Command), Space Grotesk for UI text, and Geist Mono for saved snippet text, shortcuts and paths. Supports light, dark, and system themes.

---

## 1. Core concepts

- **Snippet**: one saved piece of text.
  - `id`, `text` (full, untruncated), `createdAt`, `updatedAt`
  - `sourceApp` (name of the frontmost app at capture time, e.g. "Terminal", "Cursor", "Arc"; best-effort, may be null)
  - `tags: Tag[]` (zero or more)
  - `lastCopiedAt` (nullable), `copyCount`
- **Tag**: `id`, `name` (unique, case-insensitive, lowercase display), `color` (from a fixed palette of ~8 hues), `createdAt`. Each tag shows a count of the snippets that use it.
- All data is stored **locally** (e.g. SQLite in the app data directory). No account and no network required.

---

## 2. Capture: save highlighted text

### Trigger
- A **global shortcut** that works while any app is focused, even when Promptly is hidden or minimized.
- Default: **double-tap Shift (⇧⇧)**. The second tap must land within the configurable double-tap window (default 300 ms) with no other key pressed in between.
- Users can configure the shortcut as either:
  1. **Double-tap a modifier**: Shift, Ctrl, Alt or Win, or
  2. **A key combination** recorded from a keypress (e.g. Ctrl+Alt+S).

### Capture behavior
1. When the shortcut fires, read the **current text selection** of the frontmost app.
   - Preferred: the OS accessibility API (Windows UI Automation TextPattern).
   - Fallback: save the clipboard, simulate Copy (Ctrl+C), read the clipboard, then **restore the original clipboard contents**.
2. If the selection is empty or whitespace only, do nothing, or show a subtle "Nothing selected" toast.
3. Optional normalization (setting, on by default): trim leading and trailing whitespace, and strip leading terminal prompt characters (`❯`, `$`, `>`, `%`) from the first line.
4. **Deduplication**: if the identical text already exists, don't create a duplicate. Move the existing snippet to the top (update `updatedAt`) and show "Already saved".
5. Record `sourceApp` and the timestamp.
6. Show a **confirmation toast** (setting, on by default): title "Saved to Promptly", a one-line truncated preview, and a relative time. The toast must **not** steal focus from the user's current app. It has no actions and auto-dismisses after ~2.5 s.

### Permissions
- Windows: a low-level keyboard hook; no special permission prompt.

---

## 3. Main window

The main window has two **size modes**, toggled from a segmented control in the title bar (Compact | Regular). Each mode remembers its own window size and position. The **list layout only** (no grid view) is used in both modes.

### Shared title bar controls
- App logo and name.
- **Always on top (pin)** toggle. When on, the window floats above all other apps' windows, where Windows allows; placement above exclusive fullscreen applications is not guaranteed. The state persists across launches and shows in the footer ("Always on top", with a green dot). Works in both size modes.
- **Theme** toggle: cycles Light → Dark → System.
- **Size toggle**: Compact / Regular.

### 3a. Compact mode (default)
A narrow (~440 px), tall panel designed to sit beside a terminal or editor.
- **Search input** at the top, auto-focused when the window opens. `Esc` clears the search, or hides the window if the search is already empty.
- **Tag filter chips**: "All", then tags (horizontally scrollable), then a **"+" button** to create a new tag inline.
- **Snippet list** (virtualized, scrollable):
  - Colored **tag dots** on the left of each row (one per tag).
  - Snippet text in monospace, clamped to 2 lines.
  - Meta line: tag names · source app; plus a right-aligned action hint on the selected row ("↵ Copy") or a transient "✓ Copied" confirmation.
- **Footer**: result count ("4 of 128") and pin status.

### 3b. Regular mode
A larger window (~1000 px) with a split view:
- Top: search input (supports filter syntax, see §4), then **tag filter chips** that toggle on and off, followed by a dashed **"New tag"** chip.
- Left: dense **snippet list** (single-line truncated text, tag dots, tags · source, relative time). The selected row is highlighted.
- Right: **preview pane** for the selected snippet:
  - Its tags as badges, plus an **"Add tag"** button (opens a tag picker/creator popover).
  - Source app and time.
  - Full text in monospace with search matches highlighted.
  - Actions: **Copy** (↵), **Edit** (inline edit of the text), **⋯** menu (Delete, Duplicate, Open source app, Copy as Markdown code block).
- Footer: keyboard hints (↑↓ navigate, ↵ copy, Ctrl+T tag, ⌫ delete), pin status, and result count.

### Copy behavior (both modes)
- **Clicking a snippet row copies its full text** to the clipboard immediately. In Regular mode, a single click also selects it for preview.
- `Enter` copies the selected snippet.
- On copy: show an inline "✓ Copied" state on the row for ~1.5 s, then update `lastCopiedAt` and `copyCount`.
- Optional setting: "Hide window after copy" (default off when pinned, on otherwise).

### Keyboard navigation
- `↑/↓` move the selection, `Enter` copies, `Ctrl+F` focuses search, `Ctrl+T` opens the tag picker for the selected snippet, `⌫/Delete` deletes (with undo toast), and `Ctrl+,` opens Settings. A configurable global shortcut can show or hide the window (default Alt+Space).

---

## 4. Search and filtering

- **Instant, as-you-type** search across snippet text (case-insensitive, substring match; fuzzy matching optional). Debounce at ≤50 ms; it must stay fast with 10k+ snippets (use SQLite FTS5 or an in-memory index).
- Matches are **highlighted** in list rows and in the preview.
- **Tag filters**: selecting one or more tag chips narrows results to snippets that have **all** selected tags (AND). "All" clears the tag filters. "Untagged" is available as a filter in Regular mode.
- **Inline filter syntax** in the search box: `tag:review`, `from:terminal`, combinable with free text (e.g. `tag:testing from:cursor flaky`).
- Text search and tag filters combine (intersection).
- Sort: Newest (default), Oldest, Most copied, Recently copied.
- Empty states: no snippets yet (explain the shortcut), and no results for this search or filter (offer to clear filters).

---

## 5. Tagging

- Create tags from: the "+" chip next to the filter chips, the "Add tag" button in the preview, the tag picker (Ctrl+T), or Settings → Tags.
- The tag picker is a searchable popover (shadcn Command). Typing a name that doesn't exist offers "Create tag '…'". It supports multi-select.
- New tags get the next color from the palette automatically; users can recolor them.
- Remove a tag from a snippet by clicking its badge's ×.
- Settings → Tags: rename, recolor, merge two tags, delete (removes it from snippets but keeps the snippets), and view the snippet count per tag.
- Tagging is **not** offered in the save toast. Users tag from the main window.

---

## 6. Settings

Responsive layout: **side navigation** at ≥640 px wide; below that, the navigation becomes **horizontally scrollable tabs** and each label/description stacks above its control.

Sections:
- **General**: launch at login; show in system tray; hide window after copy; default size mode.
- **Shortcuts**:
  - Save selection: double-tap modifier (choose the modifier) **or** a recorded key combination. The recorder shows a "Press a key…" focus state, validates the combination, and warns about conflicts with system or known app shortcuts.
  - Open Promptly (show/hide window): recordable combo.
  - Toggle always on top: optional recordable combo.
  - Double-tap window slider (150–600 ms, default 300 ms).
  - Toggles: show confirmation toast; trim whitespace and terminal prompts.
- **Appearance**: theme (Light/Dark/System); always on top default.
- **Tags**: management table (see §5).
- **Storage**: data location (with "Reveal in Explorer"); Export (JSON, Markdown); Import (JSON); Clear all (confirmation dialog, typed confirmation).

All settings apply immediately (no Save button) and persist locally.

---

## 7. Onboarding (first launch)

A short stepper in its own window:
1. **Welcome**: one-sentence explanation: highlight text anywhere, press ⇧⇧, find it later and click to copy.
2. **Choose shortcut**: "Double-tap a modifier" (recommended, default ⇧⇧) or "Key combination" with a recorder; check for conflicts live.
3. **Try it**: show a sample prompt in a fake terminal and ask the user to highlight it and press their shortcut. On success, show the real save toast, change the status to "✓ Saved. Nice.", and enable Continue. Skip is always available.

When onboarding finishes, open the main window in Compact mode with the practice snippet already in the list.

---

## 8. System tray

- A monochrome tray icon. Menu items: Open Promptly, the last 5 snippets (click to copy), Pause capture, Settings, Quit.
- While capture is paused, the global save shortcut is disabled and the icon shows a paused state.

---

## 9. Non-functional requirements

- Capture-to-toast latency under 150 ms. Search results update in under 50 ms for 10k snippets.
- Never lose the user's clipboard: if the copy-simulation fallback is used, restore the clipboard.
- The app must not steal focus on capture.
- Memory-light when idle in the background.
- Accessible: full keyboard operation, visible focus rings, sufficient contrast in both themes, and screen-reader labels on the icon-only buttons (pin, theme, size, add tag).
- Implemented stack: Electron + React + shadcn/ui + Tailwind; worker-owned SQLite and an in-memory substring search index; Windows native helpers for the global key hook and reading selections.

---

## 10. Out of scope (v1)

Cloud sync, accounts, sharing, rich text/images, AI features, and a grid layout.
