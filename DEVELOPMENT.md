# Developing Promptly

The [wiki](https://github.com/zeyadomran/promptly/wiki) documents using the app.
This guide covers the maintained Windows development workflow. Read
[CONTRIBUTORS.md](CONTRIBUTORS.md) before contributing and [TESTING.md](TESTING.md)
before changing test coverage.

## Prerequisites

Use **Windows x64**, **Node 22.23.2** (the supported Node 22 range is declared in
`package.json`), and **npm 10 or newer**. Windows 11 x64 is the primary development
environment. Native helpers compile with the OS .NET Framework C# compiler and require
.NET Framework 4.8. The documented Windows 10 22H2 x64 target remains manually
unqualified. Other platforms and architectures are unsupported.

## Install and run

```powershell
npm ci
npm run dev
```

The development server binds to `127.0.0.1:5173` and fails if that port is occupied.
Renderer edits reload the page; restart development after changing the main process.
Vite transforms TSX with its built-in JSX support. React Fast Refresh is deferred.
Fonts, scripts, and other runtime assets are bundled rather than fetched from a CDN.

## Check and build

```powershell
npm run check        # TypeScript, lint, architecture, formatting, functional tests
npm run format       # Format maintained files
npm run package      # Runnable package in out/Promptly-win32-x64/, no installer/signing
npm run make         # Package once and build the unsigned Windows x64 installer
npm run stage:unsigned # Verify maker hashes and stage artifacts with the release guide
```

`npm run check:static` runs TypeScript, zero-warning ESLint, the architecture gate,
and formatting. `npm test` runs the canonical functional service suite. CI runs these
checks and constructs the unsigned installer on Windows x64. Workflow validation and
CodeQL run separately; see [repository maintenance](.github/MAINTENANCE.md).

No automated GUI or native E2E suite is maintained. Functional tests exercise services
and real owned SQLite storage with controlled external boundaries. They do not qualify
physical shortcuts, actual selection capture, clipboard fidelity, accessibility, focus,
or installer behavior. Follow the manual release checks in [TESTING.md](TESTING.md)
and the artifact, installation, and provenance requirements in [RELEASING.md](RELEASING.md).
Performance qualification is skipped by the recorded user decision, not claimed passed.

## Process boundaries

- `src/main/`: Electron lifecycle and focused services. Windows deny navigation,
  popups, webviews, and permission requests.
- `src/preload/`: bundled CommonJS bridges with validated public contracts.
  No raw IPC, filesystem, shell, or command API is exposed to the renderer.
- `src/renderer/`: React components, feature folders, hooks, and styles. Browser
  code imports only renderer/shared modules and approved browser dependencies.
- `src/shared/`: pure contracts; cannot import any process layer or unapproved npm dependency.
  Zod is the approved dependency for shared contract validation.

SQLite is owned by a main-process worker. Snippet, tag, search, settings, and transfer
services publish committed state through validated contracts. The Windows selection
and physical keyboard helpers are maintained under `native/windows/` and
`native/keyboard/windows/`; packaging builds and ships them outside ASAR.

Queue and managed originals/scenes share the worker's SQLite ownership. Main-owned attachment
draft capabilities are tied to the originating window; successful saves consume them atomically,
while rejected writes keep them available. Additive migrations retain existing Library text and
legacy v1/v2 import; v3 JSON Lines backups include saved Queue, assets and editable drawing
backgrounds. Markdown is text-only. Older builds can reject newer schemas, so binary downgrade
alone does not restore an older database format.

Image previews use one bounded private sandboxed Chromium decoder for PNG, JPEG, GIF, WebP and
BMP. It has no preload, product IPC or network access and drains owned decoding work on close.
Product renderers receive bounded safe PNG rasters and metadata, never original file bytes or
native intake paths. Drawing copy/export validates an ephemeral current-canvas PNG in main;
it does not implicitly save the editable scene.

Prepared text copies, variable answers and ordered bundle selections are transient. Main rereads
saved source content before committing a clipboard write. Shared LibraryMutations serializes
the write and per-source statistics, then explicit return is attempted. Confirmed copy/save
success survives a later statistics, return or presentation failure; no return path pastes text.

`npm run check:architecture` parses application TypeScript, including imports,
re-exports, dynamic imports, and shared modules. It rejects layer escapes, computed
imports, Node globals, runtime code generation, unscanned JavaScript imports, and
unapproved packages. New browser or pure shared dependencies require an explicit
checker allowlist change and review. Runtime isolation also uses sandboxing, context
isolation, disabled Node integration, and a strict CSP.

Keep one React component per implementation file, with explicit re-export entrypoints.
Aim for 50–150 lines per module; the architecture gate flags files over 200 lines.
Business logic belongs in hooks/services rather than JSX. Add feature-local modules
when needed rather than speculative folders.

## Native capture and data safety

V1 capture uses Windows UI Automation only. It does not simulate Ctrl+C or touch the
clipboard. Empty, unsupported, protected, failed, and timed-out selections save nothing.
The production capture deadline remains 100 ms; a hung provider is retired and stale
replies cannot become saved snippets. Provider compatibility is limited to what that
application exposes through UI Automation. Clipboard capture fallback is deferred and
is not a v1 release gate. Explicit snippet, Markdown, and tray Copy actions intentionally
write the clipboard. Explicit Paste attachment reads clipboard images/files independently of
native capture. Copy/save and return attempt prior-app activation after a confirmed effect and
never simulate paste. macOS runtime code and build targets have been removed.

Use fresh, owned profiles and public fixture text for manual qualification. Keep private
selection text, database exports, profile data, and raw native replies out of logs,
screenshots, issues, and commits. Verify owned process death before deleting temporary
profiles and restore/read back any native preferences a check changes. Ordinary automated
checks do not install or launch the application or change the user's native preferences.

## Dependencies and packaging

`package.json` and `package-lock.json` are the authoritative dependency versions.
Use `npm ci` for reproducible installs; do not use peer override flags. The retained
TypeScript 6.0.3 compatibility exception is documented in the
[historical dependency decision](https://github.com/zeyadomran/promptly/blob/292f584f0424f8b2101d71472d40efc427804be4/docs/dependency-compatibility.md).
Check Node/Electron runtime API support when adding APIs, even if current Node types
accept them. Review current upstream engine/peer requirements before an upgrade.

The Forge Vite plugin bundles main/storage-worker entries and preloads as CommonJS
under the ESM package configuration. Sandboxed preloads need their restricted CommonJS
environment. React, shadcn/Radix, Tailwind, and locally bundled fonts implement the UI.
SQLite comes from Electron's Node runtime; no separate native SQLite npm ABI is rebuilt.

Required brand sources live in `src/renderer/assets/brand/`. Build scripts generate
Windows/tray ICO files from these sources without modifying their provenance metadata.
First-party MIT and third-party notices ship with the package. Preserve the actual
texts and version-specific attribution in [packaging/README.md](packaging/README.md);
the first-party MIT grant does not resolve outstanding installer dependency terms.

## Historical design and qualification records

The former `docs/` tree is retained in
[Git history at the documentation migration baseline](https://github.com/zeyadomran/promptly/tree/292f584f0424f8b2101d71472d40efc427804be4/docs).
Its plans, architecture notes, removed fixture descriptions, and timing receipts describe
their original checkout. They are historical evidence, not current commands or proof
that remaining native/release checks passed. Maintained contributor policy lives in the
root guides; current product instructions live in the wiki.
