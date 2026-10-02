# Local unsigned installer construction — 2026-10-02

This is build evidence, not install/runtime qualification. Windows x64, Node 22.23.2, npm 12.0.2, Electron 44.5.1, Forge/Squirrel maker 8.0.1, electron-winstaller 5.4.4.

`npm run check` passed strict types, ESLint, architecture (351 handwritten modules), Prettier and all 22 existing functional cases. No dependency-internal or static-config test was added; the maintained Squirrel startup handler gates normal bootstrap before instance ownership/native/storage/Settings/window effects.

The first `npm run make` packaged successfully but failed during NuGet construction with `IconUrl cannot be empty.` The final build used the supported NuGet template override, omitting that optional remote URL, and completed package/make/postMake successfully. `npm run stage:unsigned` verified maker-time hashes and staged all three artifacts.

The local artifacts explicitly record base commit `df999d94c72ec1ab8b1c923dd36a63f6609d71c4`, `dirty: true` and packaging timestamp `2026-10-02T19:16:59.932Z`. They are not attributed to a later clean commit. CI must build the committed candidate separately. Subsequent notice attribution documentation is included by the next build, not retroactively claimed for these binaries.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `Promptly-unsigned-dev-x64-Setup.exe` | 155808256 | `18d2fc99775c02f6b58c5d6794bba62c7a646fe133ccb380ccd8f1101230968d` |
| `Promptly-0.1.0-full.nupkg` | 155188700 | `2e92097983b68ce923b0ca0199914b269d8b25845fd635d17aa3c4223ad1a6c6` |
| `RELEASES` | 79 | `f50a7b1325911a85676019f140b9a7ad69d5d29f1f65d5b227f071e319b51012` |

Read-only verification found:

- Setup Authenticode status `NotSigned`; package metadata `Promptly` version `0.1.0`, author Zeyad Omran, unsigned development description, no `iconUrl`.
- NuGet payload contains Electron `LICENSES.chromium.html`, `app.asar`, both Windows helpers outside ASAR, all four tray ICO states, build provenance, fonts/runtime notices and the pinned DeltaCompressionDotNet MS-PL text.
- ASAR contains main/SQLite worker, both preloads, main and capture-toast HTML, and ten WOFF2 files. The generated 256px brand preview was inspected.

No installer, installed application, real clipboard, OS preference or native input was used. Clean install, upgrade, uninstall, retained database, offline runtime/native delivery and unsigned security prompts remain manual checks. Embedded installer dependency attribution remains incomplete as documented in [license provenance](../../packaging/README.md); this is not a completed release license audit.
