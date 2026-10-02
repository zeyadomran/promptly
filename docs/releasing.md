# Unsigned Windows development installers

These artifacts are **unsigned development builds**, not production-ready releases. No signing credentials, release publication, cloud updater or telemetry is configured. Building an installer does not qualify installation or native runtime behavior. Keep #28 and native release qualification open until manual evidence is recorded.

## Target and prerequisites

The supported build target is Windows x64 only. The documented minimum target is Windows 10 22H2 x64 with .NET Framework 4.8 available; Windows 11 x64 is the primary development environment. Electron 44.5.1 documents Windows 10 or newer, and the maintained C# helpers use desktop UI Automation, process identity, integrity tokens, DWM bounds and low-level keyboard hooks. The helpers are built against the OS .NET Framework compiler and shipped outside ASAR. No compiler is required after installation. Windows 10 runtime compatibility remains manually unqualified; x86, ARM64, macOS and Linux are unsupported targets. A currently serviced OS and native accessibility-provider compatibility remain release checks.

References: [Electron platform support](https://github.com/electron/electron#platform-support), [Windows native adapter](architecture/windows-selection.md), [Forge Squirrel.Windows](https://www.electronforge.io/config/makers/squirrel.windows).

## Build and stage

Use the repository's pinned Node 22/npm lockfile on Windows x64:

```powershell
npm ci
npm run check
npm run make
npm run stage:unsigned
```

`make` packages once and builds the per-user Squirrel installer. CI runs `make` instead of a separate package step. The repository pins the approved electron-winstaller install script, which selects its bundled host-architecture 7-Zip binary; it does not install software on the build machine.

Maker output is `out/make/squirrel.windows/x64/`: `Promptly-unsigned-dev-x64-Setup.exe`, `Promptly-<version>-full.nupkg`, `RELEASES`, and `BUILD-PROVENANCE.json`. No delta feed or remote release URL is configured. Setup and the application executable use locally generated ICO assets from the supplied brand SVG; original source/provenance assets remain unchanged. The checked-in NuGet template retains electron-winstaller 5.4.4's file projection and omits its optional remote icon URL; Setup uses the local icon. Review this projection when upgrading the maker.

Staging writes `out/staged/Promptly-<version>-unsigned-dev-win32-x64/`, including these artifacts, this guide, `BUILD.json` and SHA-256 checksums. Metadata captures the revision and dirty flag during packaging and binds hashes after make. Staging verifies those hashes; it never relabels old binaries with the staging checkout's HEAD. Dirty local builds are allowed and explicitly identified.

The **Stage unsigned development installer** GitHub workflow is manual (`workflow_dispatch`) and uploads temporary Actions artifacts only. Select a revision whose ordinary CI passed; compare `BUILD.json` to the intended revision. It does not create a GitHub Release or publish an update feed. Artifact retention is 14 days.

## Identity and data preservation

Product/executable identity remains `Promptly`/`Promptly.exe`; Squirrel package identity is `Promptly` and AppUserModelID is `com.squirrel.Promptly.Promptly`. Do not change these identities between upgrades. Squirrel setup-event launches use the standard maintained handler and skip normal instance ownership, helper startup, SQLite, Settings/login effects and ordinary windows.

Per-user installation uses Squirrel's versioned application directory under `%LOCALAPPDATA%\Promptly`. Authoritative data remains Electron's stable `userData` directory (`%APPDATA%\Promptly` for this product): `promptly.sqlite` and any SQLite WAL/SHM companions. Normal Settings, import/export and tray behavior keep that same database path. Installer handling contains no user-data deletion code.

Before an upgrade or uninstall, quit Promptly fully and export a JSON backup. Upgrade should replace application files while retaining the userData directory; uninstall should remove installation/shortcuts while leaving user data. Reinstall with the same identity should reopen it. These are the intended policies, **not observed install/upgrade/uninstall results**. Do not offer automatic data deletion. Any deliberate data removal is a separate explicit user action.

## Payload and license boundaries

The payload contains `app.asar`, both offline renderers/preloads, fonts, SQLite worker, Windows selection and keyboard helpers outside ASAR, four tray ICO variants, build provenance and third-party notices. Electron's LICENSE/Chromium notices are retained. Native code is rebuilt from maintained C# source; Node SQLite is supplied by Electron, with no separate native SQLite npm ABI to rebuild.

[License provenance](../packaging/README.md) records actual texts and unresolved installer dependency qualification, including embedded vendor dependency attribution. No author-application or supplied-asset license is invented. Complete that review before publishing a release.

## Manual qualification

On a disposable, owned Windows profile/machine, verify clean install, shortcut/app identity, offline launch, capture/search/full-text copy, tray/overlay/focus behavior, complete Quit, upgrade with retained database, uninstall/reinstall preservation and unsigned SmartScreen behavior. Record OS/.NET versions and actual artifact hashes. Use only owned data and restore any native preferences changed by the check. No such installation, real application launch, clipboard operation or OS-preference change is performed by the automated build.
