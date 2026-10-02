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
