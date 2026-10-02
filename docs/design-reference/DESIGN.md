# Promptly: Visual Design Spec

Base: **shadcn/ui** (New York style), default **zinc** palette, radius `0.5rem`. Use the real shadcn components (Button, Input, Badge, ToggleGroup, Switch, Slider, Tabs, Command, Popover, DropdownMenu, Tooltip, Sonner, ScrollArea, Dialog). Icons: **lucide-react** at 16 px with a 1.5 stroke.

---

## 1. Tokens

### Color: light / dark
| Token | Light | Dark | Use |
|---|---|---|---|
| background | `#ffffff` | `#09090b` | window surface |
| foreground | `#09090b` | `#fafafa` | primary text, primary button bg |
| foreground-2 | `#3f3f46` | `#d4d4d8` | non-selected row text, chips |
| muted-foreground | `#71717a` | `#a1a1aa` | meta text, hints, icons |
| muted | `#f4f4f5` | `#27272a` | selected row (light), segmented track, pin-on bg |
| row-selected | `#f4f4f5` | `#18181b` | selected list row |
| sidebar / pane | `#fafafa` | `#0c0c0e` | preview pane, onboarding stepper |
| border | `#e4e4e7` | `#27272a` | all 1 px borders |
| border-soft | `#f4f4f5` | `#18181b` | row dividers, chip-row divider |
| segment-on | `#ffffff` | `#3f3f46` | active segment thumb |
| highlight (search match) | `oklch(0.93 0.08 95)` | `oklch(0.48 0.09 95)` | match bg; text = foreground |
| success | `#16a34a` | `#16a34a` | pin-on dot, "Saved" text, OK status |
| warning | `#f59e0b` | `#f59e0b` | "waiting for permission" dot |
| destructive | `#dc2626` on `#fef2f2` | `#f87171` on `#450a0a` | Clear all |

### Tag colors
All tag colors share `oklch(0.65 0.13 H)`. Assign hues in this order: 255 (blue), 150 (green), 25 (red), 300 (purple), 60 (amber), 200 (teal), then 340 and 100.

### Typography
- **UI:** Space Grotesk (Google Fonts) at 400/500/600.
- **Snippet text, kbd, paths, step labels:** Geist Mono at 400/500.

| Role | Size / weight / tracking |
|---|---|
| Onboarding H1 | 22px / 600 / -0.025em |
| Settings page title | 18px / 600 / -0.015em |
| Window title ("Promptly") | 13px / 600 / -0.01em |
| Body / labels | 13.5px / 500 (label), 400 (body) |
| Descriptions | 12.5–13.5px / 400, muted-foreground, line-height 1.5 |
| Meta (tags · source) | 11.5px / 400, muted-foreground |
| Chips | 12px (compact), 12.5px/500 (regular) |
| Snippet text, compact | Geist Mono 12.5px / 1.55, 2-line clamp |
| Snippet text, regular list | Geist Mono 12.5px, single line, ellipsis |
| Snippet text, preview | Geist Mono 13px / 1.7 |
| kbd | Geist Mono 11–12px / 500 |
| Step label ("STEP 3 OF 4") | Geist Mono 11px / 500, muted |

### Spacing, radius, shadow
- Spacing on a 4 px grid: gaps of 2, 4, 6, 8, 10, 12, 14, 16, 22 px.
- Radius: rows/cards 8px, inputs/buttons 6px, kbd 4px, chips 999px, compact window 14px, regular window 12px.
- Window shadow, light: `0 12px 32px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.06)`. Dark: `0 16px 40px rgba(0,0,0,.35), 0 1px 3px rgba(0,0,0,.3)`.
- Toast shadow: `0 10px 30px rgba(0,0,0,.12)`.
- Focus ring: a 3px ring in `muted` around a 1.5px foreground border (inputs and the shortcut recorder).

---

## 2. Brand
- **Logo:** two keycaps (a nod to ⇧⇧). See `assets/logo.svg`. 64-unit grid, rounded square `rx=15`. Left keycap `#71717a` at x13 y16 18×24 rx5. Right keycap yellow `oklch(0.82 0.14 90)` (≈`#ecc237`) at x34 y22 18×24 rx5.
- On dark surfaces, invert the square to `#fafafa`, the left key to `#a1a1aa`, and the right key to `oklch(0.72 0.15 85)`.
- **Tray/menu bar:** monochrome template icon (`assets/tray-icon-template.svg`): outlined left key, filled right key.
- **Wordmark:** "Promptly", Space Grotesk 500, -0.03em, placed 10 px from the mark.
- Title bars use the mark at 16 px (compact) or 18 px (regular), with a 6–7 px gap before "Promptly".

---

## 3. Components

**Title bar controls (both sizes)**
- macOS traffic lights on the left (Windows: native caption buttons on the right; move the controls to the left of them).
- Pin button. Compact: 28×28 icon-only. Regular: icon + "Always on top" label, 28 px tall, 9 px horizontal padding. On = `muted` bg + foreground icon; off = transparent bg + muted-foreground icon. Tooltip: "Always on top".
- Theme button: sun/moon icon (regular adds a label with the *next* theme).
- Size toggle: shadcn ToggleGroup on a `muted` track with 2 px padding. Compact: icon-only segments 26×22 (portrait-rect icon / landscape-rect icon). Regular: icon + text, 24 px tall. The active thumb is `segment-on` with `0 1px 2px rgba(0,0,0,.12)`.

**Search input**
- Compact: borderless row, 15px text, 12/14 padding, bottom border, `esc` kbd on the right.
- Regular: 40px tall, 8px radius, 1px border, 3px `muted` ring. Filter-syntax hint on the right ("tag:review from:terminal", 12px muted).

**Tag chip**
- 999px radius with a 6×6 tag-color square (2px radius) before the name.
- Off: 1px border, foreground-2 text. On: foreground bg, background-colored text.
- **Add-tag chip** always sits right after the chips. Compact: a 22×22 circle with a dashed muted-foreground border and a "+" icon. Regular: a dashed chip with "+ New tag".

**Snippet row: compact**
- 10px padding, 8px radius, 10px gap.
- Left: a column of 7×7 tag dots (2px radius, 4px gap), offset 6px from the top.
- Text: 2-line clamp. Meta: "tag1, tag2 · Source" on the left; on the right, "↵ Copy" (selected) or "✓ Copied" (after a click), 11.5px/500 foreground.
- Selected row bg = `row-selected`; selected text = foreground; others = foreground-2.

**Snippet row: regular**
- 11/12 padding. Inline tag dots (3px gap), single-line text, meta line below, relative time on the right (11.5px muted).

**Preview pane (regular)**
- `sidebar` bg, 20/22 padding, 16px gap.
- Tag badges: 5px radius, background-colored fill, 1px border.
- "Add tag" button: dashed border, "+" icon.
- Full text card: background fill, 1px border, 8px radius, 16px padding.
- Actions: primary **Copy ↵** (flex 1, 36px tall), outline **Edit**, outline icon **⋯** (36×36).

**Footer**
- Compact: 8/14 padding, 11.5px muted, "N of total" on the left and "● Always on top" or "● Not pinned" on the right (6px dot: success when on, border color when off).
- Regular: 34px tall, keyboard hints (↑↓ navigate · ↵ copy · ⌘T tag · ⌫ delete), plus pin status and result count on the right.

**Save toast (Sonner)**
- 290px wide, 8px radius, 12/14 padding, with the 20px logo on the left.
- Title "Saved to Promptly" (13px/600), "now" (Geist Mono 11px muted), and a one-line preview (12px muted, ellipsis).
- No actions. Auto-dismiss after 2.5s. Never takes focus.

**Shortcut recorder**
- 34–36px tall, min-width 170px, kbd keycaps inside (1px border with a 2px bottom border, `#fafafa` bg).
- Recording state: 1.5px foreground border, 3px ring, and the placeholder "Press a key…".

**Kbd:** Geist Mono 12px/500, 1px border (2px bottom), 4px radius, 2/6 padding.

**Primary button:** 36px tall, 16px horizontal padding, foreground bg, background-colored text, 6px radius, 13.5px/500. Disabled = 45% opacity. **Ghost Back:** chevron-left icon plus "Back", muted text color `#52525b`.

---

## 4. Screens

### 4.1 Onboarding window: 760 × 510 (38 px title bar, "Set up Promptly")
- Grid: a **210px** stepper column (`sidebar` bg, right border) plus the content column (32/36/28 padding, 22px gap).
- Stepper: logo + "Promptly" at the top. Step items have 8px padding and a 20px status circle: done = filled foreground with ✓; current = 1.5px ring + `muted` row bg + 500 weight; upcoming = 1px `#d4d4d8` ring with `#a1a1aa` text.
- Content: "STEP n OF 4" label, H1 and description, step content, and a footer pinned to the bottom (Back on the left, primary on the right).

Steps:
1. **Welcome.** H1 "Tap Shift twice to save anything". Then three cards in a 3-column grid (01 Highlight, 02 Press ⇧⇧, 03 Click to copy; 1px border, 8px radius, 14px padding). Primary: "Get started".
2. **Accessibility access** (macOS only; skip on Windows). A status card with an amber dot, "Waiting for permission…", and the outline button "Open System Settings". Below it, two ✓ reassurance lines. Continue is disabled until permission is granted (poll every 1s), then it advances automatically.
3. **Choose a shortcut.** Radio cards: "Double-tap a modifier" (Recommended, kbd ⇧ ⇧; selected = 1.5px foreground border) and "Key combination" (dashed recorder, "Click to record…"). Below them, a `muted` status strip: "● No conflicts with system shortcuts". If there is a conflict, show the dot in destructive red with the conflicting app's name.
4. **Try it.** A dark terminal block (`#18181b`, 10px radius, Geist Mono 13/1.7) with a sample prompt. The user selects the text and presses the shortcut, and the real toast appears at the bottom-right. The footer status changes to "✓ Saved. Nice." (success), and the primary button "Open Promptly" becomes enabled.

### 4.2 Main window, Compact (default): 440 px wide, min height 420, resizable vertically
Top to bottom: title bar (40px) → search → chip row (8/14 padding, 6px gap: "All", tags, "+") → list (6px padding, 2px gap; virtualized) → footer.

### 4.3 Main window, Regular: default 1000 × 640, min 760 × 480
Top to bottom: title bar (44px) → header block (14/18 padding: search, then a wrapping chip row with "New tag") → a two-column grid `1.15fr | 1fr` (list | preview pane) → footer.

### 4.4 Settings
- **≥640px:** 38px title bar "Settings", then a grid with a 190px nav (General, Shortcuts, Appearance, Tags, Storage; active item = `muted` bg, 500 weight) and content (24/32 padding).
  - Shortcuts page: Save selection (⇧ ⇧ double-tap) · Open Promptly (recorder) · Double-tap window slider (150–600, default 300ms, value in Geist Mono) · a "When saving" group with Switches (Show confirmation toast, Trim whitespace and terminal prompts).
  - Rows have 14px vertical padding and border-soft dividers. Label 13.5/500, description 12.5 muted, control on the right.
- **<640px:** a back chevron + "Settings" title. The nav becomes a horizontal scrollable tab row (5/10 padding pills, active = `muted`). Each row stacks its label and description above a full-width control. Switch rows stay inline.

---

## 5. Motion
- Row "✓ Copied": swap immediately, revert after 1500ms.
- Toast: Sonner default slide-in and fade, 2500ms duration.
- Theme switch: no transition on colors (avoid flashes).
- Size-mode switch: animate the window resize over ~180ms ease-out if the platform supports it.
- Selection movement with ↑/↓: instant, and keep the selected row in view by adjusting the scroll container.

## 6. Accessibility
- Every icon-only button has an aria-label and a tooltip (Always on top, Theme, Compact, Regular, New tag, Add tag).
- Visible focus ring on all interactive elements. Contrast is at least 4.5:1 for text in both themes.
- Full keyboard operation (see SPEC.md §3).
