# Desktop IPC contracts

The renderer receives only the frozen `window.promptly` named methods declared in
`src/shared/contracts/desktop-bridge.ts`. It cannot select channels, read paths,
launch executables, or access Electron events. Requests and results are runtime
validated against the strict schemas in `src/shared/contracts/operations.ts` in
preload and main. Unexpected fields are rejected. Exception details stay in main.

`installDesktopIpc(ipcMain, services)` accepts `Partial<DesktopOperations>` so
storage, settings, clipboard, and native capture services can be connected without
changing renderer privileges. Missing services return `UNAVAILABLE`. The P02
production shell intentionally has no fake successful persistence or capture.

Every successful reply carries the authoritative revision. Services publish a
`ChangeEvent` **after** a durable commit through the installer's `publish` method.
Revisions must strictly increase across snippets, tags, and settings. Events
contain affected domains, never replacement data. Subscribe performs a revision
handshake to cover changes between a first query and listener registration.
Preload shares one Electron listener across consumers, provides idempotent
unsubscribe, and disposes on unload. Main accepts only registered windows at the
exact trusted URL and only their main frames; navigation and destruction remove
subscriptions. Windows use sandboxing, context isolation, no Node integration,
denied permissions, denied new windows/navigation/webviews, and bundled content
with restrictive CSP. External links are currently denied; no arbitrary URL opener
is exposed.

`createSearchClient` in `src/renderer/lib/desktop-client.ts` refetches authoritative
pages on library/tag events, ignores old search responses and older revisions,
retries one query racing a commit, and drops pending results on disposal. Other
views must follow the same invalidation pattern for settings/tag snapshots.
`SnippetText` renders snippets through React text children, never HTML parsing.

## Service integration rules

- Search accepts query, AND tag IDs, untagged state, sort, offset, and a page size
  of 1–200. Pagination responses include revision, items, total, offset, hasMore.
- Snippet and tag IDs are UUIDs; timestamps are UTC ISO strings. Full snippet text
  is retained (bounded at one million characters). Tags use lowercase canonical
  names and the design palette: blue, green, red, purple, amber, teal, pink, lime.
- Source application display/identity is assigned by capture services. Renderer
  create/edit payloads cannot supply provenance. Source IDs permit macOS bundle
  identifiers and Windows executable basenames, reject paths, and must be resolved
  through main-owned platform validation before any future activation command.
- `deleteSnippet({id})` returns `{revision, undoToken}`. The UUID token is opaque;
  `undoDeleteSnippet({undoToken})` returns `{revision, snippet}`. P04 owns bounded
  snapshots, expiry, single-use consumption, and clearing tokens on clear-all.
  Invalid/expired tokens return `NOT_FOUND`; restoration conflicts return
  `CONFLICT`. No renderer-supplied snapshot can restore privileged state.
- `copySnippet({id, format})` reads the full authoritative snippet and writes the
  clipboard before committing copy statistics. Failure must not increment counts
  or hide a window. Clipboard and copy policy are later service responsibilities.
- Settings updates are non-empty strict patches, applied by settings services.
  Shortcut strings are requested configuration, not proof of successful OS
  registration. Services can return `CONFLICT` for registration failures; P05/P07
  own accelerator validation and actual bindings.

## Verification

The [Windows selection adapter](architecture/windows-selection.md) is private to
main. It accepts only main-owned foreground identity objects and never exposes
paths, HWNDs or native identity tokens through preload. Future Open source app
IPC must accept an authoritative snippet ID; live native activation does not
establish safe activation from persisted basename provenance after restart.

`npm run check` covers contract rejection, reply validation, sanitization, preload
allowlisting/subscription lifetime, stale search handling, and literal snippet
rendering. `npm run package && npm run test:smoke` checks the packaged shell and
builds a separate test-only Electron fixture using the production window factory,
IPC installer, preload, query client, and snippet renderer. It verifies two live
windows, broadcasts without duplicate listeners, reload/close/unsubscribe cleanup,
unregistered-window and child-frame rejection, and script-shaped text. Fixture
services and the test controller are never installed by the production entrypoint.
