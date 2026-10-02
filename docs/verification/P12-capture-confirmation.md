# P12 capture confirmation implementation

The Windows confirmation uses its own transparent, nonfocusable, taskbar-excluded BrowserWindow. It has no parent or desktop IPC registration, denies navigation/window/webview/permission requests, uses a sandboxed isolated preload, and shows only through `showInactive()`. Library pin/background/chrome changes exclude this overlay. Ordinary-window closure forwards the existing app event when only overlays remain, preserving the app's recovery-aware quit policy.

CaptureService publishes the committed immutable preview directly to the main-only subscriber. The renderer receives only saved/duplicate status, a bounded exact first-line prefix (at most 512 UTF-16 units without splitting a surrogate pair), theme, presentation phase and a numeric version. No snippet identity, native capability/token, HWND, source metadata or display coordinates cross this preload. Failed, empty, disabled or unplaceable confirmations show nothing. No content is logged or reread from a mutable snippet.

The service keeps one latest confirmation, one owned window/load and one active timer. Replacement captures reset the deadline. Main requests the 200 ms exit at 2300 ms and hides at 2500 ms, even when the renderer never focuses. Theme/display updates retain this deadline. Shutdown cancels the timer, aborts pending Electron initialization, unsubscribes capture/display observers and destroys the owned overlay. Loading failure releases the window for a later fresh attempt.

## Rendering and security

The supplied 290 px card uses the existing logo, Space Grotesk and Geist Mono assets, 12/14 px padding, 8 px radius, saved/duplicate title, `now` time and ellipsized one-line preview. Its transparent host reserves 20 px around the card for the shadow. Light/dark/system follows existing CSS color tokens; reduced motion disables both animations.

Sonner 2.0.8 is used headlessly (`useSonner` plus `toast.custom`) with a single constant ID and no Toaster component. Its installed Observer replaces the matching active record and filters a dismissed record before readding it; the dismissed-ID set/pending dismissal map and local active list therefore stay bounded to that ID. A replacement also cancels its pending dismissal frame. Main controls visibility, so Sonner's focus/blur expiration is irrelevant.

Both renderer entries retain the reviewed Sonner emitted-style hash `sha256-StEaX+se6YS7pqjzrzMIA0KaX9zF/8zAhvQXZAe5epY=` and the empty-style hash. The build verifies installed CSS bytes before producing the policy. The overlay uses static stylesheet animations instead of Sonner's inline Toaster layout; its entry/exit are a 200 ms slide/fade. Its dev CSS uses Vite's nonce support; neither overlay CSP contains `unsafe-inline`. Production uses a fresh session nonce. The overlay's distinct ephemeral session keeps its directory-scoped asset handler separate from the main renderer's cached handler.

## Source display placement

The Windows helper's foreground reply includes only a private validated DWM frame rectangle in physical screen coordinates. DWM extended bounds are not DPI-adjusted, unlike GetWindowRect ([Microsoft documentation](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getwindowrect)). Width/height must be positive and finite coordinates are validated before use.

Main calls `screen.screenToDipRect(null, rectangle)` and `getDisplayMatching` before positioning within that display's current work area. Electron documents monitor-aware physical-to-DIP conversion on Windows ([screen API](https://www.electronjs.org/docs/latest/api/screen)). No scale-factor division or cursor-display guess is used. Display addition/removal/work-area/scale changes recompute placement, including negative monitor origins. Missing source bounds suppress confirmation without changing durable capture success.

## Functional evidence and remaining qualification

The canonical public lifecycle test was introduced red (service absent), then green. Extending it to require the exit phase at 2300 ms failed with `phase` missing; implementing the main-owned exit made the same flow green. It observes committed payload, duplicate replacement, one timer, changed theme/work area, failed/empty/disabled suppression and shutdown while a late external window is loading. Internal service code is real; only external window, timer and display ports are faked.

Local verification passed `npm run check`: all three TypeScript projects, strict ESLint, architecture (335 handwritten modules), Prettier and 21 functional tests in 18 files. The corrected Windows x64 package build passed. Read-only ASAR inspection verified the separate renderer HTML, sandbox preload, two logo assets and five font assets. Hashing Sonner's installed ESM stylesheet independently matched the production CSP; the packaged overlay policy contains the nonce placeholder and no `unsafe-inline`.

The first package command succeeded but inspection caught Forge's relative output directory following the overlay source root. An explicit project output directory corrected placement; targeted type/lint checks and the resulting package were verified. No product launch was used.

No automated GUI/E2E or native input/preference/clipboard work is used. Keyboard focus/keystroke continuity, actual hidden/minimized/pinned cases, first-paint latency, mixed-DPI/disconnected monitors, exclusive fullscreen/topmost limitations, taskbar absence and NVDA announcements remain manual Windows release qualification. This implementation does not close issue #15 or qualify earlier capture-to-toast performance targets.
