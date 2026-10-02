# Disposable native capture feasibility harness

This is P03 research code, outside application modules. It compiles unsigned platform executables and checks a private stdio protocol. It never writes to the clipboard or injects Copy/keys. It is not universal selection support. See [the adapter decision and actual evidence matrix](../../docs/architecture/native-capture-decision.md).

Windows (PowerShell; OS .NET Framework compiler):

```powershell
./experiments/native-capture/build-windows.ps1
node experiments/native-capture/protocol-check.mjs
```

macOS (Xcode command line tools):

```sh
sh experiments/native-capture/build-macos.sh
node experiments/native-capture/protocol-check.mjs
```

Only on a disposable/controlled desktop, add `--fixtures` to launch three short-lived WPF (Windows) or bundled AppKit (macOS) windows. They temporarily receive focus, select fixed public text (or no text/password), then close. The driver asserts exact fixture text privately and prints only status/count/duration aggregates. macOS fixture readiness separately asserts ownership of the foreground; permission denial is recorded as unverified selection rather than capture success. CI uses these fixture windows; the basic local protocol command creates no visible window and probes no private selection. Hook installation is short-lived; ordinary key characters are never emitted.

Send one JSON request per newline to `out/promptly-native[.exe]`, for example `{"v":1,"id":"1","command":"capabilities"}`. A `capture` request without `includeText` only reports status/length and minimal app identity. Use `expectedPid` when testing a known fixture; a mismatch never reads the selection. Production capture text is sensitive: never redirect raw responses to logs or commit them. `fallback` always returns an explicit safe skip. `clipboardMetadata` enumerates advertised types/counters without materializing data. Closing stdin or `stop` exits the helper and releases hooks.

The driver watchdog kills a blocked helper after 2 seconds. It validates foreground mismatch, denied fallback, metadata-only counter observation, hook installation and Alt+Space registration probe. Durations are native capture time, not full capture-to-toast latency. A changing clipboard counter is reported as a concurrent change; the harness never restores old content over it.

To complete the human matrix, record OS/build/architecture, app/version, permissions, selected fixture label (never real contents), expected/result status, source PID match, native duration and actual toast duration. Cover editors, Chromium, native terminals and integrated terminals, no selection, secure/password fields, revoked grants, elevated windows, fullscreen, competing Alt+Space binding and left/right modifier overlap. On macOS independently toggle Accessibility and Input Monitoring and test Secure Input. Keep user data/commands/clipboard intact; terminal Copy injection remains disabled. Do not mark clipboard round trips or terminal-specific Copy as passed because fallback skipped them.

Production promotion additionally needs response validation, bounded output outside native hook callbacks, deadlines, renderer-safe provenance, reset-on-hook-loss, packaged resource launch, architecture builds and TCC identity verification. Signing remains user-owned.
