# P27 minimal test cleanup

The user approved cleanup before merging open feature PRs. This checkpoint replaces duplicate matrices with seven implemented smoke flows and four Node logic cases; `docs/testing.md` owns the future one-flow policy and TDD guidance.

Removed 13194+ lines of old matrices, nested Vitest timeout reproductions, visual/custom renderer suites, diagnostic helpers and legacy native feasibility workflow. Removed RTL/jsdom and external Chromium installation. Production adapters, native 100 ms deadline, settings drain, CSP/ASAR/Sonner hash and storage functionality remain.

Validation: all four Node logic cases passed. Static TypeScript, zero-warning ESLint, architecture (217 handwritten modules) and Prettier checks passed; Windows packaging passed. The retained Windows foundation, window, Settings, storage, ordinary native selection and owned bad-database flows passed. The ordinary owned Windows capture returned `ok` in 35.16 ms; this single sample is functional evidence, not performance qualification. macOS and hosted actual native preferences await exact-head CI.

The first consolidation attempt exposed local wrapper quit re-entry and closed Playwright application-handle cleanup defects. Receipts were preserved at `C:/Users/ziomr/AppData/Local/Temp/promptly-minimal-first-attempt-dv5dpd_e`. Quit continuation now runs on the next event-loop turn; the child handle is captured while alive and process exit is observed independently. A failed new launch clears the prior application/child handles and retains its tree while death is unverified. Primary and cleanup errors remain together. The Settings fixture now selects its actual #settings URL; product focus behavior is unchanged.

Historical search, native variant and shortcut qualifications remain open. Removing their matrices does not resolve or qualify them. Search/shortcut integration will extend the canonical suite once their features merge, rather than add placeholder cases.
