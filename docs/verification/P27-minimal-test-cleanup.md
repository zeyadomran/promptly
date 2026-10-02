# P27 minimal test cleanup

The user approved cleanup before merging open feature PRs. This checkpoint replaces duplicate matrices with seven implemented smoke flows and four Node logic cases; `docs/testing.md` owns the future one-flow policy and TDD guidance.

Removed 13194+ lines of old matrices, nested Vitest timeout reproductions, visual/custom renderer suites, diagnostic helpers and legacy native feasibility workflow. Removed RTL/jsdom and external Chromium installation. Production adapters, native 100 ms deadline, settings drain, CSP/ASAR/Sonner hash and storage functionality remain.

Validation: all four Node logic cases passed. Static TypeScript, zero-warning ESLint, architecture (217 handwritten modules) and Prettier checks passed; Windows packaging passed. The retained Windows foundation, window, Settings, storage, ordinary native selection and owned bad-database flows passed. The ordinary owned Windows capture returned `ok` in 35.16 ms; this single sample is functional evidence, not performance qualification. macOS and hosted actual native preferences await exact-head CI.

The first consolidation attempt exposed local wrapper quit re-entry and closed Playwright application-handle cleanup defects. Receipts were preserved at `C:/Users/ziomr/AppData/Local/Temp/promptly-minimal-first-attempt-dv5dpd_e`. Quit continuation now runs on the next event-loop turn; the child handle is captured while alive and process exit is observed independently. A failed new launch clears the prior application/child handles and retains its tree while death is unverified. Primary and cleanup errors remain together. The Settings fixture now selects its actual #settings URL; product focus behavior is unchanged.

Historical search, native variant and shortcut qualifications remain open. Removing their matrices does not resolve or qualify them. Search/shortcut integration will extend the canonical suite once their features merge, rather than add placeholder cases.

## First hosted minimal run

Run 37026078094 at 2e12291 passed all shared shell/window/Settings/storage flows and static gates, but failed both ordinary native lanes. Windows retained only `ownedPidMatched:false` because foregroundIdentity discarded typed status. macOS captured successfully (84.55 ms) then source activation timed out. The next narrow fixture delta publishes Windows readiness only at ContentRendered with actual owned-foreground/activation booleans and retains the typed single identity result. The macOS owned foreground fixture yields activation to the saved source, then both native fixture observers prove source remains backgrounded before the one production activation request. No activation file, retry, extra capture, provider warmup or runtime deadline change is introduced.

Microsoft documents ContentRendered as occurring after window content is rendered: https://learn.microsoft.com/en-us/dotnet/api/system.windows.window.contentrendered?view=netframework-4.8.1. Apple documents cooperative activation as yield then target activation: https://developer.apple.com/documentation/appkit/passing-control-from-one-app-to-another-with-cooperative-activation. These correct fixture preconditions; neither establishes the cause of the prior timeout. Independent PR41/PR45 runs also retained cold capture timeouts despite matched owned identities. Those production qualifications remain open pending new actual evidence.

Focused Windows verification of the readiness delta passed once: rendered/owned foreground/activation accepted were true; typed identity returned ok (16.08 ms) and ordinary capture returned ok (19.46 ms). Full static checks remained green. This is one functional receipt, not proof that the unrelated hosted cold timeouts are solved. No owned processes remained.
