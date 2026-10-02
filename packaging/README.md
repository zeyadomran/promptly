# License provenance and open release qualification

The build copies license/notice files from the locked, installed production npm graph and both bundled Fontsource font packages. Electron's `LICENSE` and `LICENSES.chromium.html` remain in the installation root; the latter is explicitly added to the Squirrel payload because its default NuGet template omits HTML files.

The checked-in `Promptly.nuspectemplate` is derived from electron-winstaller 5.4.4's MIT-licensed default template, omitting only `iconUrl`; its notice is retained in `licenses/electron-winstaller-5.4.4-LICENSE.txt`.

Checked-in supplemental texts:

- `SQUIRREL-COPYING.txt`: [Squirrel.Windows vendor commit eef37460ae](https://github.com/Squirrel/Squirrel.Windows/blob/eef37460ae/COPYING), matching bundled Squirrel `2.0.1+eef37460ae`.
- `licenses/Squirrel-StubExecutable-LICENSE.txt`: [that commit's bundled semver notice](https://github.com/Squirrel/Squirrel.Windows/blob/eef37460ae/src/StubExecutable/LICENSE.md).
- `licenses/Squirrel-NuGet-LICENSE.txt`: [NuGet submodule license at 50f8d9e438fe948d7109501bd10f6024d0585b70](https://github.com/paulcbetts/NuGet/blob/50f8d9e438fe948d7109501bd10f6024d0585b70/LICENSE.txt).
- `licenses/Squirrel-SharpCompress-LICENSE.txt`: [SharpCompress 0.17.1](https://github.com/adamhathcock/sharpcompress/blob/0.17.1/LICENSE.txt).
- `licenses/react-remove-scroll-bar-2.3.8-LICENSE.txt`: [upstream MIT text at 8ca9ba5ea52de03308fe8ced94f7b159a44d28ff](https://github.com/theKashey/react-remove-scroll-bar/blob/8ca9ba5ea52de03308fe8ced94f7b159a44d28ff/LICENSE). The published 2.3.8 package declares MIT but omits its license file. This upstream tree declares 2.3.7; this is retained source attribution, not a claim that the tree is the published 2.3.8 source.

## Installer dependency qualification remains open

The vendor commit's [Update build](https://github.com/Squirrel/Squirrel.Windows/blob/eef37460ae/src/Update/Update.csproj) embeds additional libraries. Its [Squirrel project](https://github.com/Squirrel/Squirrel.Windows/blob/eef37460ae/src/Squirrel/Squirrel.csproj) identifies DeltaCompressionDotNet 1.1.0, Microsoft.Web.Xdt 2.1.1, Mono.Cecil 0.11.2 and SharpCompress 0.17.1; Update also embeds WpfAnimatedGif 1.4.15 and the NuGet submodule.

The actual DeltaCompressionDotNet 1.1.0 NuGet package declares copyright Todd Aspeotis 2014 but omits a license text/URL. The [1.1-era upstream README at a670f842b0f3514b3786b401e96bb81deff0a5c4](https://github.com/taspeotis/DeltaCompressionDotNet/blob/a670f842b0f3514b3786b401e96bb81deff0a5c4/README.md) explicitly declares MS-PL; `licenses/Squirrel-DeltaCompressionDotNet-LICENSE.txt` retains the [subsequently added MS-PL text at 7215d81cc08e09d220565cf7b7ebe4bbd5f499de](https://github.com/taspeotis/DeltaCompressionDotNet/blob/7215d81cc08e09d220565cf7b7ebe4bbd5f499de/LICENSE). Mono.Cecil declares MIT; WpfAnimatedGif points to Apache-2.0; Microsoft.Web.Xdt points to Microsoft's license terms. Their full vendor notice/redistribution qualification still needs review before release publication. These unsigned development artifacts are not a completed license audit.

Third-party terms apply to their respective components. This repository supplies no new license grant for the author's Promptly application code or supplied brand assets. Do not infer that third-party MIT/Apache/OFL terms license those first-party materials.
