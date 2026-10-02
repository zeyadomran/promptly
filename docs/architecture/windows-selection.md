# Production Windows selection adapter

Status: production adapter implemented; broad real-app release qualification remains open (Refs #11).

`native/windows/` is the maintained .NET Framework helper, compiled with the OS
compiler and warnings as errors. Forge builds it during `generateAssets` on
Windows and copies `promptly-windows.exe` directly into application resources,
outside ASAR. No compiler is required on the installed machine. The Vite plugin's
default packaging filter keeps source/test fixtures out of the application ASAR.
Only Windows x64 packaging is supported. Unsupported host/target platforms and
architectures fail before generating package assets.

## Main-owned API and lifecycle

`createWindowsSelection({resourcesPath, packaged, applicationPath})` receives only
Electron main's application paths. Its API is `ready()`, `foregroundIdentity()`,
`captureSelection(identity)`, `activateSource(identity)`, and `dispose()`.
The private `foregroundIdentityResult()` variant retains structured failure status;
the convenience identity method still returns null on failure. Both enforce the
same 100-ms identity request deadline and retain no request/response diagnostics.
No renderer bridge method, persistence service, shortcut hook, clipboard access,
Copy injection, permission prompt, automatic elevation, or capture pipeline is
introduced here. Issue #9 owns hooks and shortcut recognition.

Call `ready()` during startup, then obtain `foregroundIdentity()` immediately when
the shortcut fires, **before changing any application UI**. Keep that exact frozen
identity object for the ensuing capture. Native records HWND, PID and process
creation time; the private pipe carries a random native-issued token. Main keeps a
WeakSet of identity objects, so a copied/renderer-supplied object cannot activate
an application. Native retains at most 32 tokens; evicted tokens fail safely.
Capture validates HWND/PID/creation time/foreground both before and after UIA.
Activation validates the same live identity, denies higher-integrity or unreadable processes, calls
`SetForegroundWindow`, and reports `activationDenied` when Windows refuses it.
It never launches a path, shell command, or application inferred from a name.

Only safe nullable provenance `{pid,name,id}` leaves the helper: `id` is a bounded
executable basename, without a path or document/window title. `QueryFullProcessImageName`
reads the actual basename through a minimum-query-rights handle whose creation time
matches the recorded identity on that same handle; failures yield null provenance.
It preserves non-`.exe` suffixes and extensionless images rather than inventing a suffix.
Persist only display
name and basename through a later main capture service. Live identity tokens are
not portable or persisted. **A stored basename alone cannot activate after an app
or helper restart.** The later Open source app operation must take a snippet ID,
read authoritative stored provenance in main, safely resolve a running OS app and
revalidate HWND/PID/creation time, or return unavailable. It must never accept a
renderer-provided path/PID as sufficient identity. That resolver is not implemented.

`NativeProcess` is the private helper transport boundary:
`request(command,payload,parse,deadlineMs)` and `dispose()`. It serializes requests,
admits at most four requests (one active), caps each request at 4096 bytes, and
validates every matched response with the supplied strict runtime schema.
Requests expire from admission, including time spent queued. Dispatch drops expired
queued requests before writing their bytes, even when main-thread work delays timer
callbacks; an expired activation cannot execute. Capture and identity
operations have a 100-ms deadline; initial readiness has a separate 5-second
deadline. An active timeout/protocol error kills the isolated helper, rejects all
admitted requests, and permits a fresh process on the next call. IDs never repeat;
retired-process data and mismatched IDs are dropped. Absolute deadlines are checked
again around response validation, so a delayed timer cannot admit an expired result.
Disposal rejects pending work, closes stdin for clean EOF and kills a blocked helper
after a 250-ms grace period. Its idempotent Promise resolves when exit is observed.
The production main starts readiness early and prevents `before-quit` until that
disposal finishes, so a blocked child is not stranded when Electron exits. It does
not install a capture IPC method.

One shared quit coordinator distinguishes cleanup started from cleanup complete and
prevents every repeated quit request while cleanup is pending. It awaits both
storage close and native disposal with `allSettled` **after settings drain settles**,
then aggregates failures. Settings controllers retain live storage/native resources
until their accepted effects and commits settle; a settings rejection still attempts
both remaining cleanups.
A fast failure cannot release the quit gate while the other cleanup is pending.
Fatal storage initialization and window creation failures use that same idempotent
cleanup before calling `app.exit(1)`, which otherwise bypasses `before-quit`.
Repeated fatal/ordinary quit requests cannot start another cleanup. An overall
40-second cleanup watchdog bounds a service that never settles, allowing the
storage client's accepted 30-second writes and 5-second close request to drain.
Native disposal retains its earlier 250-ms EOF-to-kill watchdog, including when
the helper is blocked before its input loop during UIA initialization.
The final exit preserves code 1 for fatal failures; cleanup errors remain reported.

Frames are byte-bounded at **6,356,992 UTF-8 bytes**, excluding LF. UTF-8 decoding
is strict across fragments, malformed/partial EOF frames fail closed, and no stderr
or request/response text is logged. Ordinary diagnostics are structured statuses.
Production accepts only capabilities/foreground/capture/activate/stop. Spike-only
fixture, hook and clipboard commands are invalid even with command-line flags.
`expectedPid` and `includeText` retain exact JSON int/boolean parsing: omission alone
defaults; null, strings, fractional/overflow PID and coerced flags are invalid.

## Selection semantics and initialization

UIA reads only `FocusedElement` and its `TextPattern.GetSelection()` ranges after
checking `IsPassword`. It never reads `DocumentRange`, clipboard data or a fallback
document. Ranges are joined in provider array order with exactly one LF separator,
including degenerate ranges; whitespace, CRLF, controls, quotes and supplementary
Unicode remain exact. Empty means zero UTF-16 units; whitespace selections remain
`ok` for the later normalization pipeline. Native caps 4096 ranges and 1,048,576
UTF-16 units; an extra unit detects overflow, which returns `selectionTooLarge`
without truncation. Missing TextPattern is `unsupported`, protected fields are
`secureInput`, denied target/provider access is `permissionDenied`, and foreground
races discard text as `foregroundChanged`. Provider exceptions are `providerError`;
blocked calls are `timedOut`; crash/protocol failure is `helperUnavailable`.

Access checks compare the helper's numeric `TokenIntegrityLevel` with the target's
level. A `PROCESS_QUERY_LIMITED_INFORMATION` handle must report the recorded process
creation time on that **same handle** before its `TOKEN_QUERY` token is inspected.
Equal/lower known integrity is allowed to proceed to bounded UIA; higher integrity,
missing tokens, unavailable handles and creation-time mismatch fail closed. Actual
UIA denial is still `permissionDenied`. This adds no elevation, UIAccess or CI bypass.
The former native policy fixtures are historical verification; actual integrity
and UIA behavior now require manual Windows release qualification.

## Historical native verification

The former native fixture and packaged smoke suites have been retired. The
receipts below remain historical evidence and failures; current automated coverage
is the canonical public functional suite in [testing policy](../testing.md).
They do not qualify current cold capture deadlines or arbitrary source applications.

Initial [Windows CI](https://github.com/zeyadomran/promptly/actions/runs/36971422371)
failed three positive owned-fixture cases with `permissionDenied`: the former guard
accepted only `TokenElevation == 0`, regardless of the helper's context. That blanket
guard is replaced by the relative integrity rule. Capabilities and owned fixture
receipts now retain numeric integrity levels to verify the inherited CI context;
these receipts contain no selection text. [Passing hosted Windows CI](https://github.com/zeyadomran/promptly/actions/runs/36972752336)
recorded helper and owned targets at integrity level **12288**, with all positive
capture fixtures passing. Receipts are printed and written to a Playwright output
JSON file for CI artifact retention. Inherited-context success does not prove
an actual medium-integrity app can read a high-integrity target.

[Later hosted CI](https://github.com/zeyadomran/promptly/actions/runs/36974533857)
returned `timedOut` for a freshly initialized simulated denied WPF provider under
the production 100-ms budget; earlier CI measured that denial at about 93.6 ms.
The failed run did not retain its numeric receipt, so its exact latency is unknown.
Native error-classification tests now use a separate, explicit 5-second **test-only**
transport deadline to assert `permissionDenied` and `providerError` exactly.
Production capture remains fixed at 100 ms: a deliberately delayed denied provider
must time out without text, kill the helper, reject its stale identity and recover
through a new process. A late permission exception cannot replace a timeout result.
These cases do not qualify timely denied-app capture or full-pipeline latency.
Fixture results are recorded before assertions and saved in `finally`, including
incomplete runs, so failed assertions retain observed status/timing evidence.

Before answering capabilities, the helper reads only
`AutomationElement.RootElement.Current.ProcessId` to initialize UIA/COM without
querying selected text or focused controls. A failed warmup fails readiness; a
blocked warmup is killed by the startup watchdog. This moves initialization ahead
of user capture without hiding its cost. Every replacement also initializes before
ready. A provider can still initialize slowly or hang, so deadlines remain necessary.

## Verified evidence and remaining matrix

Local receipt: 2026-10-02, Windows 11 Home 25H2 build 26200, x64,
AMD Ryzen 7 7800X3D, Node 22.23.2, Electron 44.5.1; unsigned helper.
`npm ci`, `npm run check`, `npm run package`, and `npm run test:smoke` pass.
No dependencies were added; `npm outdated` reported only the intentionally retained
TypeScript 6.0.3 versus latest 7.0.2 compatibility exception.

| Controlled case | Result |
| --- | --- |
| WPF custom TextPattern provider | Exact Unicode/control/quote/CRLF/whitespace text; disjoint ranges joined exactly |
| WPF degenerate, protected, missing TextPattern | Distinct empty/secureInput/unsupported, without selection text on failures |
| WPF provider access denial and provider exception | Distinct permissionDenied/providerError; simulated provider denial, not elevated-app qualification |
| WPF foreground HWND changes during GetSelection | foregroundChanged; no returned text |
| WPF provider blocks 10 seconds | 100-ms watchdog kills helper; stale identity rejected and fresh capture recovers |
| Full one-Mi control-character payload, max+1 | Complete escaped frame decoded; overflow explicitly rejected (fixture-only 5-second deadline) |
| Owned Chromium 152.0.7977.130 textarea in Electron 44.5.1 | Exact selected Unicode text via the packaged production helper; only verified fixture process tree may be captured |
| Native malformed options, spike-only commands, EOF | Invalid requests; no test mode; clean EOF exits 0 |
| Owned fixture renamed to `.exe`, `.com`, and extensionless image | Actual basename retained; normal exact selection succeeds for all three |
| Transport crashes, invalid/oversized/partial frames, expired validation | Fail closed, bounded queue, late data dropped, fresh helper recovery, disposal |

The Chromium fixture uses a separate **test-only** WPF focus driver to activate an
owned Chromium HWND after verifying its PID. Local Windows refused Electron's
initial focus request; the test retains the foreground assertion and never reads
the user's app. Production capture itself changes no focus.
Its fixture startup now has a separate 15-second owned-foreground readiness limit.
Identity-only polls record status, ownership and elapsed time; they never request
selected text. The subsequent production capture is requested once with its fixed
100-ms deadline and exact-text assertion. An earlier hosted Chromium failure had
null identity/source without enough diagnostics to distinguish initialization cost,
foreground change or unavailable provenance; this remains a qualification gap.
Receipts survive failures and expose those cases without logging another app's PID,
name, window title, identity token or text. Fixture readiness cost is separate from
the later shortcut-to-toast requirement.

Hosted Windows run 36978397436 failed at the CSP test's second owned Electron
launch: `firstWindow` reported a closed target after 27.7 seconds, below the
45-second test limit. It retained no process exit or startup stderr diagnostics;
the original cause remains unknown. Two local two-launch checks passed. The
latest check retained separate readiness times of 1008/927 ms, fresh CSP nonces
and exit code 0 for both processes. Each owned launch now retains JSON stage,
elapsed-time, exit/signal and output-byte counters, plus recognized fixed startup
failure markers; it never retains raw process output. First-window readiness has
a separate 20-second test limit. A deliberately unsupported schema in a new owned
temporary profile exercises the closed-target startup failure and asserts exit
code 1 with the initialization-failed marker. This proves diagnostic retention,
not the cause or resolution of that hosted failure; fresh exact-head CI is required.

Recorded complete local fixture receipt (n=1 startup, n=10 selected captures): UIA
root warmup **55.4974 ms**, helper start-to-capabilities **86.4545 ms**, process
launch-to-ready **235.3208 ms**. First owned selected capture native **14.3547 ms**,
pipe/adapter round trip **17.3502 ms**; remaining nine round trips max **3.0505 ms**.
Disjoint native/round trip **18.317/19.2967 ms**; blocked provider returns timedOut
in **105.1985 ms** including local scheduling/teardown. Native duration excludes
JSON and pipe; round trip excludes prior identity acquisition and helper/fixture
startup. The operating system's UIA service had already been exercised locally;
this is **not a clean-machine cold-service measurement**. CI logs retain equivalent
fixture-only aggregates, and truly cold CI readiness may still cost hundreds of ms.
The spike's prior cold **774.0635-ms** failure remains historical evidence, not
proof that every provider's first read now meets a budget.

The under-150-ms **shortcut → capture → persistence → visible toast** requirement
remains unverified in P11/P12/P28. Large selections may exceed 100 ms and safely
return timedOut. Startup warmup, fixture timing and warm capture are distinct costs.

| Required human qualification | Current state |
| --- | --- |
| Real Notepad, Chromium browser releases | Unverified; owned Chromium fixture proves a narrow provider path only |
| Cursor / VS Code | Unverified |
| Windows Terminal / ConPTY, running command safety | Unverified; no Copy/input injection exists in production |
| Actual elevated app, secure desktop, denied OS access | Unverified; no elevation prompt requested |
| Fullscreen/multi-monitor, assistive technology, no focus theft | Controlled foreground race passes; broad human matrix unverified |
| Packaged Windows ARM64, distribution signing | Unverified; signing is user-controlled and outside this work |

Use disposable, user-owned fixture text for these human checks; record app/OS
versions, native status, foreground before/after, complete-text equality and timing.
Do not probe private selections. Keep #11 and #5 open until their human matrix
criteria are met; this PR uses Refs rather than an automatic closing keyword.
