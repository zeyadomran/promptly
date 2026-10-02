# Production macOS selection adapter (P08)

The persistent unsigned Swift helper uses only AppKit, ApplicationServices, Carbon
and CoreGraphics. Forge builds on macOS and copies `promptly-macos` to the app's
`Contents/Resources/` outside ASAR. Electron main resolves that fixed path; the
renderer never selects a native binary, supplies native identity, or starts a
selection/activation request. No npm dependency was added.

`MacosSelection` shares the Windows `NativeProcess` transport, including the
four-request admission bound, byte-bounded NDJSON, response schemas, absolute
deadlines, process replacement and late-frame rejection. The read-only framework
handshake has a separate 5 second startup budget. Foreground identity, capture,
permission checks and activation each have a 100 ms production pipe budget.
AX objects additionally receive 25 ms per-message timeouts. A blocked or cumulative
slow provider is isolated and killed; returned text is never truncated or logged.
Disposal shares the transport's bounded EOF/terminate behavior.

Each capture trigger must record a fresh `foregroundIdentityResult()` before any
Promptly window operation, then pass that main-held object to `captureSelection()`.
Startup and normal window opening also record foreground before showing a window;
that observation is discarded and must never be reused for future captures.
The helper creates an opaque random token and retains the OS running application,
PID, launch date and exact nullable bundle ID. It revalidates process creation,
bundle ID and frontmost PID before and after selection. Only 32 native identities
are retained, so evicted/restarted/stale capabilities fail closed. Copies of a
main-held identity object fail the adapter's WeakSet check. Activation only calls
the previously validated `NSRunningApplication`, after process/bundle revalidation;
it never launches a path or runs a command from persisted metadata or snippet text.

AX reads the focused element and verifies its PID. Global Secure Input and secure
text-field subrole are checked before text access. Accessibility and Secure Input
are rechecked after reads. `AXSelectedText` preserves whitespace, Unicode, multiline
text and embedded NUL. Multiple `AXSelectedTextRanges` are concatenated in the
provider's order using `AXStringForRange`; unsupported ranges fail explicitly.
More than 64 ranges are unsupported. The total is bounded at 1,048,576 UTF-16 units;
the serialized frame ceiling is 6,356,992 UTF-8 bytes, excluding its newline.
Failure results contain no text: empty, unsupported, permissionDenied, secureInput,
foregroundChanged, selectionTooLarge, providerError and transport timedOut are
distinct. No clipboard read/write, key injection, AX action or focus change exists
in the preferred capture path.

Permission status is queried currently on every call with `AXIsProcessTrusted()`
and `CGPreflightListenEventAccess()`; neither requests permission. Accessibility is
required for selection. Input Monitoring is required for the planned passive
keyboard hook, owned by P07; this helper does not install a hook. A helper failure
reports unknown permission status. Named IPC `getMacosPermissions` and
`openMacosPermissionSettings` expose the status and exactly two fixed System
Settings destinations (Accessibility and Input Monitoring), through the existing
authorized-window and strict-schema boundary. They accept no URLs or paths.
Revocation rejects selection without unsafe fallback. No Screen Recording,
AppleScript automation, root or extra permission is requested.

## Verification status

Windows development host: clean install and strict repository checks are run
locally (181 unit tests, type checking, lint, architecture and formatting passed),
and Windows Forge packaging passed. [Native CI at `f074170`](https://github.com/zeyadomran/promptly/actions/runs/36983333651)
confirmed the production Swift and AppKit fixture compile on macOS. [Packaged macOS
CI at the same head](https://github.com/zeyadomran/promptly/actions/runs/36983333689)
passed the guarded text/focus/protocol/restart fixtures. A further regression
test launches actual packaged Promptly with an isolated owned profile, records the
fixture's identity before Promptly takes foreground, then activates the background
fixture through the main adapter and verifies OS foreground, exact selected text,
selection range and pasteboard counter. Its latest-head CI must pass before
claiming that activation handoff is qualified. Tests launch
only the owned unsigned AppKit `.app`, never sample a user's private selection,
and do not grant/revoke TCC or modify user System Settings. The protocol fixture
uses a longer deadline solely to verify the full escaped maximum-size frame,
separate from the production 100 ms budget. The permission revocation unit test
models a status transition; it does not prove an actual user TCC cycle.

[Activation CI at `45c6cb3`](https://github.com/zeyadomran/promptly/actions/runs/36985116730)
failed at fixture identity recording before capture or source activation. The
retained receipt contained only outcome booleans, so neither a timing cause nor a
permission/identity cause is established. The revised test waits for the owned
Promptly renderer and native window to finish showing before fixture launch, then
uses at most five seconds of identity-only owned-PID readiness checks. Every native
identity request remains bounded at 100 ms; capture and actual activation are never
retried. The receipt retains stage, current fixture-foreground booleans, helper
status, owned target/source availability, Promptly-match booleans and timing without
logging unrelated app identity or selection. Latest-head CI must qualify this fix.

The fixture receipt records hardware/OS/Node architecture, helper startup and
separate cold/warm native and pipe durations, plus focus/selection/pasteboard-count
checks. These figures exclude shortcuts, persistence and toast display. P11 owns
the full under-150-ms capture-to-toast pipeline and its evidence.

Issue #10 remains open pending the human release matrix: Apple Silicon and Intel
editors, browsers and terminals, actual Accessibility/Input Monitoring grant and
revocation, Secure Input, fullscreen, real app focus behavior and final packaged
distribution/TCC identity. Unsigned CI behavior cannot establish signed app TCC
inheritance or onboarding permission success. Signing/notarization stays user-owned.

## Primary API references

- [Apple AX messaging timeouts](https://developer.apple.com/documentation/applicationservices/1459345-axuielementsetmessagingtimeout)
- [Apple selected text ranges](https://developer.apple.com/documentation/applicationservices/kaxselectedtextrangesattribute)
- [Apple string for range](https://developer.apple.com/documentation/applicationservices/kaxstringforrangeparameterizedattribute)
- [Apple running application launch date](https://developer.apple.com/documentation/appkit/nsrunningapplication/launchdate)
- [Apple validated running application activation](https://developer.apple.com/documentation/appkit/nsrunningapplication/activate(options:))
- [Apple passive event access preflight](https://developer.apple.com/documentation/coregraphics/cgpreflightlisteneventaccess())
- [Apple Secure Input](https://developer.apple.com/library/archive/technotes/tn2150/_index.html)
