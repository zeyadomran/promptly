> Historical research notes only. The disposable executables, scripts and automated native fixtures described below have been removed. Current Windows-only production helpers live under native/windows and native/keyboard/windows; no macOS runtime or build target remains. Historical receipts are retained in docs/verification.

# Disposable native capture feasibility harness

This is P03 research code, outside application modules. It compiles unsigned platform executables and checks a private stdio protocol. It never writes to the clipboard or injects Copy/keys. It is not universal selection support. See [the adapter decision and actual evidence matrix](../../docs/architecture/native-capture-decision.md).

Windows (PowerShell; OS .NET Framework compiler):

```powershell
./experiments/native-capture/build-windows.ps1
node experiments/native-capture/protocol-check.mjs
node experiments/native-capture/protocol-safety-check.mjs
```

macOS (Xcode command line tools):

```sh
sh experiments/native-capture/build-macos.sh
node experiments/native-capture/protocol-check.mjs
node experiments/native-capture/protocol-safety-check.mjs
```

Only on a disposable/controlled desktop, add `--fixtures` to launch three short-lived WPF (Windows) or bundled AppKit (macOS) windows. They temporarily receive focus, select fixed public text (or no text/password), then close. The driver asserts exact fixture text privately and prints only status/count/duration aggregates. macOS fixture readiness separately asserts ownership of the foreground; permission denial is recorded as unverified selection rather than capture success. CI uses these fixture windows; the basic local protocol command creates no visible window and probes no private selection. Hook installation is short-lived; ordinary key characters are never emitted.

Send one JSON request per newline to `out/promptly-native[.exe]`, for example `{"v":1,"id":"1","command":"capabilities"}`. A `capture` request without `includeText` only reports status/length and minimal app identity. Use `expectedPid` when testing a known fixture; a mismatch never reads the selection. Production capture text is sensitive: never redirect raw responses to logs or commit them. `fallback` always returns an explicit safe skip. `clipboardMetadata` enumerates advertised types/counters without materializing data. Closing stdin or `stop` exits the helper and releases hooks.

The driver uses a separate, bounded 5-second process-launch-to-capabilities readiness deadline before ordinary requests. Its existing ordinary-request watchdog still kills a blocked helper after 2 seconds. This disposable feasibility budget is not the production adapter's 100-ms capture budget. Startup receipts report elapsed milliseconds, process/exit state and output byte counts without retaining output text; timeout/exit diagnostics use the same structured fields. A delayed-start regression reproduces startup taking more than the former shared 2-second timer.

Owned fixture readiness also keeps its existing five-second deadline, but now
settles on validated metadata, process error/exit, stream failure/closure or timeout.
Metadata is limited to 4 KiB and a positive owned PID; output text is discarded.
Direct-child cleanup waits for [Node's process-and-stdio `close` event](https://nodejs.org/download/release/latest-jod/docs/api/child_process.html#event-close),
with 500 ms after SIGTERM and another 500 ms after SIGKILL. It reports failure if
termination was not observed. macOS retains LaunchServices launch: its fixture
writes a candidate PID sidecar immediately, and the driver verifies the live
executable and fresh per-launch ready-file arguments before each signal. Each
identity probe has a 200 ms bound; each termination phase polls for at most 500 ms.
Missing or changed identity is reported as cleanup unverified without signaling
that candidate. Readiness and cleanup receipts retain only stage/mode, timing,
PID, exit/signal/error codes and byte counts. The native CI workflow retains
`test-results/native-feasibility/fixture-lifecycle.json` on success or failure.
See [the retained failure and follow-up evidence](../../docs/verification/P03/README.md).

Windows owned fixtures emit flushed, fixed startup-stage markers on stderr from
main entry through WPF construction, run/source initialization, Loaded/rendered
events, metadata output and timer registration. The driver decodes at most 8 KiB
and retains at most 32 validated stage/timing/HRESULT records; arbitrary stderr
and exception messages are discarded. These markers diagnose a live fixture
that times out without stdout. They do not change the five-second deadline or
establish the cause of previous timeouts.

It validates foreground mismatch, denied fallback, metadata-only counter observation, hook installation and Alt+Space registration probe. Durations are native capture time, not full capture-to-toast latency. A changing clipboard counter is reported as a concurrent change; the harness never restores old content over it.

The safety driver launches a separate helper with `--protocol-fixtures`, rejects malformed capture options before any native selection call, and privately compares synthetic quote/control/Unicode-heavy payloads at the selection boundary. It prints only assertion counts. All helpers/client enforce the same 6,356,992-byte escaped-response budget for up to 1,048,576 UTF-16 selection units; overflow returns `selectionTooLarge` without truncation. Supplied PID must be a JSON integer in 1–2,147,483,647; supplied `includeText` must be a JSON boolean. Only omitted fields use defaults.

To complete the human matrix, record OS/build/architecture, app/version, permissions, selected fixture label (never real contents), expected/result status, source PID match, native duration and actual toast duration. Cover editors, Chromium, native terminals and integrated terminals, no selection, secure/password fields, revoked grants, elevated windows, fullscreen, competing Alt+Space binding and left/right modifier overlap. On macOS independently toggle Accessibility and Input Monitoring and test Secure Input. Keep user data/commands/clipboard intact; terminal Copy injection remains disabled. Do not mark clipboard round trips or terminal-specific Copy as passed because fallback skipped them.

Production promotion additionally needs response validation, bounded output outside native hook callbacks, deadlines, renderer-safe provenance, reset-on-hook-loss, packaged resource launch, architecture builds and TCC identity verification. Signing remains user-owned.
