> Current scope is Windows x64 only (2026-10-02). The supplied original reference remains unchanged in design-reference; this maintained spec reflects the current product scope. Functional service tests are automated; Windows UI/native release qualification is manual. The user's 2026-10-02 decision, "Defer fallback; use native capture for v1", supersedes clipboard-fallback requirements in the unchanged supplied originals.

Performance measurements and budgets are skipped for this pass by the [latest user decision](https://github.com/zeyadomran/promptly/issues/30#issuecomment-5963023552). Distribution checks remain required. Historical timing/RSS evidence is retained without a performance-pass claim; production bounded timeouts and correctness, native safety, clipboard and accessibility requirements are unchanged.

# Promptly: App Functionality Spec

You are helping build **Promptly**, a Windows x64 desktop app that lets users save highlighted text from applications exposing a supported native Windows UIA selection with a global keyboard shortcut, then search, tag, filter, and copy it later. The primary users are power users of AI coding tools (Claude Code, Codex, Cursor, etc.) who collect prompts to reuse or try later.

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
   - V1 uses **native Windows UI Automation TextPattern only**. Capture must not simulate Ctrl+C or read/write the clipboard.
   - Clipboard-preserving Copy fallback (#12/P10) is **deferred and not implemented**, not a v1 dependency or release gate. Its future safety requirements remain in [P10](planning/issues/P10.md).
2. Unsupported, failed, empty or whitespace-only selections save nothing and return a truthful unavailable/error/empty state; never substitute unrelated clipboard contents or show a saved confirmation.
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
- Header actions use icons with accessible names and tooltips, spaced apart; Settings sits immediately left of the size switcher and the selected size has a contrasting filled state. The header border remains visible below Windows caption buttons.

### 3a. Compact mode (default)
A narrow (~440 px), tall panel designed to sit beside a terminal or editor.
- **Search input** at the top, auto-focused when the window opens. `Esc` clears the search, or hides the window if the search is already empty.
- **Tag filter chips**: "All", selected tags first, then as many complete tag chips as fit on one row, a **"+N"** overflow picker and a dashed **"+"** new-tag control pinned right. Tags never wrap or scroll sideways; with an empty catalog only the new-tag control remains.
- **Snippet list** (virtualized, scrollable):
  - Colored **tag dots** on the left of each row: every assigned tag, using the same bounded grid in both modes (6px squares, 2px gaps, at most five rows).
  - Snippet text in monospace, clamped to 2 lines.
  - Meta line: source app, relative time and a transient "✓ Copied" confirmation after a confirmed copy. Rows have no idle copy arrow or visible "Copy" label.
- **Footer**: result count ("4 of 128") and pin status.
- Clickable rows and controls use a pointer cursor. Every Compact row uses the filled card appearance, with no persistent item selection or selected accessibility state. The command cursor has a focus outline while the list or search has keyboard focus. Both modes use the same 78 px rows with an 8 px gap, shared content/dots and subtle hover feedback; hover respects reduced motion.

### 3b. Regular mode
A larger window (~1000 px) with a split view:
- Top: search input (supports filter syntax, see §4), then **tag filter chips** that toggle on and off, followed by a dashed **"New tag"** chip.
- Left: the shared **snippet list** (two-line clamped text, tag dots, source and relative time) with an 8 px gap. The actual selected row is highlighted and supplies the preview.
- Right: **preview pane** for the selected snippet:
  - A fixed-height header with its tags as single-row badges, a **"+N"** overflow picker and right-aligned **source · relative time** metadata that receives space first. If source/time plus the mandatory add/overflow control cannot fit after hiding every badge, preserve the timestamp and truncate only the source label, with full accessible text and a focusable full-name tooltip. This bounded-width fallback is the stated working assumption pending an optional user preference. An empty snippet shows **"+ Add tag"**; when all badges fit a small dashed **"+"** adds more.
  - Full text in monospace with search matches highlighted.
  - Long text scrolls within its own focusable region; metadata and Copy/Edit/More actions remain visible at the supported minimum window size.
  - Actions: **Copy** (↵), **Edit** (inline edit of the text), **⋯** menu (Delete, Duplicate, Open source app, Copy as Markdown code block).
- Footer: keyboard hints (↑↓ navigate, ↵ copy, Ctrl+T tag, ⌫ delete), pin status, and result count.

### Copy behavior (both modes)
- **Clicking a snippet row copies its full text** to the clipboard immediately. In Regular mode, a single click also selects it for preview.
- `Enter` copies the snippet at the command cursor.
- Successful copy leaves the window open. Regular keeps the copied row selected and shows it in the preview. Compact stays Compact and tracks a command cursor for keyboard operations without persistent selection styling or selected accessibility state; switching to Regular uses that current cursor for preview selection. Refresh/reorder preserves the command target by ID; a later deliberate target wins over an earlier copy completion.
- After a confirmed write, update `lastCopiedAt` and `copyCount` once and show an accessible in-app Sonner notification titled "Copied" plus inline row feedback for ~1.5 s. Its Open Promptly action uses the show command. Failed or uncertain writes never show success; partial statistics failures report a warning and refresh reads without replaying the write.
- This keep-open behavior supersedes old automatic/always hide preferences in existing profiles. The legacy setting remains readable for data compatibility but has no effect and is absent from Settings. Tray copy preserves existing visibility and focus.

### Keyboard navigation
- `↑/↓` move the selection, `Enter` copies, `Ctrl+F` focuses search, `Ctrl+T` opens the tag picker for the selected snippet, `⌫/Delete` deletes (with undo toast), and `Ctrl+,` opens Settings. A configurable global shortcut can show or hide the window (default Alt+Space).

---

## 4. Search and filtering

- **Instant, as-you-type** search across snippet text (case-insensitive, substring match; fuzzy matching optional). Use an index and bounded pages for large libraries (SQLite FTS5 or an in-memory index). No debounce or latency benchmark budget gates this pass.
- Matches are **highlighted** in list rows and in the preview.
- **Tag filters**: selecting one or more tag chips narrows results to snippets that have **all** selected tags (AND). "All" clears the tag filters. "Untagged" remains available in the shared filter picker.
- **Inline filter syntax** in the search box: `tag:review`, `from:terminal`, combinable with free text (e.g. `tag:testing from:cursor flaky`).
- Text search and tag filters combine (intersection).
- Sort: Newest (default), Oldest, Most copied, Recently copied. The sort popover contains only sort choices; Quit remains in the existing tray menu.
- Empty states: no snippets yet (explain the shortcut), and no results for this search or filter (offer to clear filters).

---

## 5. Tagging

- Create tags from: the "+" chip next to the filter chips, the "Add tag" button in the preview, the tag picker (Ctrl+T), or Settings → Tags.
- Every tag entrypoint uses the same 240px shadcn Command-in-Popover picker. Filter mode has search, color squares, checkboxes, snippet counts and a selected-count/Clear footer. Preview Add tag, preview +N and Ctrl+T share snippet mode, which shows all available tags immediately. Assigned tags appear first in saved addition order with an applied check and remove actions, followed by unassigned catalog tags with an Add hint. Queries retain matching assigned tags first, then matching unassigned tags. A name with no exact match offers "Create tag '<name>'". Add/remove/filter changes apply immediately and keep the picker open; Escape closes and returns focus.
- Overflow uses actual rendered widths and ResizeObserver, reserving All/new-tag controls or preview metadata before fitting complete chips. Long chip names display the first 20 characters plus an ellipsis with a full-name tooltip. Open overflow triggers retain their anchor if resizing or mutations hide them.
- New tags get the next color from the palette automatically; users can recolor them.
- Remove a tag from a snippet using its picker row's ×.
- Settings → Tags: rename, recolor, merge two tags, delete (removes it from snippets but keeps the snippets), and view the snippet count per tag.
- Tagging is **not** offered in the save toast. Users tag from the main window.

---

## 6. Settings

Responsive layout: **side navigation** at ≥640 px wide; below that, the navigation becomes **horizontally scrollable tabs** and each label/description stacks above its control.

Sections:
- **General**: launch at login; show in system tray; default size mode. Copy keeps the window open.
- **Shortcuts**:
  - Reset shortcuts restores all global and in-app bindings plus double-tap modifier/timing in one operation. Unrelated settings and library data are retained. Rejected OS registration keeps prior bindings and displays the failure; success is shown only after the authoritative settings transaction commits.
  - Save selection: double-tap modifier (choose the modifier) **or** a recorded key combination. The recorder shows a "Press a key…" focus state, validates the combination, and warns about conflicts with system or known app shortcuts.
  - Open Promptly (show/hide window): recordable combo.
  - Toggle always on top: optional recordable combo.
  - Double-tap window slider (150–600 ms, default 300 ms).
  - Toggles: show confirmation toast; trim whitespace and terminal prompts.
- **Appearance**: theme (Light/Dark/System); always on top default.
- **Tags**: management table (see §5).
- **Storage**: Export (JSON, Markdown); Import (JSON); Clear all (confirmation dialog, typed confirmation).

General also shows the running app version from Electron and a GitHub repository link. The main process opens only `https://github.com/zeyadomran/promptly` in the external browser. **Check for updates** is a disabled placeholder: no network request, download, installation or claimed update status. Data location and Reveal in Explorer are not shown in Settings. Button labels omit ellipses; familiar Edit/Delete tag actions use icons with tooltips and accessible names, while primary and confirmation actions keep text.

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
- A single left-click on the tray icon shows, restores and focuses Promptly. Right-click opens the context menu; Open Promptly uses the same show action.
- While capture is paused, the global save shortcut is disabled and the icon shows a paused state.

---

## 9. Non-functional requirements

- Performance measurements and budgets (including the original 150 ms capture-to-toast and 50 ms search targets) are skipped for this pass; distribution checks remain required.
- Native capture never invokes Ctrl+C or reads/writes the clipboard. Explicit user-invoked snippet/Markdown/tray Copy remains required and intentionally writes requested content; its clipboard behavior and manual qualification remain in scope.
- The app must not steal focus on capture.
- No idle RSS/CPU budget or benchmark qualifies this pass; retain bounded resource ownership and complete shutdown.
- Accessible: full keyboard operation, visible focus rings, sufficient contrast in both themes, and screen-reader labels on the icon-only buttons (pin, theme, size, add tag).
- Implemented stack: Electron + React + shadcn/ui + Tailwind; worker-owned SQLite and an in-memory substring search index; Windows native helpers for the global key hook and reading selections.

---

## 10. Out of scope (v1)

Clipboard capture fallback (#12/P10, deferred/not implemented), cloud sync, accounts, sharing, rich text/images, AI features, and a grid layout. Deferred fallback is not completed; future work must satisfy P10's format/ownership/restoration safety requirements.
