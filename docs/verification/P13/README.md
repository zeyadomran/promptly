# P13 window lifecycle verification

Local verification on Windows 11 x64, Node 22.23.2, Electron 44.5.1, TypeScript 6.0.3.
Every packaged launch used the temporary-profile helper and verified Electron's
canonical userData path before issuing app operations. The default user profile
was never opened by these tests.

Passed:

- `npm run check`: strict typechecking, lint/architecture, formatting, 142 unit
  tests in 34 files. Two subsequently added shutdown-order/failure tests also passed.
- `npm run package`: actual Windows distributable with sandboxed preload and worker.
- Nine desktop smoke scenarios passed across the full run and a focused rerun of
  the logo assertion updated for the new title-bar logo. That test verifies every
  loaded logo; it no longer assumes the shell has a single logo instance.
- Independent Compact/Regular geometry, 440px/1000px default widths, regular 1100×700
  restore, compact 590px height restore, separate Compact startup preference,
  persisted pin readback, second launch with one visible window, display-event
  offscreen recovery, restart, Windows close without a tray, and explicit Quit.
- Settings at 500px/800px, shared native/title/footer/settings pin, light/dark theme,
  onboarding native 760×510 geometry, title drag/no-drag CSS, focus signal contract,
  and honest unavailable tray/shortcut mutation results.
- `npm run test:design`: two design/theme/keyboard checks.
- `npm run test:packaged-design`: nonce/CSP, real Radix/Sonner behavior and a second
  owned process proving nonce freshness; the production package was restored.

The two compact images are actual packaged renderer output. Playwright captures
web contents; native caption buttons are outside that capture and require a
native screenshot or manual pointer verification.

macOS execution is delegated to the existing CI platform matrix. Physical
mixed-DPI monitor removal, macOS fullscreen Spaces, drag/resize interruption on
macOS, native caption/traffic-light pointer regions, VoiceOver and Narrator are
manual verification gaps. This is the working lifecycle shell; the later library,
full settings/onboarding flows, tray and global shortcuts retain their own issues.

The independent Windows-selection PR #39 changes main startup/shutdown. Its
integration is pending until it lands on main; window geometry must drain before
its SettingsService/storage/native cleanup chain.
