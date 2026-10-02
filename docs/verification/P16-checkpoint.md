# Regular library implementation

The Regular surface now renders a 1.15fr/1fr dense list and exact full-text preview.
It retains the same paged LibraryModel, validated selection and shared command provider
as Compact. Virtual row geometry changes to 58px/60px; both modes keep bounded cached
pages and DOM ranges. Mode-specific viewports are retained when query/selection intent
is unchanged. Explicit movement still reveals selection at list boundaries.

The preview has relative metadata, wrapping tag entrypoints, all literal text highlights,
Copy/Markdown, inline Edit/Apply/Cancel, Duplicate and shared Delete/Undo. A persistent
SnippetSession keeps dirty text across selection/mode/revision changes, writes its original
snippet ID, preserves failed edits, and retires stale reads. Clear/import cannot silently
replace a draft. One canonical public functional flow covers this editor lifetime through
an injected IPC boundary; existing real-storage/copy flows cover durable management and
Markdown fences. The new session flow was observed failing before its implementation and
passing afterward. Later UI wiring and coverage consolidation do not claim a new red history.

Source availability/open requests contain only a snippet ID and first read authoritative
storage in main. Saved application labels/IDs never become activation authority. Until
capture13 retains a live main-owned native capability associated with the saved snippet,
Open source remains disabled with an explanation; source activation is not qualified.
The shared issue20 TagPickerProvider and TagBadge now supply actual create/assignment/removal mutations with the captured entrypoint and a single picker owner.

Validation uses current functional-only policy in docs/testing.md. No GUI/E2E, user
clipboard, native input or preferences are exercised. Packaging/static checks do not
qualify rendered light/dark/minimum-size fidelity, assistive focus, 10k smooth scrolling,
native source activation or a complete capture-save-copy workflow. These remain manual
release/dependency work, and issue18 should remain open for those qualifications.

The reviewed draft corrections distinguish temporary null command eligibility from
settled selection changes. A pending page/revision never opens a dirty dialog; an actual
new selection or settled empty result retains the explicit choice. Refreshes use a
separate request version so a late old success/error cannot erase a newer deletion or
import state or retire an accepted write. Both regressions failed before their fixes
inside the same canonical draft flow, then passed.

Final combined validation: strict TypeScript/ESLint/architecture (310 handwritten modules)
and Prettier pass; all 20 functional cases in 17 files pass. Actual Windows production
native helper and Electron packaging pass. The source resolver exports available(id)
and activate(id) from main only, with authoritative snippet reads before either operation;
no resolver is installed until capture13 supplies retained capabilities. Completed Apply
and new Edit sessions also retire pending refreshes, preventing an older read from
regressing the saved baseline. No OS/rendered qualification is inferred from these checks.
