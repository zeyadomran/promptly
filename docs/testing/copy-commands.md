# Shared copy commands

Production bootstrap installs `CopyService` in the trusted sender-context IPC routes.
It shares the authoritative mutation queue with edits, imports and clear. Compact rows
select before requesting a copy; the library command provider owns keyboard commands,
copied feedback, delete and Undo. Regular preview and tray layouts remain future work,
using the same named copy operation. No user clipboard or native input was touched.

The service accepts one copy per live trusted window, with at most 16 active requests.
It uses the existing `LibraryMutations` owner to serialize the authoritative full-text
read, one clipboard write, and one private `recordSuccessfulCopy` call. Library clear,
window retirement, shutdown, or the 30-second request deadline cancels work before the
clipboard mutation. An entered asynchronous clipboard write cannot be canceled; it
remains owned until completion and its accepted statistics update drains before storage
retirement. The existing desktop shutdown has a separate 40-second fatal cleanup limit;
that limit cannot guarantee completion of an indefinitely stalled native write.

After a confirmed clipboard write, statistics or hide errors produce `status: copied`
with `STATISTICS_UNCONFIRMED` or `WINDOW_NOT_HIDDEN`. They never trigger another clipboard
write or statistics retry. Refresh/reopen is the intended statistics repair path, since
a failed worker response does not prove that the transaction failed. The hide policy is
read after asynchronous statistics work and checked again inside the serialized window
command. Only the still-owned main window may be hidden.

Electron 44.5.1's installed declarations and [pinned clipboard documentation](https://raw.githubusercontent.com/electron/electron/v44.5.1/docs/api/clipboard.md)
define `writeText` as `Promise<void>`. The injected port matches this asynchronous API.
Unpaired UTF-16 surrogates are rejected before writing because clipboard text travels
through UTF-8. Windows embedded NUL is also rejected before writing:
[CF_UNICODETEXT](https://learn.microsoft.com/en-us/windows/win32/dataxchg/standard-clipboard-formats)
terminates at NUL. Stored text remains unchanged. macOS NUL roundtrip is **not qualified**
by functional tests. Actual OS fidelity requires manual packaged release qualification.
Before an owned manual write, fully materialize every type of every existing clipboard
item: Electron 44.5.1 clipboard items read data lazily. If any type cannot be read or
restored, do not write. Reconstruct the original items and verify restoration afterward.
Production copy is write-only and never reads clipboard contents.

Markdown copy surrounds the full stored text with a backtick fence longer than every
embedded run, adding only the enclosing fence/newline syntax. It does not normalize
whitespace or Unicode. The scan has no argument-count overflow for many disjoint runs.

Functional service tests use real SQLite and an external clipboard fake for authoritative
text/Markdown and durable statistics, clipboard rejection, external database persistence
failure and entered-write retirement. A public renderer command case verifies partial
success feedback for1500ms and read-only refresh without replaying IPC; a keyboard case
verifies navigation, text/IME/overlay ownership and clear-then-hide Escape behavior.
The older27-case checkpoint was consolidated under the functional-only test policy;
that history is not new qualification evidence.

The single library keyboard owner respects composed focus paths, IME, text editors and
overlays. Search keeps Delete/Backspace; arrows and Enter can navigate/copy a validated
selection. Cmd/Ctrl+T reports unavailable until the tag-picker port is supplied. Native
window-focus notifications preserve active editor/modal/composition ownership. Delete
offers the real worker undo token through a CSS-styled notification, with no clipboard
or statistics retry. Full UI accessibility, platform clipboard fidelity and the future
Regular/tray/capture pipeline remain manual or later-feature qualification.
