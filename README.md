# Promptly

A local macOS and Windows desktop library for reusable text snippets.

The P01 foundation opens a React window and verifies a sandboxed preload boundary.
Capture, persistence, the full design system, and library interactions are tracked
in the [implementation plan](docs/implementation-plan.md).

## Development

Use Node **22.23.2** and npm **10 or newer** on Windows or macOS:

```sh
npm ci
npm run dev
```

The development server binds to `127.0.0.1:5173` and fails if that port is occupied.
Renderer edits reload the page; restart development after changing the main process.
Vite transforms TSX with its built-in JSX support. React Fast Refresh is deferred.
No fonts, scripts, or other assets are fetched from a CDN by the app.

```sh
npm run check        # TypeScript, lint, architecture, formatting, functional tests
npm run format       # Format maintained source and docs
npm run package      # Forge: local runnable package in out/, no installers/signing
```

CI runs public service tests and packages the application on Windows and macOS.
GUI and native OS interactions are manual release checks described in
[the test policy](docs/testing.md); automated tests do not qualify those interactions.

## Process boundaries

- `src/main/`: Electron lifecycle and focused services. Windows deny navigation,
  popups, webviews, and permission requests.
- `src/preload/`: a bundled CommonJS script with a read-only platform value exposed
  through `contextBridge`. No raw IPC, filesystem, shell, or command API.
- `src/renderer/`: React components, feature folders, hooks, and styles. Browser
  code imports only renderer/shared modules and approved browser dependencies.
- `src/shared/`: pure contracts; cannot import any process layer or npm dependency.

`npm run check:architecture` parses all application TypeScript, including imports,
re-exports, dynamic imports, and shared modules. It rejects layer escapes, computed
imports, Node globals, runtime code generation, unscanned JavaScript imports, and
unapproved packages. New browser or pure shared dependencies need an explicit checker
allowlist change and review. This is a maintainability gate; runtime isolation also
uses sandboxing, context isolation, disabled Node integration, and a strict CSP.

Keep one React component per implementation file, with explicit re-export entrypoints.
Aim for 50–150 lines per module; the architecture gate flags files over 200 lines.
Business logic belongs in hooks/services rather than JSX. Empty speculative folders
are omitted; create feature-local modules as their owning issues are implemented.

See [dependency compatibility](docs/dependency-compatibility.md) and
[repository maintenance](.github/README.md).
