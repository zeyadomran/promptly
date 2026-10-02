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
The shared issue20 picker supplies tag mutations; absent ports remain disabled.

Validation uses current functional-only policy in docs/testing.md. No GUI/E2E, user
clipboard, native input or preferences are exercised. Packaging/static checks do not
qualify rendered light/dark/minimum-size fidelity, assistive focus, 10k smooth scrolling,
native source activation or a complete capture-save-copy workflow. These remain manual
release/dependency work, and issue18 should remain open for those qualifications.
