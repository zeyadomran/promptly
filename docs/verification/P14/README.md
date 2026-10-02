# P14 search evidence

Run `npm ci`, `npm run check`, `npm run package`, then `npm run test:smoke`.
The search test also runs alone after packaging. CI executes Windows/macOS and
uploads JSON and visible common-query screenshots even on failure. The strict
**maximum <50 ms** gate is unchanged. Both OS results at the final integrated
head remain required; local timing alone does not establish that.

The [performance diagnosis](diagnosis.md) preserves the `2455ea9` visible-
preview Windows CI failure (85.4 ms), passing Mac receipt (49.2 ms), profiler
diagnostics and rejected numeric transport. The native-helper/shutdown main
`9b13dd0` is merged. Ordinary CI at `843b4eb` failed both OS (Mac 155.2 ms, Windows 77.8 ms);
qualification is unresolved. See the retained receipts and trace plan in the
diagnosis document. Local success does not establish both-OS qualification.

## Native highlights and compiled filters, 2026-10-02

The implementation at `10b47c36144180d1e3c289804ba8789ea42afa68` passed clean
`npm ci`, strict check (196 tests/46 files), normal package, all 17 packaged
smokes, both design tests and the two-process production CSP test. The CSP test
verified actual native highlight background pixels in both light and dark themes;
unauthorized styles were rejected. Normal packaging was restored afterward.

The new [ordinary Windows receipt](windows-native-highlights-benchmark.json)
records query max 18.3 ms, rapid typing 7.4 ms, capture/edit/tag/delete refresh
8.1/7.1/10.0/5.4 ms and complete-highlight paint 10.3 ms. Startup/index load was
132.3 ms. The 703-range regression checks every range's actual background pixels
and original selectable text. These are unprofiled measurements with original
strict schemas at all four response boundaries; numeric transport is absent.
The [inspected screenshot](windows-native-highlights-visible.png) shows the
simultaneously visible list and wrapped complete preview with native highlights.
Hardware, full runtime, first-use/warm p50/p95/max and per-boundary validation
costs are in JSON. The unchanged maximum <50 ms gate still requires fresh
Windows and Mac CI. Final P15/P16 UI qualification remains outside this fixture.

The earlier local receipt below remains as historical evidence for `2455ea9`.
It does not prove the performance changes pass both CI machines.

## Corrected visible fixture after settings integration, 2026-10-02

[Windows receipt](windows-search-benchmark.json) contains 110 input samples,
phase timings, startup, viewport geometry, rapid typing, revision refreshes and
a 703-highlight regression. The integrated packaged run passed: maximum query
21.6 ms, rapid input 9.5 ms, capture/edit/tag/delete refresh
7.8/8.1/9.7/6.8 ms, complete-highlight query 11.2 ms. Worker-ready startup was
111.9 ms. Clean install, strict check (147 tests/36 files), package, all eight
smokes, both design tests and packaged two-process CSP passed locally. Raw query
first-use/warm p50/p95/max are in JSON. Both OS CI at the final head is pending.

The first integrated full smoke already passed with a 22.5 ms maximum. Subsequent
design/package checks cleared the generated Playwright/build outputs, so the
final standalone search run collected durable artifacts after normal package
restoration. No failed attempt was rerun to obtain a passing timing receipt.

Hardware: Ryzen 7 7800X3D, 16 logical CPUs, 31.15 GiB RAM. Electron 44.5.1,
embedded Node 24.21.0, SQLite 3.53.4, Chromium 152.0.7977.130. Corpus: 10,000
snippets, 7,250,796 UTF-16 units, 15,007,744-byte database; about 725 characters
per snippet, with repeated words, suffixes, sources and 104 Unicode/punctuation/
NUL-bearing snippets.

The regular-style fixture has simultaneously visible scrolling list and selected
full-text panes, bundled Space Grotesk/Geist Mono fonts and wrapped text. Its
selected pane occupies x=352..984 and y=64..608 in a 1000x640 viewport. Its full
text wraps to 220px at 20px line height. The [inspected screenshot](windows-visible-common-query.png)
shows both panes and actual common-query highlights. Each
query verifies complete selected text and a visible highlight; no-match verifies
the selected pane disappears. The long-match regression verifies every mark,
including leading/later terms and the late highlight after scrolling. There is
no occurrence cap: adjacent/overlapping matches form a complete union.

Timing begins at the native input event timestamp and ends at the second
animation frame after the corresponding React result commits. Chromium paints
between those callbacks: this is a conservative presentation upper bound,
not physical display scanout. Assertions bind query/revision to the result;
no-match and mutation measurements cannot reuse prior DOM. Worker, bridge,
React commit and frame-wait phases are retained separately.

The worker snapshot and initial empty page load before the first text input.
Fonts are awaited and the shown focused window is checked as startup readiness,
with no text-query prewarming, artificial frame rate or throttling overrides.
The fixture retains prior results while input is pending and memoizes the result
pane so measurement metadata does not rebuild its DOM. Every response still
transports, searches and highlights complete stored text. Only list previews
are bounded to 160 units; the selected preview is complete.

## Retained failures and incomplete prior evidence

- [Initial full-row failure](initial-full-rows-failure.json): 20 full bodies
  rendered simultaneously; common `e` reached 70 ms. It does not qualify the
  intended one-selected-preview contract.
- [Old local receipt](incomplete/windows-offscreen-preview.json): selected
  preview was below the viewport, with an unwrapped long line. Its passing
  local values were incomplete proof of selected-preview painting.
- [Mac CI failure at 6fca](incomplete/macos-offscreen-preview-failure.json):
  Apple M2 Pro virtual, 5 CPUs, 14 GiB. First `i` 95.5 ms (worker 3.1,
  bridge 11.9, React 7.8, frame wait 74.3); `re` 112.9 ms (worker 2.4,
  bridge 5.3, React 3.1, frame wait 103.4); Unicode first-use 80.6 ms
  (bridge 64.7, worker 2.8). Scheduling/presentation dominated these failures.
- [Windows CI failure at 6fca](incomplete/windows-ci-offscreen-preview-failure.json):
  EPYC 9V74, 2 CPUs, 8 GiB. First `i` 57 ms (worker 4.4, bridge 30.4,
  React 14.4); first `e` 74 ms (worker 11.5, bridge 33.1, React 16.2,
  frame wait 23.8); warm `re` max 68.9 ms (worker 1.5, bridge 33.4,
  React 3.3, frame wait 30.8). IPC/DOM and runner scheduling both mattered.

These failures were not removed or accepted. Corrected visible focused layout,
font readiness, complete range compression and avoiding redundant result DOM
rebuilds address observed work, but their effect on both CI machines is not yet
proven. The final CI gate must pass without rerunning solely to obtain green.

## Scope and isolation

The fixture follows SPEC's single-line list plus one selected full body. It does
not implement or qualify final P15/P16 layouts, virtualization or interactions.
Those actual layouts must retain the performance gate. This workload does not
guarantee timing for 10,000 million-character snippets, page size 200, enormous
selected bodies, every machine or heavily contended runners. Active IPC is
logically cancelled/coalesced; it cannot be physically aborted.

Parser/repository/index tests cover syntax, Unicode/NUL, literal punctuation,
filters, sorts/counts/pages, mutations, rollback, clear/undo/reopen and future
batch transactions. Complete highlights have shared, repository, DOM and packaged
regressions. Production smokes use distinct generated temporary profiles and
assert Electron's actual userData resolves to the same real directory; normal
production defaults are unchanged. No real user database is altered or deleted.
