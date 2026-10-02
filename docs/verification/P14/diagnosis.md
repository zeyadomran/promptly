# Windows runner performance diagnosis

The exact `2455ea9` CI run 36979837706 passed Mac but failed Windows. The
[Windows receipt](incomplete/windows-visible-preview-failure-2455ea9.json)
records 85.4ms maximum (`e`: bridge40.2, worker21.5, React19.3, frame25.1),
73.1ms first `i`, 75.4ms worst last-item query despite worker4.1ms, and
57.9ms complete-highlight paint. The [Mac receipt](macos-visible-preview-2455ea9.json)
records max49.2ms. Both screenshots had the corrected visible wrapped preview.
The Windows machine was EPYC9V74/2logicalCPUs/8GiB; Mac M2ProVirtual/5CPUs/14GiB.
This is an unresolved qualification failure until fresh ordinary CI passes.

## Focused experiments

The opt-in `PROMPTLY_SEARCH_PROFILE=1` helper records a Chromium CPU profile.
Profiled samples are diagnostic only. A local PowerShell parent process was
restricted with ProcessorAffinity=3 for the two profiled experiments; child
inheritance was not independently captured, so they do not simulate or qualify
GitHub's two-CPU machine. Hardware is the documented Ryzen7800X3D/16CPUs/31.15GiB.
No qualification run sets affinity, profiler, frame-rate or throttling flags.

- [Old mark DOM diagnostic](baseline-diagnostic-profile.json) passed max36.3ms;
  [CPU profile](baseline-renderer.cpuprofile) includes React/DOM work and injected
  Playwright reads, and does not isolate physical presentation.
- [Native highlight diagnostic](incomplete/native-shared-registry-diagnostic-failure.json)
  reduced React phase to roughly0.5–3.1ms and complete-highlight paint21→14.2ms.
  It still failed157.1ms: last-item query worker2.7, bridge32.3, React0.4,
  frame124.0ms. Another query had bridge90.3ms despite worker2.8ms.
  [Profile](native-shared-registry.cpuprofile) retained. These scheduling stalls
  are not treated as product passes or addressed with benchmark scheduling flags.
- [Ordinary native-highlight/object-wire checkpoint](native-validation-checkpoint.json)
  separately measured all four strict response-validation boundaries.
- [Rejected numeric-wire checkpoint](packed-validation-checkpoint.json) restored
  public range objects in preload, but warm bridge improvement was too small:
  `i`4.35→4.28ms, `e`6.22→5.99ms; strict pair/scalar validation increased warm
  validation. Cold `i`10.6→7.7ms alone did not justify retaining the change.
  Numeric transport was removed; original boundary schemas remain enforced.
- [Compiled-filter checkpoint](compiled-validation-checkpoint.json) creates only
  active predicate closures once per query, avoiding five callback families per
  snippet even for empty chip/tag/source filters. Ordinary first `i` worker
  2.71→1.30ms and first `e`1.09→0.87ms compared with native/object checkpoint.
  Max input-to-paint14.8ms; these local results still require runner qualification.

Each checkpoint uses the same10k/7.25M-character full-text library, no text-query
prewarming and the same strict50ms maximum gate. Per-phase measurements are not
substituted for input-to-visible-paint. Different runs include normal scheduling
variation; small differences are not claimed as reliable wins.

## Renderer change and correctness

The production HighlightedText public props remain unchanged. With supported
native APIs it renders one React-escaped text node and registers complete
UTF-16 StaticRanges; otherwise it retains the safe mark-based fallback. The
[CSS Custom Highlight specification](https://drafts.csswg.org/css-highlight-api-1/)
and [browser API documentation](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API)
explain styling ranges without splitting the DOM. Packaged Electron44.5.1/
Chromium152 runtime tests, rather than version assumptions, check availability.

A document-owned feature registry pools ranges, while each component removes only
its own ranges on update/unmount. Other feature names are untouched. Invalid
and surrogate-splitting offsets are rejected; updates never alter source text.
Static CSS uses the existing theme tokens under production CSP, without dynamic
styles or HTML. Unit tests cover multiple owners, cleanup, updates, Unicode/NUL,
escaping and fallback. Packaged tests require703 complete range locations,
nonzero geometry and actual matching background pixels for every occurrence,
including leading and later terms. Browser selection text remains complete.
The two-process production CSP test additionally checks native highlight paint
with both actual light and dark theme colors.


## Native highlight CI: unresolved failures at 843b4eb

Run 36985751096 failed both OS. The [Mac receipt](incomplete/macos-native-highlights-ci-failure-843b4eb.json)
shows first `i`155.2 ms: bridge13.7, worker3.07, React5.9, frame wait134.4.
Every other query max was at most45.7 ms; rapid46.2, complete highlight27.2,
mutations at most36.5. This demonstrates the long interval followed the React
commit; it does not establish why Chromium's callbacks were delayed.

The [Windows receipt](incomplete/windows-native-highlights-ci-failure-843b4eb.json)
shows max77.8 ms (warm `e`: bridge57.0, worker1.64, React4.9, frame14.7), first
`i`68.4 (bridge49.5, including14.85 total response validation), first `re`70.4,
no-match62.4, Unicode63.6. Complete highlighting39.0, rapid23.1 and mutations
at most35.8 passed. Bridge and worker wall time still varied materially despite
small matching/DOM costs; queueing, serialization, process scheduling and main
thread work cannot be distinguished from those aggregate values alone.

Code-identical prior10b run36985287238 [Mac passed](macos-native-highlights-ci-10b47c3.json)
(max query44.1, rapid47.2), while its Windows job was cancelled by the subsequent
push after emitting a [failing search receipt](incomplete/windows-native-highlights-ci-failure-10b47c3.json):
max64.5, first `re`64.0 and no-match62.5. Neither a cancelled job nor the passing
Mac sample qualifies both OS. These are consecutive naturally triggered runs;
no failed gate was rerun solely to obtain a success receipt.

The next diagnostic-only CI step runs once after a failed ordinary packaged gate,
with a separate temporary output directory and separate artifact. Original
ordinary failure and receipts remain intact. No product code, readiness waits,
query samples, frame flags, deadlines or performance gate are changed.
[Electron contentTracing](https://www.electronjs.org/docs/latest/api/content-tracing)
records restricted timeline/compositor/IPC categories, with a32 MiB buffer and10 s limit,
from before creation of the owned fixture window until two query passes finish
(or the time limit). Fixture phase marks identify input, bridge request/reply,
React commit and each frame callback. Main IPC receive/reply epoch timestamps,
window creation/loading/show/focus/visibility/bounds/background-throttling events,
font readiness, renderer visibility/focus, long tasks and passive frame cadence
will distinguish startup/presentation readiness from runtime queue/CPU work.
These instrumented measurements are explicitly nonqualifying. A robust fix must
follow the resulting trace evidence; no root cause is claimed yet.


Diagnostic launch uses a fresh generated userData directory beneath its owned
corpus directory and asserts actual canonical `app.getPath('userData')` identity.
The original ordinary launch remains unchanged. A local harness run verified the
assertion and produced a valid21.6 MB trace spanning1.78 s, with484 phase marks
and timeline/compositor events; these numbers establish harness operation only.
Early assertion teardown now explicitly flushes the idempotent trace before
closing the application. Sequential settled cleanup still releases application
and temporary directory if flushing fails. If the test already failed, cleanup
errors are reported without replacing the original failure. Three pure regressions
cover flush/close/remove order, resource release after both flush/close errors,
and retaining a prior ordinary gate failure when cleanup also fails.


## Profile isolation correction after 850f41e review

The initial diagnostic delta isolated TRACE=1 only. Review of Electron/Playwright
launch and fixture main proved ordinary mode retained the default application
userData path. An in-memory session partition does not isolate app userData.
Both ordinary and diagnostic launch now always supply a fresh generated profile;
actual canonical app.getPath('userData') identity is asserted before fixture use
and included in each receipt. This intentionally changes harness startup isolation,
not query samples, deadlines or the input-to-paint gate. No existing default profile
is read or deleted. Mismatched identity closes the owned process and removes only
the generated corpus/profile tree. Four mode-specific regressions verify launch
arguments, real directory identity and rejection of a different existing directory
without deleting it. The previous diagnostic-only isolation statements describe
the earlier version; they do not describe the corrected current harness.


Main f2d90 integration initially clamped the regular split-view fixture to the
production Compact width440. The [retained screenshot](incomplete/p13-compact-constraint.png)
and [failed assertion context](incomplete/p13-compact-constraint-context.md) show
the squeezed selected preview; a late query highlight was outside the viewport.
No timing receipt was emitted because visibility assertions failed first. The
fixture now initializes through actual Regular settings and the production
bootstrap/window factory, retaining native geometry constraints and its original
1000x640 simultaneously visible split view. No warming, sleep or gate changes.

Astra's separate850f Mac [ordinary receipt](incomplete/macos-native-highlights-ci-failure-850f41e.json)
failed first `i`148.7ms (frame126.3) and cold `e`51.5ms (preload17ms). The separate
[diagnostic receipt](macos-startup-trace-diagnostic-850f41e.json) first `i`33.7ms,
query max49.2ms did not reproduce the cold stall. Its trace showed GPU
CALayerTreeCoordinator::ApplyBackpressure97.47ms ending53ms before first input,
with window show123.75ms before input, foreground/visibility confirmed, and no
long tasks. This is a measured startup presentation lead, not proven causation
for the ordinary failure. Profile correction and natural CI are the next controlled
experiment; no scheduling workaround is implemented.


Local current-main Regular-fixture runs verified the actual canonical generated
profile in both modes: [ordinary receipt](windows-all-mode-profile-regular.json)
and [diagnostic receipt](windows-all-mode-profile-regular-trace.json). Complete
visible text, every703 highlight pixels and unchanged strict gate passed in each;
these local results still do not qualify the CI machines. Fresh ordinary CI must
establish the corrected harness behavior before any further performance change.


Astra also measured850f Windows ordinary warm `re`101.3ms (bridge82.2,
worker2.89). Diagnostic first `i`78.4ms had main IPC receive+1.187 to reply+42.866ms,
renderer reply+51.232, commit+54.044 and frames+63/+77.6ms. No long task or focus
loss explained the gap; many short main wakeups were present. Request-correlated
worker receive/send marks are missing, so the await span remains unattributed.
Only if fresh all-mode-owned-profile/Regular-fixture CI still fails should the
next bounded diagnostic add main-post/worker-receive/worker-send/main-receive
markers. No such instrumentation or scheduling change is included in this fix.

## Deferred request-correlated worker boundaries

The later ordinary Windows receipt at `6976` reached 192.8 ms; its separate diagnostic
run reached 209.9 ms with a 191.3 ms main await span. These remain failures, with no
proven CPU-versus-scheduler cause. Main `896a8a` (native identity, Settings and Storage
transfer) is now integrated normally.

The initial unpublished boundary experiment invoked a JSON/logging observer before
Worker.postMessage. Astra's controlled 25 ms observer reproduced measurement
contamination. The corrected client captures only scalar timestamps adjacent to
main post/receive, and the worker captures receive/send under the same request ID.
No observer runs before posting or resolving a response. The explicit final flush
runs only after every measured query, rapid input, mutation refresh and complete
highlight paint finishes; aborted workloads flush during settled cleanup and carry
workloadCompleted=false. The 5-second flush bound is a diagnostic teardown limit,
not a change to any product deadline or performance gate.

Capture admits at most 128 complete groups (512 scalar events) within 10 seconds.
Final flushing stops capture. Strict shared-schema validation rejects nonfinite,
negative, unexpected or incomplete worker metadata; incomplete groups are counted
and excluded from interval evidence. Ordinary clients admit no diagnostic request
flag or response metadata, have no observers, and perform no flush IPC. Tests cover
interleaving, cap/deadline, malformed metadata, throwing/25 ms delayed observers,
disabled mode, and final/aborted/stalled flushes. No text, query or snippet result is
included in worker boundary records. Epoch times align process boundaries;
monotonic times describe local durations. These marks partition await intervals;
they cannot distinguish CPU consumption from scheduling without the associated
trace. Existing opt-in Chromium/IPC observers still add instrumentation overhead.

The [ordinary local receipt](windows-deferred-boundaries-ordinary.json) passes
query max 15.4 ms, rapid 8.3 ms, mutation max 10.5 ms and complete-highlight 10.1 ms.
The [separate nonqualifying diagnostic receipt](windows-deferred-boundaries-diagnostic.json)
passes query max 18.2 ms and retains [128 complete groups](windows-deferred-worker-groups.json),
with zero incomplete/malformed admitted groups. Both prove actual canonical fresh
profile identity, 1000x640 simultaneously visible panes and all 703 highlight pixels.
The [inspected screenshot](windows-deferred-boundaries-visible.png) preserves the
complete wrapped selected body. Hardware/runtime and cold/warm p50/p95/max remain
in JSON; these local results do not qualify either hosted runner.

Across the 128 local groups, epoch-difference maxima were 0.477 ms main-post to
worker-receive, 4.122 ms worker-receive to worker-send, and 1.111 ms worker-send to
main-receive. This local run did not reproduce the earlier hosted await stall.
The bounded Chromium JSON remains in the owned temporary diagnostic artifact
directory and CI retains an equivalent separate artifact on a failing ordinary job.

Current storage writes retain UTF-16 as well as legacy UTF-8. The search snapshot
uses that same lossless decoder, including lone surrogates. Corpus text/counts are
unchanged (10k snippets, 7,250,796 code units); the representative current-schema
database now occupies 45,793,280 bytes. Its previous positional nine-column seeder
failed before Electron launch after schema 3 integration; the [original failure
context](incomplete/utf16-corpus-schema-context.md) is retained. It now names columns
and writes current UTF-16 bytes. A regression validates the real 10k seed and NUL
suffix matches. Actual bulk import refreshes once, preserves exact text/highlights,
and clear removes cached results; settings-only revisions do not reload entries.

Fresh unchanged ordinary both-OS CI and exact-head review remain required. No
query warming, sleep, workload reduction, deadline change or success-only rerun
was introduced. Earlier ordinary/diagnostic failures remain intact.
