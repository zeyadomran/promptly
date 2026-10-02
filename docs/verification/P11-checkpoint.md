# P11 native Windows capture checkpoint

This is the native Windows path of issue #13. Safe clipboard fallback (issue #12) remains unresolved, so this does not complete issue #13 or qualify a capture-save-copy release. Unsupported native selection returns an explicit unavailable result; it never simulates Copy or reads a user's clipboard.

## Implemented path

The shortcut capture trigger and the existing trusted `captureSelection` IPC operation use the same CaptureService. A fresh foreground capability is passed unchanged to the Windows selection adapter, which retains its 100 ms native deadlines and OS process/foreground/integrity checks. The pipeline additionally rejects mismatched response capabilities, unknown target integrity and selections over the storage limit of 1,000,000 UTF-16 units. It never truncates text or shows/focuses a window.

Enabled normalization trims outer whitespace and removes one recognized prefix from the first line. `❯` followed by space/tab is recognized. ASCII `$`, `>` or `%` followed by space/tab is recognized only before `echo`, `git`, `npm`, `npx`, `node`, `python`, `python3`, `pip`, `cd`, `ls` or `pwd` as a complete command word. This tiny conservative heuristic is not a shell parser and does not recognize arbitrary prompts. `$variable`, `> comparison`, `% formatting` and subsequent indentation remain intact. Disabled normalization preserves the entire selected string, including embedded NUL and Unicode.

The existing transactional capture repository owns exact post-normalization deduplication. Recapture preserves ID, createdAt, tags and copy statistics, while updating updatedAt and best-effort source metadata. Saved/duplicate results are published only after confirmed SQLite persistence. Empty, unsupported, canceled and rejected writes cannot publish a saved result. An unconfirmed transport/write failure is reported as unconfirmed without automatic retry.

Shortcut-owned admission capabilities invalidate pending captures on pause/resume, recording, sleep, hook health/reset and shutdown transitions. Busy triggers are dropped rather than queued against a later foreground app. The shared LibraryMutations ticket prevents pre-clear work from resurrecting cleared data. Once persistence has entered, shutdown drains it while storage is alive and reports its confirmed outcome truthfully.

Main-only subscribers receive monotonic phase stamps and an immutable committed preview. The preview is for future toast/onboarding consumers, not diagnostics, logs or general renderer change events. Observer/source-association failures cannot undo a successful save. Toast issue #15 is not implemented here.

Source activation uses a bounded in-memory registry of up to 32 original native capabilities. Both Regular source operations re-read the authoritative snippet before consulting that registry; activation always revalidates through the native adapter. Clear/import/delete discard associations, and shutdown clears the registry. Persisted source names/IDs cannot mint activation authority; restarted, expired or refused native capabilities return unavailable without launching an app by its label.

## Functional verification and limits

The new public CaptureService flow first failed with UNAVAILABLE instead of a durable save, then passed after the native/persistence slice was implemented. The same canonical flow covers committed preview stability, recapture preservation, exact disabled text, conservative prefixes, empty/oversize/unsupported/unknown-integrity rejection, an external SQLite rejection, pause→resume cancellation, real clear-service invalidation and draining an entered save on shutdown. SQLite is reopened to verify durability; external OS/time boundaries are injected. No user's clipboard, selected text, OS preferences or native input were accessed.

Strict checks and the owned functional flow verify service behavior. Packaging verifies construction, not actual OS delivery, native selection fidelity, source activation or full capture-to-toast latency. Those remain manual Windows release checks. Historical native failure receipts remain unchanged.
