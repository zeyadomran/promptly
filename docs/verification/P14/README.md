# P14 search evidence

Run `npm ci`, `npm run check`, `npm run package`, then `npm run test:smoke`.
`tests/e2e/search.spec.ts` also runs alone after packaging. CI executes it in the
existing Windows/macOS matrix and uploads its JSON attachment even on failure.

## Windows measurement, 2026-10-02

[Raw evidence](windows-search-benchmark.json) records all 110 query samples and
phase timings, 11 samples per query (one first-use sample, ten warm). Warm p95 is
the nearest-rank percentile. Hardware: Ryzen 7 7800X3D, 16 logical CPUs, 31.15 GiB
RAM; Electron 44.5.1, embedded Node 24.21.0, SQLite 3.53.4, Chromium
152.0.7977.130. Corpus: 10,000 snippets, 7,250,796 UTF-16 code units, 15,007,744-byte
database. Each snippet is about 725 characters, with repeated common words,
distinct suffixes, sources, and 104 Unicode/punctuation/NUL-bearing snippets.

| Query | First use ms | Warm p50 ms | Warm p95 ms | Max ms |
| --- | ---: | ---: | ---: | ---: |
| `i` | 19.6 | 11.6 | 11.8 | 19.6 |
| `re` | 10.4 | 7.3 | 7.7 | 10.4 |
| `review` | 10.2 | 7.7 | 8.0 | 10.2 |
| `e` (common/worst highlight density) | 12.7 | 11.8 | 11.9 | 12.7 |
| `needle-9999` (full scan, last item) | 10.9 | 9.9 | 11.4 | 11.4 |
| `no-match-zzzz` (complete no-match scan) | 10.9 | 7.3 | 10.6 | 10.9 |
| `你好` | 7.5 | 7.6 | 8.4 | 8.4 |
| `(x)*` | 9.4 | 7.7 | 10.3 | 10.3 |
| `"%b_c"` | 11.4 | 7.6 | 10.6 | 11.4 |
| `from:terminal review` | 10.6 | 7.5 | 10.5 | 10.6 |

The rapid typing last-input-to-paint sample was 6.4 ms. First authoritative
revision refresh after capture/edit/tag/delete measured 8.6/6.7/9.3/6.8 ms from
renderer invalidation receipt to paint. Mutation results and new revision are
checked; the fixture cannot reuse old-query or old-revision measurements. Each
input is associated with its actual completed request, including no-match results.

Timing begins at the native input event's timestamp and ends at the second
animation frame after React commits that request's result DOM. Chromium paints
between those callbacks; this is a conservative paint upper bound, not a physical
display scanout measurement. The first-use column is the first text query on a
new app/worker session, after its initial empty library page; index startup and
initial empty-page sort are deliberately reported separately. Worker-ready
startup was about 110 ms (exact value in JSON), including SQLite open, index load
and thread startup. All measured input paths passed the strict **max <50 ms**
gate; no additional timed debounce is used.

The real named bridge includes preload/main/worker response validation, actual
SQLite-backed worker querying, full snippet transport and safe React highlights.
Phase metrics separately measure worker index-refresh/sort/match/range execution,
full bridge round trip, response-to-React-commit and commit-to-frame wait. For the
common `e` query, full bridge and React DOM work account for substantially more
than the folded substring scan; the JSON preserves each phase instead of reporting
query execution as input-to-paint.

## Renderer contract and limits

SPEC §3b requires dense single-line list previews and **one** selected full-text
preview. The search-only fixture renders 20 list previews bounded at 160 UTF-16
units plus that one full-text highlighted preview. Every returned snippet still
contains complete stored text, and matching/counts/ranges operate on the entire
snippet. It searches suffixes outside the list previews and checks the complete
selected preview. It does not implement or prove the final P15/P16 window layouts,
virtualization, interactions or styling. Those layouts must retain the performance
gate when integrated.

The retained [initial failure](initial-full-rows-failure.json) rendered 20 entire
snippet bodies simultaneously: first `i` measured 63.4 ms and a common `e` reached
70 ms. That rendering contract did not match either intended library mode. The
representative fixture bounds list DOM while retaining the selected full body.
The initial mutation sample also lacked the final revision-bound measurement and
is not used as mutation performance evidence. Nothing in production truncates
stored or returned snippet text to obtain these results.

This data size is a measured workload, not a guarantee for 10,000 one-million-
character snippets, enormous selected previews, maximum page size 200, every
machine, or heavily contended runners. Highlight ranges are bounded at 512 per
snippet; matching and counts are complete. The active IPC cannot be physically
aborted, so rapid input coalesces/cancels obsolete results and waits for one active
request. Mac proof comes from the PR's matrix run, not local Windows evidence.

## Verification and storage isolation

Parser/index/repository fixtures cover short queries, quoted and partial syntax,
escapes, unknown filters, punctuation/SQL-shaped input, Unicode scalar expansions,
UTF-16 ranges, NUL suffixes, tag/source/text intersection, Untagged/reset, all four
stable sorts, count/page boundaries, small mutations, rollback, reopen, clear,
undo, and a 250-row future-import-style transaction. Actual SQLite tests evaluate
the rejected LIKE/lower and trigram-short-query alternatives.

Local `npm run check`: 108 tests/25 files passed with strict ESLint, Prettier,
TypeScript and architecture checks. Package, seven packaged/IPC/storage/search
smokes, two design tests and packaged Radix/Sonner/CSP tests passed.

Production smoke launches now use a fresh temporary `--user-data-dir` per process
and assert Electron's actual `app.getPath('userData')` equals that directory. This
also covers the second CSP process. An earlier unisolated run correctly refused
the user's schema-2 database while this branch supported schema 1; the user DB was
never altered. The production entrypoint/default path is unchanged. Tests clean
only their generated temporary profile, after closing the application.
