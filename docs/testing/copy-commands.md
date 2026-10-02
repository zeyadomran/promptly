# Shared copy command checkpoint

The main-owned `CopyService` is implemented with injected effects. Production bootstrap,
the renderer command provider, real IPC qualification, and integration with issue #17
remain pending at this checkpoint. No user clipboard or native input was touched.

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
read immediately before the hide attempt, after any asynchronous statistics work.

Electron 44.5.1's installed declarations and [pinned clipboard documentation](https://raw.githubusercontent.com/electron/electron/v44.5.1/docs/api/clipboard.md)
define `writeText` as `Promise<void>`. The injected port matches this asynchronous API.
Unpaired UTF-16 surrogates are rejected before writing because clipboard text travels
through UTF-8. Windows embedded NUL is also rejected before writing:
[CF_UNICODETEXT](https://learn.microsoft.com/en-us/windows/win32/dataxchg/standard-clipboard-formats)
terminates at NUL. Stored text remains unchanged. macOS NUL roundtrip is **not qualified**
by the injected tests; its length-delimited native path requires an actual owned,
explicitly GitHub-hosted clipboard fixture with restoration before release qualification.

Markdown copy surrounds the full stored text with a backtick fence longer than every
embedded run, adding only the enclosing fence/newline syntax. It does not normalize
whitespace or Unicode. The scan has no argument-count overflow for many disjoint runs.

Local focused regressions cover authoritative text and durable copy counts, clipboard
failure, unsupported representation, post-write statistics/hide failures, automatic and
explicit hide policies, cancellation while queued, duplicate admission, entered-write
shutdown ownership, and policy changes during deferred write/statistics work. These
tests inject the clipboard; they do not qualify platform clipboard fidelity or complete
the issue #17/#18 library layouts.
