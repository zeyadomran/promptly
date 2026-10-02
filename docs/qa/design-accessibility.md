# Windows design and accessibility source audit

Issue #29 / P27. The original audit compares implemented source with the supplied reference images. It is not a rendered comparison or native accessibility qualification. No application, native input, clipboard, user profile or OS preference was exercised by that source audit. The follow-up below separately identifies bounded manual before/after-fix observations.

## Scope and references

Reviewed the three Windows onboarding steps; Compact and Regular libraries in light/dark; Settings at the 640 px navigation breakpoint, including Tags and Storage; snippet editing, tag pickers, menus and confirmation dialogs. The source review covered labels/roles, selected and pending states, focus-return handlers, keyboard/IME ownership, text alternatives, tokens and reduced-motion rules.

Compared `docs/design-reference/screenshots/1.1-onboarding-welcome.png`, `1.3-onboarding-shortcut.png`, `1.4-onboarding-try-it.png`, `2.1-compact-light.png`, `2.2-compact-dark.png`, `3.1-regular-light.png`, `3.2-regular-dark.png`, `4.1-settings-wide.png` and `4.2-settings-narrow.png` with `DESIGN.md` and the corresponding source styles. Reference assets are approximately 2× logical dimensions. Their macOS captions and four-step permission sequence are not Windows requirements; the implemented setup has Welcome, Shortcut and Try Capture.

## Findings and corrections

| Source finding | Correction |
| --- | --- |
| Light metadata and key hints used `#71717a` on opaque `#f4f4f5`, below 4.5:1. Destructive button text used `#dc2626` on `#fef2f2`, also below 4.5:1. Review also found the focused destructive menu tint below 4.5:1 after the initial foreground correction. | Darkened only the light `muted-foreground` and `destructive` tokens to `#6e6e77` and `#d92323`. Destructive menu focus now uses the existing opaque `destructive-background` token, matching the buttons; the OS-dark opacity override was removed so explicit app themes use the same pair. Dark tokens and decorative tag/status colors are unchanged. |
| `LibraryList` could reference `snippet-${selectedId}` while the virtual range contained a loading placeholder for that index. A validated selection can outlive page-cache eviction. | Set `aria-activedescendant` only when the range contains the selected index and its cached item renders the matching option ID. Navigation, bounded caching and copy eligibility are unchanged. |
| More snippet actions and remove-tag icons had accessible names but no tooltip. | Composed the existing shared Tooltip with each existing button/trigger. Kept accessible names, disabled state and removal propagation guards. |
| Onboarding source omitted the reference's separate sidebar background and rounded current-step fill. | Applied existing `sidebar` and `muted` tokens and an 8 px step radius. The three-column welcome cards and narrow single-column fallback remain. |

Changed implementation paths: `src/renderer/styles/tokens.css`, `styles/onboarding.css`, `components/ui/dropdown-menu-item.tsx`, `features/library/LibraryList.tsx`, `features/snippets/SnippetMoreMenu.tsx` and `features/tags/TagBadge.tsx` (all under `src/renderer`).

### Contrast calculation

Ratios were calculated independently from the literal CSS colors using [WCAG relative luminance and contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): convert each sRGB channel to linear light (`c / 12.92` when `c ≤ 0.04045`, otherwise `((c + 0.055) / 1.055)^2.4`), use luminance weights `0.2126`, `0.7152`, `0.0722`, then `(lighter + 0.05) / (darker + 0.05)`. Values below are rounded only for presentation.

| Actual foreground/background pair | Before | After |
| --- | ---: | ---: |
| Muted text on white `#ffffff` | 4.833:1 | 5.048:1 |
| Selected-row metadata / key hint on opaque `#f4f4f5` | 4.397:1 | 4.593:1 |
| Muted text on sidebar `#fafafa` | 4.630:1 | 4.837:1 |
| Destructive button on opaque `#fef2f2` | 4.415:1 | 4.554:1 |
| Destructive button hover, `#fef2f2` at 80% over white | 4.495:1 | 4.638:1 |
| Light destructive menu focus, old foreground tint at 10% over white → opaque `#fef2f2` | 4.137:1 | 4.554:1 |

The button hover background was composited first in sRGB (`0.8 × tint + 0.2 × white`), yielding channels `(254.2, 244.6, 244.6)` before luminance conversion. The original menu foreground `#dc2626` at 10% over white yielded `(251.5, 233.3, 233.3)`. The initial `#d92323` correction still yielded only 4.257:1 on its menu tint `(251.2, 233, 233)`, which prompted the shared focus-background correction.

Rechecked all affected destructive button/menu pairs after that correction:

| Theme / state | Opaque foreground | Resolved background, sRGB channels | Ratio |
| --- | --- | --- | ---: |
| Light button normal / menu focus | `#d92323` | `#fef2f2` | 4.554:1 |
| Light button hover | `#d92323` | `(254.2, 244.6, 244.6)` | 4.638:1 |
| Light menu normal | `#d92323` | `#ffffff` | 4.982:1 |
| Dark button normal / menu focus | `#f87171` | `#450a0a` | 5.836:1 |
| Dark button hover, 80% tint over `#09090b` | `#f87171` | `(57, 9.8, 10.2)` | 6.218:1 |
| Dark menu normal | `#f87171` | `#09090b` | 7.192:1 |

Menu focus now resolves directly from the same light/dark CSS tokens whether the app theme is explicit or follows System, without an independent OS-dark opacity rule. Normal-state text is opaque. Disabled controls and transient animation opacity are not represented by these normal/hover/focus ratios. This is a calculation for these specific consumers, not a claim that every rendered contrast pair has been measured.

## Existing source contracts inspected

- Library options have stable IDs, selected state and position/total metadata; loading placeholders are hidden from accessibility APIs. The single command owner guards composition, text editing and open overlays. Arrow navigation and copy remain separate commands. See the [listbox active-descendant pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/).
- Settings controls receive field labels/descriptions; responsive Tabs retain their definitions while changing orientation. Tags use a captioned table, text names alongside colors, captured dialog targets and fallback focus restoration when a trigger disappears.
- Shared Radix dialogs expose titles/descriptions and a named, tooltipped close action. Draft, import and tag dialogs explicitly restore focus. Clear Library has a real trigger and typed confirmation; pending operations guard dismissal. The picker restores its actual trigger, with an intentional outside-focus exception.
- Shared buttons/menus/tooltips were composed according to the installed shadcn/Radix components; no duplicate keyboard controller or toast renderer was introduced. Guidance consulted: [Dialog](https://ui.shadcn.com/docs/components/radix/dialog), [Tooltip](https://ui.shadcn.com/docs/components/radix/tooltip) and [Dropdown Menu](https://ui.shadcn.com/docs/components/radix/dropdown-menu).
- Snippet text remains escaped text, including the native/fallback search highlight paths. Tag labels are readable independently of dot color. Error/status regions and copied feedback exist in source. Global reduced-motion styles shorten transitions/animations; the capture overlay's visible deadline remains main-owned.

These observations describe source contracts. They do not prove browser accessibility-tree output, keyboard focus behavior or screen-reader announcements.

## Validation and manual remainder

After the contrast follow-up and normal merge of installer main `238ed64`, `npm run check` passed: all three TypeScript projects, strict ESLint, architecture (367 handwritten modules), Prettier and 23 functional tests in 20 files. The earlier `npm run package` on base `d7b2b3f` also passed for Windows x64, building the main/worker, both preloads and both renderer entries. No CSS/component test, GUI/E2E, screenshot automation or performance gate was added.

The first combined `npm run make` completed production packaging but failed in Squirrel's `CreateZipFromDirectory` with a missing executable (exit `4294967295`). Local `npm ci --ignore-scripts` had skipped the project-approved `electron-winstaller@5.4.4` install hook: bundled `7z-x64.exe`/DLL existed, but the expected `7z.exe`/DLL did not. `npm rebuild electron-winstaller --foreground-scripts` selected the bundled x64 files; copied `7z.exe` and bundled `7z-x64.exe` had identical SHA-256 `C7245E21A7553D9E52D434002A401C77A7CA7D0F245F2311B0DDF16F8F946C6F`. This was dependency setup, with no source/build workaround or separate executable download. Normal `npm ci` remains the documented installer prerequisite.

One retry after restoring that prerequisite passed `npm run make`, including production packaging and unsigned Windows x64 Squirrel distributables. No installer or packaged application was launched; construction does not qualify installation, startup or native accessibility.

Issue #29 remains open until a packaged Windows build is manually compared with the references and qualified with NVDA. Check the three setup steps; Compact/Regular light and dark; Settings just below/above 640 px and Tags/Storage; keyboard-only dialogs, menus, tag selection and edit cancellation; focus return after deletion/async updates; virtualized offscreen/loading selection and copied/Undo announcements. Also check Windows caption accessibility, nonactivating capture confirmation, 125–200% scaling/text enlargement, mixed-DPI/negative-coordinate displays, focus-ring visibility and reduced motion. Native capture, source activation, shortcut delivery and fullscreen behavior retain their existing manual qualification limits.

## Follow-up: Settings focus continuity

Source baseline: main `28801645b9c42abc44bde4e1fad73b1da8165a30`. `SettingChoice` and `SettingSwitch` passed pending saves as `disabled` through `SettingsField`. Installed Radix ToggleGroup propagates that flag to its native buttons and marks every roving-focus item nonfocusable. No restoration handler existed.

A separate [before-fix manual receipt](https://github.com/zeyadomran/promptly/issues/29#issuecomment-5962026608) on the packaged baseline observed Appearance System → Right to Light with a visible focus ring → Space to save. After the save settled, the ring disappeared; Right then Space left Light selected rather than selecting Dark. UIA reported the root throughout and was not used as focus proof. This establishes a bounded keyboard-continuity failure, not complete keyboard or NVDA qualification.

The [after-fix receipt](https://github.com/zeyadomran/promptly/issues/29#issuecomment-5962128331) records PR71 merged as `1748bbdbe24e43a3c905792d0113460412e8bc2c`: Light saved with visible focus retained, then Dark selected without refocusing, then System restored with focus retained. The actual package remains the dirty implementation build with embedded base `2880164`, matched source/package hashes for reviewed `234239be` and tree-identical merged `1748bbd`; it must not be called a clean `1748bbd` build. Normal Quit, zero owned processes, unchanged absent startup values and empty stderr were verified. This corrects the observed sequence, not the full keyboard/NVDA acceptance.

The narrow correction keeps pending radios/switches mounted and focusable, exposes `aria-busy` and `aria-disabled`, and ignores value-change activation while pending. The existing synchronous busy guard still prevents overlapping writes before React renders pending state. Native disabled behavior remains for genuinely unavailable platform/tray controls. Committed-value rendering, serialization, errors and rollback are unchanged; no focus call, queue/controller or test seam was added. Radio value changes are guarded regardless of whether they originate from pointer or keyboard input; roving focus itself remains available.

The bounded source follow-up also checked existing Settings labels/descriptions, library listbox/option names and mounted active descendant, and source minimum widths (Settings 440 px, Regular 760 px). Settings preserves one Tabs definition across the 640 px orientation change; rows stack below it. No additional concrete role/label/minimum-width defect was identified from source.

Later [narrow Settings observations](https://github.com/zeyadomran/promptly/issues/29#issuecomment-5962313245) on the same dirty package showed horizontal tabs/stacked General at approximately 620 px, reachable Shortcuts, fitting Tags/Edit/Storage, and Escape restoring the Edit trigger while preserving the original tag name. Toast off/on by click/Space retained visible focus. The [661 × 641 follow-up](https://github.com/zeyadomran/promptly/issues/29#issuecomment-5962503601) checked General and Storage only, filling that specific above-640 gap; it does not cover every section, the exact breakpoint, enlarged text or DPI.

Recomputed the current opaque normal/muted pairs using the luminance formula above; highlights use the [CSS Color 4 conversion](https://www.w3.org/TR/css-color-4/#color-conversion-code) from literal OKLCH to in-gamut linear sRGB before luminance. The highlight backgrounds resolve approximately to sRGB `(248.362, 232.104, 170.929)` / `(109.586, 92.519, 20.064)`. No color/token change was needed.

| Actual pair | Light | Dark |
| --- | ---: | ---: |
| Foreground / base background | 19.895:1 | 19.061:1 |
| Secondary foreground / base background | 10.444:1 | 13.461:1 |
| Muted foreground / base background | 5.048:1 | 7.763:1 |
| Muted foreground / sidebar | 4.837:1 | 7.625:1 |
| Muted foreground / selected row | 4.593:1 | 6.913:1 |
| Muted foreground / group or key-hint background | 4.593:1 | 5.812:1 |
| Foreground / active segment | 19.895:1 | 10.006:1 |
| Foreground / search highlight (native and escaped mark) | 16.244:1 | 6.255:1 |

These are specific opaque token pairs, not disabled-state, antialiasing or rendered-pixel measurements. Beyond the verified Theme radio and toast switch sequences, manual follow-up must cover Default size/Hide after copy and other switches, rejected/delayed saves and repeated keyboard/pointer activation, including duplicate-write and unsolicited-focus checks. True unavailable controls must remain disabled. Issue #29's rendered comparison, NVDA, enlarged text and DPI requirements remain unqualified. The implementation agent performed no GUI/E2E test or native application/input/clipboard/preference action; the separately linked manual checks must not be attributed to the source audit. Issues #29/#30 remain open.

Validation of the correction: `npm run check` passed all 23 functional cases in 20 files and all type, strict ESLint, architecture and formatting checks; `npm run package` produced the Windows x64 package. No new renderer test seam or test was introduced, and no test-first history is claimed for this static semantics change.
