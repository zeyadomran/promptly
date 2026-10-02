# P06 design foundation

The development-only `/#design` fixture composes real shadcn New York/Radix
primitives. Production builds eliminate the fixture and its example data. This is
a foundation check, not an implementation of the library or settings features.

Run `npm ci`, `npm run check`, `npx playwright install chromium`,
`npm run test:design`, `npm run package`, and `npm run test:smoke`.
The Playwright fixture suite captures the three `fixtures-*.png` files here; the
packaged Electron suite captures `packaged-light.png` and `packaged-dark.png`.
Those captures are actual app output and can be compared with the supplied
2.1/2.2 and 4.1/4.2 references. Foundation measurements include 440px compact
width, 6px chip dots, 7px row dots, 4px keycap radius and the local font families.
The screenshots do not claim final screen fidelity; P15/P16/P20 implement those
screens. The reference screenshots are 2x captures while these are at 1x.

## Theme integration contract

`useTheme(preference)` has one owner per window and returns `light` or `dark`.
`applyTheme(preference)` updates the document's preference synchronously.
No renderer preference store is introduced. The default CSS uses `color-scheme`
and `light-dark()` to follow the OS before JavaScript executes; HTML includes the
stylesheet before the renderer entry. Explicit theme changes never interpolate
colors, including slotted icon buttons and badges. System observes OS changes;
an explicit Light or Dark preference overrides them. Motion respects the OS
reduced-motion setting.

P05 must deliver a validated persisted initial preference **before showing the
BrowserWindow**, and call `applyTheme` before rendering. Waiting for an async
`getSettings` after mount would flash System before a saved explicit preference.
Use the native theme/window background or a validated initial preference at
bootstrap; subsequent preference events update the hook's input. The P06 default
has no persistence. P13 owns the native window background/lifecycle integration.

## Assets and scope

Five WOFF2 files are copied from Fontsource 5.3.0 and retain their OFL licenses
beside the files. Space Grotesk covers 400/500/600, Geist Mono 400/500; these
Latin subsets cover the UI and common prompts, with local system fallback for
other scripts. Logos and the tray template are byte-preserved from the handoff.
No Google Fonts URL, CDN or remote image is used at runtime.

`SettingsField` associates labels/descriptions and forwards disabled/invalid
states. Slider forwards those associations to its focusable thumb. `IconButton`
combines a named button and Radix tooltip. Dialog supplies its Radix focus trap;
callers must compose a Title and Description. HighlightedText renders React text
nodes and literal matches only, with validated/merged UTF-16 ranges. Tag colors
use blue, green, red, purple, amber, teal, pink, lime in the exact reference order.

The packaged asset check blocks HTTP/HTTPS in Electron's session and loads all
font weights locally. It also verifies production fixture elimination. Network
emulation is deliberately avoided because it interferes with Electron file
navigation; the transport block provides the actual offline asset check.
Mac packaged verification runs in CI; local evidence is Windows x64.

Primary references consulted on 2026-10-02:

- [shadcn Radix Button](https://ui.shadcn.com/docs/components/radix/button)
- [shadcn Radix Dialog](https://ui.shadcn.com/docs/components/radix/dialog)
- [shadcn Radix Field](https://ui.shadcn.com/docs/components/radix/field)
- [shadcn Radix Toggle Group](https://ui.shadcn.com/docs/components/radix/toggle-group)
- [Fontsource Space Grotesk](https://fontsource.org/fonts/space-grotesk)
- [Fontsource Geist Mono](https://fontsource.org/fonts/geist-mono)

Current stable direct additions verified with npm metadata: Radix UI 1.6.7,
lucide-react 1.49.0, Sonner 2.0.8, clsx 2.1.1, class-variance-authority 0.7.1,
tailwind-merge 3.7.0, tw-animate-css 1.4.0 and both Fontsource packages 5.3.0.
Components were generated with shadcn 4.21.1, `style: new-york`, then split into
implementation files without replacing Radix behavior. TypeScript retains the
documented 6.0.3 ESLint compatibility exception.
