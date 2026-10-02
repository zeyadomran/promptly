# Shared tag picker

`TagPickerProvider` lives inside the persistent library model and outside the command owner. Compact + and Regular New tag open catalog mode: search existing tags, choose AND filters or create a tag. Cmd/Ctrl+T and preview Add tag open snippet mode with a captured snippet ID. Existing tags show assignment checks and save each change immediately. `TagBadge` stops removal propagation and delegates to the same provider.

The picker reads the library model's tag catalog/counts rather than maintaining another cache. Committed snippet/tag revisions refresh the catalog and the open target's assignments; deleted filter IDs are removed while retaining the selection cursor's desired ID. Each picker session and read has a generation. A delayed write retains its original target, while stale completion cannot change a newer session's assignment state. Closing the picker does not retry or cancel an already accepted mutation.

Two additive typed operations run through the existing `LibraryMutations` queue and worker transaction:

- `ensureTag({name, snippetId?})` resolves using `WHERE name = ? COLLATE NOCASE`, or creates through the existing repository/palette. An optional captured snippet is validated first and assigned within the same transaction. Clear/delete and assignment-limit failures roll back newly created tags.
- `setTagMembership({id, tagId, assigned})` changes one membership using the current stored set, preserving other concurrent assignments. Existing full-set/CRUD operations remain available.

Creation and rename input share trimming and JavaScript's locale-independent Unicode lowercase. Canonical stored names remain lowercase, 1–64 UTF-16 units, with well-formed Unicode. No normalization-form conversion or collation migration is performed. SQLite NOCASE remains the identity authority, including its embedded-NUL behavior; text reads use the existing BLOB decoder. Palette cycling is chosen by the repository, and a snippet remains limited to 100 tags.

The Command-in-Popover uses cmdk 1.1.1 and Radix primitives, with item UUIDs rather than tag names as command identities. Search is a lowercase literal substring. Picker-local Enter/Escape/composition handling stays inside the overlay and the library's single keyboard owner recognizes that overlay. Close returns focus to the supplied trigger; clicking another interactive target preserves that target's focus.

The one functional flow runs the real controller against owned SQLite through a typed external IPC adapter, including reopen, case/NUL reuse, assignment/count/AND behavior and delayed target/clear outcomes. Its architecture exception permits only `src/main/snippets/tag-picker.test.ts` to import `tag-picker-controller`; application layer restrictions remain unchanged. Automated GUI/native tests are absent. Actual focus, composition, theme, CSP and assistive-technology behavior remain manual qualification. Regular entrypoint composition belongs to issue18, and Settings tag management/count UI belongs to issue22.
