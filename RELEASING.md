# Windows releases

The signed release workflow builds Windows x64 installers with Azure Artifact Signing and publishes an update feed on GitHub Releases. The separate unsigned development workflow remains available for local qualification. Building or signing an installer does not qualify installation or native runtime behavior. One bounded Windows 11 install lifecycle is recorded below; #28 remains open for the remaining native/runtime checks. No telemetry is configured.

## Signed releases

The GitHub environment `release` must allow `v*` tags and contain these variables:

| Variable                 | Value source                                                   |
| ------------------------ | -------------------------------------------------------------- |
| `AZURE_CLIENT_ID`        | Application (client) ID of the GitHub signing app registration |
| `AZURE_TENANT_ID`        | Directory (tenant) ID                                          |
| `AZURE_SUBSCRIPTION_ID`  | Subscription containing the signing account                    |
| `AZURE_SIGNING_ACCOUNT`  | Artifact Signing account name                                  |
| `AZURE_SIGNING_PROFILE`  | Validated Public Trust certificate profile name                |
| `AZURE_SIGNING_ENDPOINT` | Signing account regional endpoint                              |

The app registration needs the Artifact Signing Certificate Profile Signer role on the signing account or certificate profile. Its federated credential uses issuer `https://token.actions.githubusercontent.com`, audience `api://AzureADTokenExchange`, and this repository's immutable environment subject: `repo:zeyadomran@45938909/promptly@1400985935:environment:release`. No client secret or exported certificate is used. The Windows runner supplies Azure CLI, the Windows SDK and .NET 8; the workflow downloads the pinned Artifact Signing client.

To release, update `package.json` and the root versions in `package-lock.json` together in a reviewed PR. After merging, push a tag matching that version, such as `v0.1.0`. The tag must point to a commit on `main`. `.github/workflows/release.yml` runs all checks, signs the app, native helpers and Squirrel installer, and requires valid timestamped signatures in the packaged payload. It stages hashes and build provenance before creating a draft GitHub release. Only after all six assets are uploaded does it publish the release and mark it latest. Existing releases are never overwritten.

Published assets are `Promptly-x64-Setup.exe`, `Promptly-<version>-full.nupkg`, `RELEASES`, `BUILD.json`, `SHA256SUMS` and this release guide as `README.md`. Keep all three Squirrel assets together; never edit them after publication. Signed packaging refuses a dirty checkout. `BUILD.json` identifies the built commit and artifact hashes.

For a signing check without publication, push a tag `v<version>-validation` (optionally followed by `.1`, `.2`, etc.) and manually dispatch the **Signed Windows release** workflow on that tag. A manual run builds, signs and retains Actions artifacts, but never creates a GitHub release. Validation tags do not trigger release publication.

## Optional application updates

Installed builds query the public GitHub latest-release metadata once each time Promptly starts. Settings also offers **Check for updates**. Both paths show **No updates found** when current, or an **Update** button when a newer stable release has a complete Windows asset set. Network and API-rate-limit failures show a retry message. Development and unpacked builds explain that updates require the installed Windows app.

A startup check that finds an update shows a Windows notification asking whether to update. Clicking it opens General Settings and scrolls to and focuses **Update**. Windows notification preferences can suppress delivery; Settings still reflects the available version. Startup and manual checks download metadata only. Clicking **Update** authorizes Squirrel to download and apply that specific release while the current app keeps running. **Restart now** then becomes available; restart is never forced. The new version also takes effect on the next normal launch after an accepted update.

The updater uses HTTPS GitHub URLs and Squirrel's package integrity checks. Release signing is verified before publication; the updater does not add a separate runtime Authenticode publisher-pinning check. Keep repository release permissions restricted. Previously installed builds without the updater need a manual installer upgrade once. The first Squirrel launch delays its automatic check briefly to allow the installation lock to clear.

Before qualifying this feature, manually verify two signed versions on an owned Windows profile: notification navigation, declining/dismissing without downloading, manual no-update feedback, explicit update/restart and preserved data. Service tests do not prove native notification delivery or an installed update lifecycle.

## Target and prerequisites

The supported build target is Windows x64 only. The documented minimum target is Windows 10 22H2 x64 with .NET Framework 4.8 available; Windows 11 x64 is the primary development environment. Electron 44.5.1 documents Windows 10 or newer, and the maintained C# helpers use desktop UI Automation, process identity, integrity tokens, DWM bounds and low-level keyboard hooks. The helpers are built against the OS .NET Framework compiler and shipped outside ASAR. No compiler is required after installation. Windows 10 runtime compatibility remains manually unqualified; x86, ARM64, macOS and Linux are unsupported targets. A currently serviced OS and native accessibility-provider compatibility remain release checks.

References: [Electron platform support](https://github.com/electron/electron#platform-support), [Windows capture guide](https://github.com/zeyadomran/promptly/wiki/Capturing-Text), [Forge Squirrel.Windows](https://www.electronforge.io/config/makers/squirrel.windows).

## Build and stage unsigned development installers

Use the repository's pinned Node 22/npm lockfile on Windows x64:

```powershell
npm ci
npm run check
npm run make
npm run stage:unsigned
```

`make` packages once and builds the per-user Squirrel installer. CI runs `make` instead of a separate package step. The repository pins the approved electron-winstaller install script, which selects its bundled host-architecture 7-Zip binary; it does not install software on the build machine.

Forge flips the packaged Electron fuses before distribution: RunAsNode,
NODE_OPTIONS (including NODE_EXTRA_CA_CERTS) and Node CLI inspection are disabled;
embedded ASAR integrity validation and loading the app only from ASAR are enabled.
The existing `asar: true` packaging embeds the Windows ASAR header hash. Storage
uses Node worker threads; the Windows helpers remain separate resources and do
not use RunAsNode. Development Electron is unchanged.

Inspect the actual packaged binary after `make`:

```powershell
npx --no-install electron-fuses read --app out/Promptly-win32-x64/Promptly.exe
```

Confirm the five values above and retain that output with the build provenance.
Also verify normal renderer, storage worker, native helper and Squirrel startup
in the bounded distribution check. Fuse values alone do not qualify runtime
behavior. These unsigned builds cannot prevent a user with write access from
replacing the executable, ASAR or external helpers. See the primary
[Forge fuse plugin](https://www.electronforge.io/config/plugins/fuses),
[Electron fuse](https://www.electronjs.org/docs/latest/tutorial/fuses) and
[ASAR integrity](https://www.electronjs.org/docs/latest/tutorial/asar-integrity)
documentation.

Maker output is `out/make/squirrel.windows/x64/`: `Promptly-unsigned-dev-x64-Setup.exe`, `Promptly-<version>-full.nupkg`, `RELEASES`, and `BUILD-PROVENANCE.json`. No delta feed or remote release URL is configured. Setup and the application executable use locally generated ICO assets from the supplied brand SVG; original source/provenance assets remain unchanged. The checked-in NuGet template retains electron-winstaller 5.4.4's file projection and omits its optional remote icon URL; Setup uses the local icon. Review this projection when upgrading the maker.

Staging writes `out/staged/Promptly-<version>-unsigned-dev-win32-x64/`, including these artifacts, this guide, `BUILD.json` and SHA-256 checksums. Metadata captures the revision and dirty flag during packaging and binds hashes after make. Staging verifies those hashes; it never relabels old binaries with the staging checkout's HEAD. Dirty local builds are allowed and explicitly identified.

The **Stage unsigned development installer** GitHub workflow is manual (`workflow_dispatch`) and uploads temporary Actions artifacts only. Select a revision whose ordinary CI passed; compare `BUILD.json` to the intended revision. It does not create a GitHub Release or publish an update feed. Artifact retention is 14 days.

## Identity and data preservation

Product/executable identity remains `Promptly`/`Promptly.exe`; Squirrel package identity is `Promptly` and AppUserModelID is `com.squirrel.Promptly.Promptly`. Do not change these identities between upgrades. Squirrel setup-event launches use the standard maintained handler and skip normal instance ownership, helper startup, SQLite, normal Settings effects and ordinary windows, including first-run onboarding. Before that handler runs, uninstall attempts to remove only the app-owned native login registration under that same AppUserModelID. A cleanup error is reported without preventing Squirrel's shortcut removal/quit; the retained database's login preference is not changed. Install/update/obsolete events do not perform this native cleanup. The bounded Windows 11 check below observed uninstall login-entry removal/readback; other environments remain unqualified.

Per-user installation uses Squirrel's versioned application directory under `%LOCALAPPDATA%\Promptly`. Authoritative data remains Electron's stable `userData` directory (`%APPDATA%\Promptly` for this product): `promptly.sqlite` and any SQLite WAL/SHM companions. Normal Settings, onboarding, import/export and tray behavior keep that same database path. Installed login-at-startup registration/readback uses Squirrel's stable `Promptly.exe` one directory above `app-<version>` when that stub and `Update.exe` exist; development and unpacked applications retain their executable target. Updates retain these identities and data paths. Installer handling contains no user-data deletion code.

Before an upgrade or uninstall, quit Promptly fully and export a JSON backup. Upgrade should replace application files while retaining the userData directory; uninstall should remove application files/shortcuts and its native login entry while leaving user data. Reinstall with the same identity should reopen it and apply its retained preferences. The bounded check below observed these outcomes and also recorded installer residue. Do not offer automatic data deletion. Any deliberate data removal is a separate explicit user action. The production package version remains `0.1.0`; a separately built, uncommitted `0.1.1` qualification fixture enabled a genuine upgrade check without a production version bump.

## Recorded Windows 11 lifecycle

The [2026-10-02 current-account receipt](https://github.com/zeyadomran/promptly/issues/28#issuecomment-5963533129) records user-authorized checks on Windows 11 Home x64 build 26200. Clean install, stable shortcuts/login target, normal Quit, `0.1.0` → `0.1.1` upgrade, uninstall, reinstall and final uninstall were observed. The owned two-snippet/three-tag database, memberships, onboarding and preferences remained byte-identical across upgrade/uninstall/reinstall. Reinstall reopened the library and reapplied its retained login preference.

- Clean `0.1.0`: commit `7a6c3c8b584fd3e6aae971348de2c8ddec9c6fb7`, `dirty=false`, [staging run 37079399325](https://github.com/zeyadomran/promptly/actions/runs/37079399325), artifact `11257524148`; Setup SHA-256 `39fb5ce14d3aef7d9661ac3f4dd169d923d13b2d03ef8edeaf270205fa7894fa`.
- Temporary `0.1.1`: same commit, `dirty=true`, only the package.json version and two root package-lock version fields changed; Setup SHA-256 `c1c55f39f71fd1f14f5815783ae664ac4f30979b662b38ead6184f99013ed7c4`. This local, unpublished fixture is not a release version change. Both artifacts were NotSigned.

Uninstall left `.dead`, `Update.exe` and `app-0.1.1/squirrel.exe`; application/native executables were removed, but an empty installation directory is **not** claimed. Residue and the owned QA profile were archived after process-death verification. An initial Codex/MSIX redirected trial was excluded; the qualifying cycle used confirmed real Windows filesystem/registry paths. All 54 original personal-profile file hashes and file count were restored; startup values, shortcuts, installed-app registration and owned processes returned to their recorded baseline. No clipboard operation was performed. Raw profile data stays local; the public receipt contains the safe summary.

This establishes only that observed Windows 11 lifecycle. Windows 10, SmartScreen, signing, physical capture/copy, accessibility, sleep/fullscreen and other native checks remain unqualified. Performance remains skipped by user instruction.

## Payload and license boundaries

The payload contains `app.asar`, both offline renderers/preloads, fonts, SQLite worker, Windows selection and keyboard helpers outside ASAR, four tray ICO variants, build provenance, Promptly's first-party MIT license and third-party notices. Electron's LICENSE/Chromium notices are retained. Native code is rebuilt from maintained C# source; Node SQLite is supplied by Electron, with no separate native SQLite npm ABI to rebuild.

[License provenance](https://github.com/zeyadomran/promptly/blob/main/packaging/README.md) records actual texts and upstream attribution, including the exact embedded Mono.Cecil 0.11.2 MIT and WpfAnimatedGif 1.4.15 Apache-2.0 texts. Promptly's first-party code and supplied brand assets use the MIT grant copied into the payload as `PROMPTLY-LICENSE.txt`. Microsoft.Web.Xdt 2.1.1's version-specific terms remain unresolved; modern XDT MIT terms are not substituted. Complete the remaining qualification before publishing a release.

## Manual qualification

On a disposable, owned Windows profile/machine, qualify the remaining native workflows and target environments: offline capture/search/full-text copy, tray/overlay/focus, Windows 10 compatibility and unsigned SmartScreen behavior. Record OS/.NET versions and actual artifact hashes; repeat the lifecycle when the artifact/environment changes. Use only owned data and restore any native preferences changed by the check. The recorded current-account cycle required explicit user authorization and profile backup/restoration. No installation, real application launch, clipboard operation or OS-preference change is performed by the automated build.
