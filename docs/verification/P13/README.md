# P13 window lifecycle verification

Local verification on Windows 11 x64, Node 22.23.2, Electron 44.5.1, TypeScript 6.0.3.
Every packaged launch used the temporary-profile helper and verified Electron's
canonical userData path before issuing app operations. The default user profile
was never opened by these tests.

Passed:

- `npm run check`: strict typechecking, lint/architecture, formatting, 206 unit
  tests in 47 files after integrating main `9b13dd03` and the native shutdown chain.
  This includes rapid mode switches, quit during animation, load/ready ordering,
  failed renderer destruction, and actual-main normal/fatal cleanup ordering.
  Readiness terminal-event tests use the actual factory/lifecycle modules, verify
  fresh retries after close/renderer exit, both load/ready orderings, reverse
  ready-first load rejection, deadline cleanup and observation of late rejection.
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

The review-fix verification reran the four applicable Windows packaged cases:
lifecycle, chrome, failed Settings renderer followed by successful retry, and
unsupported-database startup failure. All passed. Normal owned processes exited
0; the intentionally unsupported database exited 1 before opening a window and
retained the merged startup diagnostics. The separate macOS Dock test awaits CI.
The CSP run again passed with two normal exit-0 processes. Native visibility
receipts record route availability and show/hide/minimize/restore events; CI
retains those JSON attachments with its controlled fixture results.

The terminal-readiness delta packaged lifecycle, chrome and failed-load retry
checks passed. The new native auxiliary-close regression holds its renderer request,
destroys that owned Settings window before load/paint, verifies the open settles
with a recoverable result and then renders a fresh Settings window. Its focused
run passed with a normal process exit 0. The macOS fixture includes the native
workspace method while production fullscreen-space behavior remains intact.

The first PR CI Windows restore failure compared an unclamped 1100px rectangle
with a 1024px desktop. The restart/restore test now derives its expected rectangle
independently from the actual display work area, while keeping the product clamp.
The first macOS hide failure did not retain Dock/event evidence, so its cause is
unconfirmed. A separate delayed ready-to-show callback race was reproduced in the
factory test and removed: initial load and readiness settle before the caller can
hide. New macOS tests explicitly exercise both real Dock-enabled hiding and
Dock-disabled reachable visibility, freezing route availability across commands.

The two compact images are actual packaged renderer output. Playwright captures
web contents; native caption buttons are outside that capture and require a
native screenshot or manual pointer verification.

macOS execution is delegated to the existing CI platform matrix. Physical
mixed-DPI monitor removal, macOS fullscreen Spaces, drag/resize interruption on
macOS, native caption/traffic-light pointer regions, VoiceOver and Narrator are
manual verification gaps. This is the working lifecycle shell; the later library,
full settings/onboarding flows, tray and global shortcuts retain their own issues.

Windows-selection PR #39 is integrated. Geometry drains first, then accepted
SettingsService work, followed by storage/native disposal through the same
40-second normal/fatal shutdown coordinator. Recovery errors remain visible even
when following cleanup succeeds. Fresh Windows/macOS CI and Astra review remain
required before merge; these local checks do not claim those results.
