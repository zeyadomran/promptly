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

Search pages carry `SnippetPreview` rows with at most 1,024 UTF-16 units of text,
ending before a split surrogate pair. A preview may contain only whitespace even
when the authoritative snippet has later content. Matching and counts still use
the complete stored text: a match beyond the prefix returns its row and contributes
to the count, without inventing a highlight inside the visible prefix.

`SearchPage.matches` maps each returned UUID to original UTF-16 start/end ranges,
including lowercase expansions and surrogate pairs. Only free-text terms produce
snippet-text highlights. Row and full-preview highlights retain at most 64 merged
ranges. Matches merge in text order using one cursor per query term, without
collecting every occurrence; later text remains selectable and copyable without
a highlight. Unicode offsets use a
forward-only cursor instead of allocating an offset array for every text unit.
`HighlightedText` safely renders these ranges and React escapes every segment.
When CSS Custom Highlight and StaticRange are available, `HighlightedText`
renders one escaped text node and registers the bounded range union. A pooled
document registry keeps independent component ownership through updates/unmount;
other highlight names are untouched. Static external CSS applies existing theme
colors under CSP. Unsupported runtimes retain the escaped `<mark>` fallback.
Invalid and surrogate-splitting offsets are ignored in both paths. Native
highlighting does not split or otherwise alter selectable snippet text.
The shared renderer helper uses exactly the worker's fold/range rules. Selected
snippet reads, editing, copy and export remain authoritative full-text paths.
Every process boundary validates the complete response. Tray queries request
`preview: 'tray'`: the worker collapses whitespace/control characters while keeping
at most 52 Unicode characters, including enough non-space text to detect label
truncation. This preserves useful labels after long whitespace prefixes. Main
formats those bounded previews into 50-character labels and escapes ampersands.

## Index choice and consistency

The retained runtime evaluation of SQLite `length`, `lower`, LIKE and FTS5 trigram found:
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
Active filter predicates compile once per query; the scan does not allocate
callbacks for empty chip/tag/source restrictions for each of 10,000 entries.

The renderer client coalesces same-turn requests in a microtask and keeps one
active IPC plus one latest queued request. Superseded results are cancelled
logically immediately. An active named IPC cannot be physically aborted; it
finishes before the queued latest request. Responses carry the request that
produced them; hooks can avoid rendering data for another current input. Revision
events advance the known revision, older snapshots retry once, and disposal drops
in-flight replies. A contiguous copy-statistics event patches all cached row
metadata without retiring selection or walking pages for newest/oldest sorts;
text, membership and those orders cannot change from a copy. Most-copied and
recently-copied sorts reconcile normally. Missing revision continuity, content
changes and tag changes retain the full invalidation path.
The active library model publishes typed input immediately and retires cached pages
and command-eligible selection. Nonempty typing waits for 200 ms without another
edit before querying; only the latest input is sent. Pagination and late replies
cannot repopulate rows during that wait, including a reply for text typed again.
Sort/filter actions and clearing search cancel the wait and query immediately.
Closing the model cancels its timer; reopening queries the current input. The IPC
client retains its existing coalescing and stale-response protection.

## Verification

One deterministic Node test builds the real storage worker, creates four owned
snippets, and queries through `StorageClient`. It checks literal punctuation,
quoted tag/source and selected-ID intersections, most-copied pagination, complete
Unicode/NUL text, bounded prefixes/highlights, matches beyond a prefix, whitespace
and surrogate boundaries, copy-statistics publication and committed edit invalidation. The
worker is terminated before its temporary files are removed.

The user-approved minimal test cleanup retired the 10k renderer benchmark,
Chromium tracing, pixel-check fixtures and their production timing hooks.
[Historical P14 evidence](../verification/P14/README.md) retains the passing and
failing receipts; the hosted latency requirement remains unqualified. Removing
the benchmark does not establish a performance fix. Final Compact/Regular
layouts remain P15/P16 responsibilities.
