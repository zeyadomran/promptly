# Compact library checkpoint

This is a paused implementation checkpoint, not acceptance or a ready PR. Feature
work stopped at the user's request to review the test strategy first.

- Real IPC search, tag filters, four sorts, fixed 78px virtual rows, count/pin footer,
  escaped exact highlights and nullable metadata are connected to one selection owner.
- Page size is 200; cache holds at most five pages. Selection scans actual pages by
  ID after mutations and exposes null while pending. Copy/tag execution are explicit
  integration ports for issues 19/20, with no claimed success while absent.
- Search candidate 7597 (including main 896a8a1) is normally merged. Thirteen focused
  model/range tests pass, including controlled delayed page movement, repeated revision
  invalidation, stale query scans, restart lifetime and same-revision cache eviction.
  An additional real StorageEngine test opens and queries the owned 10k corpus.
- A Windows production package and one owned production-renderer 10k UI flow passed.
  It crossed the 200-row page boundary using keyboard navigation, kept the selected
  78px row fully visible, scrolled to row 8997, mounted no more than 20 options, and
  retained the complete 799,998px virtual extent. It checked literal script text,
  nullable metadata, no inline positioning attributes, no horizontal window overflow,
  and no-results reset/search focus. The run took 16.2s; this is functional evidence,
  not a measured smooth-scroll or search-latency qualification.
- The final restart-lifetime refinement was tested in the controlled model suite
  after that package/UI run. An exact-checkpoint package/UI run remains unperformed.
- Two earlier UI startups failed because the new owned fixture seeded uppercase tag
  names; the actual storage schema requires lowercase names. The fixture was corrected
  without changing production validation. Two direct-engine diagnostic profiles remain
  retained at TEMP/promptly-compact-corpus-p4mFRe and -0lAk8K after constructor-failure
  cleanup encountered EBUSY; their test processes have exited. No user profile was used.
- Remaining: final exact-head package, light/dark/minimum-height screenshots and visual
  comparison, tag/sort/pin/mutation UI coverage, production CSP qualification and actual
  command integration from issue19. Tag creation/picker integration remains issue20.
  No native preferences or clipboard were accessed. No owned GUI process remains.

The latest stable TanStack React Virtual 3.14.13 was verified against npm's primary
registry with React 19 peer compatibility. Its mutable instance API triggered the
strict Hooks compatibility rule, including with a compiler opt-out directive. It is
removed. Fixed row geometry now uses a small passive-scroll/ResizeObserver store with
immutable useSyncExternalStore snapshots; no lint suppression or unused dependency is
retained. The shadcn DropdownMenu uses the existing cn utility, with one component per
file. Command eligibility is explicitly null during unloaded moves/reconciliation;
the port also exposes hasSearch for the one issue19 keyboard owner.

## Resumed functional-only implementation

Main `bbc783ba3ae1c51096e7b002588aa3c06bb990ff` is normally merged at `82f3885`; its production search implementation and functional-only policy replace the older diagnostic contracts. Compact corpus/GUI fixtures, thirteen model/range matrices and all obsolete search diagnostics are retired. One canonical public `LibraryModel` flow now covers delayed page navigation, bounded cache eviction, selection-preserving read refresh, repeated committed revision changes, query supersession, no-results reset and Clear all. Internal search/cursor/cache modules remain real; the controlled IPC boundary supplies deterministic snapshots.

Row copy dispatch requires an accepted current selection, so a stale rendered row cannot invoke the shared copy port after invalidation. The model exposes `refresh()` for issue19 to retry reads without resetting selection. The window-focus bridge focuses the real search ref and cleans up its subscription; the Compact Arrow fallback is disabled whenever the issue19 command context exists. Copied feedback can remain visible on a nonselected row during the provider's feedback interval. Tag chips/row metadata use the supplied Compact design's pill shape, selected colors and spacing.

Actual copy/Enter/Delete/Undo and keyboard dispatch still require issue19's sole provider integration. Tag creation/picker remains an absent, disabled integration port until issue20; Regular library remains issue18. Current light/dark/minimum-height rendering, CSP runtime, native focus and smooth 10k scrolling are manual qualification gaps under `docs/testing.md`. Earlier owned 10k evidence above is historical and is not requalified by current functional checks or packaging. No new GUI/native preference/clipboard/input run is performed.

Current resumed checkpoint validation: `npm run check` passes strict TypeScript/ESLint/architecture (252 modules), Prettier and all 11 functional cases, including the one canonical LibraryModel flow. `npm run package` builds the actual Windows production native helper and Electron package. No new dependency is introduced; the manifest/lockfile match current main. The controlled model test failed before the accepted-selection return value was implemented and passed afterward; this red/green slice qualifies the new public acceptance signal only, not the historical consolidation.
