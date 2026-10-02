# P20 Settings verification

Local Windows 11 x64 verification uses Node 22.23.2, Electron 44.5.1,
TypeScript 6.0.3 and Lucide React 1.50.0. Base main is `a03905d44d09`.

- `npm run check`: strict TypeScript, zero-warning ESLint, architecture and
  Prettier checks; 244 tests in 56 files passed (281 handwritten modules).
- `npm run package`: Windows package passed with the production renderer,
  sandboxed preload and SQLite worker.
- `npm run test:design`: both existing design/theme/keyboard cases passed.
- The two owned Settings UI cases passed. They bundle the actual renderer and
  main settings/lifecycle/IPC services, verify a canonical temporary userData
  profile and substitute only host login/Dock operations. No local login or Dock
  preference was changed.
- Persistence covers login, hide-after-copy policy, startup size, theme and shared
  pin across two processes. Startup size changes preserve current mode; theme and
  pin broadcast to main and Settings. Rejected native login readback produces an
  associated inline alert and preserves durable state, then a successful retry
  commits. Real native close and narrow Back return to the main window.
- The 639/640 breakpoint uses horizontal/vertical Radix navigation respectively,
  with a 190px sidebar at wide sizes. Navigation identity/focus survives resize;
  arrows and Home select the appropriate sections. Document width does not
  overflow; switch rows remain inline while other narrow rows stack.
- Production CSP rejects an unauthorized style, retains `connect-src 'none'`
  and nonce-only styles, and changes its nonce between owned launches. Native
  title drag and narrow Back no-drag CSS regions are asserted.

The [screenshots](screenshots/windows) contain General and Appearance in light
and dark at 440, 639, 640 and 900 logical pixels, plus a real service-rejection
state. Images use one image pixel per CSS pixel; supplied references are roughly
2x. Read-only visual review of all 16 layout images found no clipping, overlap,
unexpected wrapping or actionable reference mismatch. Playwright captures web
contents, so native caption buttons are outside these images.

## Hosted native qualification

`settings-native.spec.ts` is deliberately skipped locally. It requires
`GITHUB_ACTIONS=true` and `RUNNER_ENVIRONMENT=github-hosted`; the owned main fixture
also checks the supported runner and OS before accessing native preferences.
It captures initial login/Dock state before Settings initialization, uses a
canonical temporary profile and exercises the actual Electron controllers.
Cleanup drains geometry, accepted settings and storage before restoring login
and Dock state. Dock restoration uses the production five-second bound, and the
normal/fatal shutdown coordinator retains its 40-second deadline.

The restoration receipt records initial/final OS readback and is attached before
validation or profile deletion, including startup-failure cleanup. Original test,
startup and cleanup errors are retained together. Windows requires successful
login registration. macOS verifies either registration or an accessible rejected
change with unchanged authoritative state: Electron documents that reliable
macOS login registration requires a packaged, signed, notarized application and
unsigned builds may silently reject registration. No signing is performed.
See the [official login-item API](https://www.electronjs.org/docs/latest/api/app#appsetloginitemsettingssettings-macos-windows).
The macOS case separately requires actual Dock hide/show readback and recovery
of a hidden main window before removing its only route.

The initial CI run passed all three macOS Settings cases, but memory-only native
attachments were absent from the uploaded list-reporter artifacts. The receipt
fix writes `native-login-readback.json` and `native-preferences-restored.json` to
the test's output directory and attaches their paths, including startup cleanup.
Two focused regressions verify persistent unsigned-Mac denial evidence and
retention of a failed restoration alongside the original startup/close error
before owned profile deletion. Their local run passed; fresh CI must establish
actual native execution and retained JSON files on the new head.

Fresh hosted native execution and full platform CI remain required on the PR.
Local skipped native checks are not native registration qualification.

## Remaining boundaries

Tray/menu-bar control is unavailable until #26 installs its actual controller;
the switch reflects actual availability rather than the stored requested default.
Current main has no registered shortcut or permission-status service. Shortcuts,
Tags and Storage are honest feature entrypoints for later issues. No manufactured
permission grant, recorder, tag count, import/export success or capture flow is
shown. The hide-after-copy setting is durable policy; the later clipboard flow
must consume it after successful copy. macOS traffic-light/pointer regions,
VoiceOver/Narrator, fullscreen Spaces and installed signed login behavior remain
physical/manual qualification gaps.
