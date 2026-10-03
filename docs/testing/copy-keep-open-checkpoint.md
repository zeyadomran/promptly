# Copy and library UI checkpoint (2026-10-02)

The current issue 19 copy behavior keeps the library visible for both new and existing
profiles, announces confirmed copies with accessible in-app Sonner feedback, and retains
the selected snippet through statistics-driven reordering. Later deliberate selection
wins over an earlier copy completion. Compact keeps its mode and carries selection into
Regular. Tray copy has no window visibility or focus effects.

## Behavioral red-to-green evidence

The approved seams are the existing CopyService and library command/model flows. No GUI
suite, duplicate flow test, new runner, or real clipboard write was added.

1. Extended the canonical CopyService flow to require visible state with the legacy
   Automatic setting on an unpinned profile and Always for Markdown. The focused test
   failed at the first copy with `expected false to be true`. Removing obsolete copy hide
   effects made all four CopyService tests pass. The final canonical flow persists and
   reopens both legacy preference values, confirms exact Unicode/whitespace/Markdown text,
   checks one increment per write, and verifies the retained settings remain readable.
2. Extended the canonical command flow to require a confirmed-copy notification. It
   failed with `expected [] to deeply equal ['Copied']`. Adding the successful-copy
   presentation effect made the focused flow pass. Its 1500ms feedback, statistics warning,
   and read-only repair remain owned by the same command service without replaying IPC.
3. Added a distinct external failure/uncertainty case and extended the existing model
   flow with the real SnippetSession. These protect honest failed/uncertain outcomes,
   busy gesture admission, later selection during copy, exact preview through reorder,
   and deliberate selection during a delayed refresh. They are regression coverage for
   retained behavior, not additional red-to-green claims.
4. Extended that failure case to start a new uncertain copy while an earlier success was
   still visible. It failed with `expected 'owned-id' to be null`. Clearing the previous
   feedback when the next eligible gesture begins made both command cases pass; a failed
   gesture cannot leave stale Copied feedback suggesting that its write succeeded.

Focused copy/command/model validation passes: three files, seven tests. Full `npm run check`
passes strict main/renderer/tools TypeScript, ESLint with no warnings, architecture checks
(370 handwritten modules), Prettier, and the functional suite (20 files, 24 tests).

## UI changes and limits

The first-row list focus outline is drawn above row backgrounds without changing virtual
measurements. Rows have pointer cursors and subtle theme-aware hover feedback that obeys
reduced motion. Long preview text and edit text scroll in their own bounded regions;
metadata and actions remain visible. Existing portalled tooltips default below their
triggers, clear of the header. Header actions are icon-only with accessible names and
tooltips, more spacing, an explicit selected view, and Settings immediately left of the
view switcher. Native caption buttons leave the renderer's bottom border uncovered.
Rows omit the visible Copy label while retaining an icon and accessible copy hint;
touched recorder button labels have no ellipses and explain how to change a binding.

The old hide preference stays in the settings schema/repository for profile and backup
compatibility, but its active control and visibility effect are removed. Supplied design
references and historical receipts remain intact.

Windows installer construction uses `npm run make` and records exact build provenance
in the ignored output tree. Existing ignored packages,
native helper output, Vite output and distribution evidence were preserved under
`out/preserved-issue-19-keep-open-20261002` before building. No running application, user
profile, clipboard, native preference, or desktop input is used by these checks. Actual
packaged UI appearance, caption rendering, clipboard fidelity and NVDA announcement remain
manual release qualification; functional tests and construction do not prove those outcomes.
