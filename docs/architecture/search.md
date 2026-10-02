# Substring search (P14)

The worker owns a folded, in-memory snapshot of full stored text, provenance and
tag membership. Renderer input is never SQL or FTS syntax. The same search method
handles empty, one-character, two-character, punctuation and longer queries.

## Language

- Whitespace separates AND substring terms. `flaky test` finds both substrings,
  in any order. `"flaky test"` finds that contiguous phrase.
- `tag:review` matches a complete tag name; `tag:"code review"` groups a name
  with spaces. Repeated tag tokens and selected chip IDs all intersect (AND).
  Unknown tag names match nothing. Names are case insensitive.
- `from:terminal` matches a substring in the capture's display name or identity.
  `from:"Windows Terminal"` groups a source phrase. Repeated sources intersect.
- Only `tag:` and `from:` at the start of a token are filters (case insensitive).
  Unknown filters such as `kind:note`, SQL/FTS operators, `%`, `_`, brackets,
  parentheses and `*` are literal text, without wildcard or operator meaning.
- Double quotes group text anywhere in a token and are removed. An unfinished
  quote uses the accumulated text as the term; it never causes an exception.
  Empty quotes and empty filters (`tag:`, `from:`) add no restriction. Partial
  nonempty tag names match only an exact stored name; source/text fragments
  already match substrings as the user types.
- Backslash escapes double quote, backslash, whitespace or colon. All other
  backslashes, including a final backslash, stay literal. `tag\:review` searches
  literal text `tag:review`. Quote or escape a recognized prefix to search it.
- All resets tag chip IDs and Untagged; query tokens remain until the input is
  cleared. `untagged` intersects with every other restriction and matches exactly
  snippets with no tag relations. An empty query and no filters return all.

## Unicode and highlights

Matching uses locale-independent Unicode lowercase **per code point**, using the
embedded JavaScript runtime's Unicode tables, with no accent, compatibility or
canonical normalization. Thus `İ` folds to `i` plus combining dot, `Σ` to `σ`, and
supplementary Deseret capitals to their lowercase counterparts. `ß` does not
match `SS`; `é` does not match decomposed `e` plus accent; Greek final sigma is
distinct from ordinary sigma. This explicitly avoids locale/context-dependent
offset changes. Combining sequences, emoji, punctuation and embedded NUL remain
in the stored string.

`SearchPage.matches` maps each returned UUID to original UTF-16 start/end ranges,
including lowercase expansions and surrogate pairs. Only free-text terms produce
snippet-text highlights. Overlapping ranges are merged by `HighlightedText`;
React escapes every segment. Range output is bounded to the first 512 matches per
snippet in term order; this limit never changes matching, counts or full text.
The shared renderer helper uses exactly the worker's fold/range rules. Full text
still travels in each returned `Snippet`; preview rendering does not truncate
storage or search. Optional `searchDurationMs` measures worker snapshot refresh,
ordering, matching and range generation, excluding response validation and IPC.

## Index choice and consistency

Real runtime tests evaluate SQLite `length`, `lower`, LIKE and FTS5 trigram:
SQLite length stops at NUL, built-in lowercase leaves non-ASCII capitals intact,
LIKE interprets literal `%` as a wildcard, and trigram MATCH cannot return one-
or two-character queries (it does retain terms following embedded NUL). Ordinary word FTS also
cannot implement arbitrary substrings. A trigram candidate path would still need
Unicode/NUL verification and a complete short-query fallback. The chosen folded
snapshot uses one correct literal path, without a native dependency or tokenizer
query escaping. Cost scales with total stored characters, not just snippet count.

The index loads before worker-ready. TEMP triggers record affected snippet IDs
inside the same SQLite transaction as inserts, edits, copy statistics, deletes,
tag relation changes, and tag rename/recolor. Rollback removes dirty entries.
The first following search refreshes committed affected rows; more than 200 dirty
IDs trigger one bulk reload. No query without library changes rebuilds the index.
Settings-only revisions do not dirty it. Capture, duplicate, undo, clear and future
batch imports using the same connection/transaction are covered automatically.
The single worker serializes reads/writes; counts, results and revision describe
the same authoritative state. There is no cross-process writer contract.

All four sorts use ascending UUID ties: newest by updated time descending, oldest
by creation ascending, most copied by count descending, recently copied by copy
time descending with nulls last. Sort arrays are cached until affected entries
change. Counts cover every matched item; offset/limit and hasMore use that count.

The renderer client coalesces same-turn requests in a microtask and keeps one
active IPC plus one latest queued request. Superseded results are cancelled
logically immediately. An active named IPC cannot be physically aborted; it
finishes before the queued latest request. Responses carry the request that
produced them; hooks can avoid rendering data for another current input. Revision
events refetch, older snapshots retry once, and disposal drops in-flight replies.
There is no additional timed debounce.

## Verification

`npm run check` exercises parser, scalar folding/ranges, literal punctuation,
filters, all sorts/pages, transactional rollback/batch import, reopen and mutation
index consistency. `npm run package` followed by `npx playwright test
tests/e2e/search.spec.ts` runs real React input, the production frozen named bridge,
main validation, the packaged worker and safe highlight DOM on a deterministic
10k library. Benchmark details and limits are in
[P14 evidence](../verification/P14/README.md). Final Compact/Regular layouts remain
P15/P16 responsibilities; this fixture is scoped to the search behavior contract.
