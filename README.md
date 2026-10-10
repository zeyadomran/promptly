# Promptly

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="src/renderer/assets/brand/logo-on-dark.svg">
  <img src="src/renderer/assets/brand/logo.svg" alt="Promptly logo" width="128" height="128">
</picture>

Compose, capture, organize and reuse text with managed attachments. A local-first Windows app.

Keep reusable prompts, replies, notes and code in a searchable Library, and work through a
separate prompt Queue. Create text directly or capture a selection from a supported app.
Add files, annotate images, fill reusable variables and copy ordered context bundles.

The features below describe the **1.1.0 source**. The download link points to the latest
published installer; check its release notes for availability.

**[Download Promptly for Windows x64](https://github.com/zeyadomran/promptly/releases/latest/download/Promptly-x64-Setup.exe)**
· [Release notes and other versions](https://github.com/zeyadomran/promptly/releases)

## Install and first launch

1. Run the downloaded `Promptly-x64-Setup.exe` installer.
2. Open Promptly from the Windows Start menu.
3. Follow the first-launch walkthrough to choose your capture shortcut and try it on
   the practice prompt. Then capture selected text from a supported app and open
   Promptly to find and copy your snippets.

## Features

- **Capture selected text:** save a selection through native Windows UI Automation,
  with confirmation and first-launch practice capture.
- **Manage your library:** capture, edit, duplicate, delete, and reuse snippets.
- **Compose directly:** create Library snippets or queued prompts with exact typed text,
  tags and attachments; optional global quick compose opens a draft from another app.
- **Work through Queue:** keep Open and Done prompts, reorder manually, complete explicitly,
  Undo completion or deletion, and save reusable copies to Library.
- **Copy and return:** explicitly copy text or save a draft before returning to the previous
  app. Promptly never pastes automatically; a failed return does not undo a confirmed copy/save.
- **Attach and draw:** manage original files and images locally, draw or annotate on a locked
  original background, and copy/export the current unsaved canvas as PNG.
- **Reuse variables and context:** fill case-sensitive `{{name}}` values for one copy, or
  review an ordered selection of 2–20 snippets as a temporary text-only bundle.
- **Find what you need:** full-text search, tag filters, sorting, and paged browsing.
- **Organize with tags:** assign tags, rename them, and customize their colors.
- **Choose your workspace:** Compact and Regular views, light and dark themes,
  saved window geometry, and pinning.
- **Keep commands close:** customizable keyboard shortcuts and a tray menu with
  recent snippets, capture pause, and quick access to the library.
- **Keep your data local:** SQLite storage, complete v3 JSON Lines backup and restore
  (including Queue, original files and editable drawings), and text-only Markdown export.
  The app works offline with bundled assets; no telemetry or cloud sync is configured.
- **Update on your terms:** installed builds check whenever the window opens or is restored, and on request in Settings. An
  available update is suggested; downloading, applying and restarting require your choice.

## Getting started

Read the [Getting Started guide](https://github.com/zeyadomran/promptly/wiki/Getting-Started)
and explore the [Promptly wiki](https://github.com/zeyadomran/promptly/wiki) for
[capture](https://github.com/zeyadomran/promptly/wiki/Capturing-Text),
[library and search](https://github.com/zeyadomran/promptly/wiki/Library-and-Search),
[compose and queue](https://github.com/zeyadomran/promptly/wiki/Compose-and-Queue),
[attachments and drawing](https://github.com/zeyadomran/promptly/wiki/Attachments-and-Drawing),
[variables and bundles](https://github.com/zeyadomran/promptly/wiki/Variables-and-Bundles),
[keyboard shortcuts](https://github.com/zeyadomran/promptly/wiki/Keyboard-Shortcuts), and
[backup and restore](https://github.com/zeyadomran/promptly/wiki/Backup-and-Restore).

Promptly currently targets **Windows x64**. [Release automation](RELEASING.md) supports
signed installers and optional updates; a production release is not yet qualified. Windows 11 is the primary
development environment; Windows 10 compatibility still needs manual qualification.
macOS, Linux, x86, and ARM64 are unsupported.

Capture depends on the source application's accessibility provider. Unsupported,
empty, protected, or failed selections save nothing. Native capture never simulates
Ctrl+C or reads or writes the clipboard; clipboard capture fallback is deferred.
Explicit Paste attachment reads clipboard images/files; clipboard text is ignored by that
command. Explicit text/image Copy actions write the clipboard. See
[Troubleshooting](https://github.com/zeyadomran/promptly/wiki/Troubleshooting) for limitations.

An entry allows eight attachments, 10 MiB per file and a 512 MiB managed-asset budget. PNG,
JPEG, GIF, WebP and BMP have bounded previews; originals remain managed even if preview is
unavailable. Save a complete JSON backup before upgrading. Schema migrations are additive,
but an older build can reject a newer database; reinstalling an old binary does not roll the
database schema back. Legacy v1/v2 backups still import into 1.1.0; v3 is not an old-release format.

## Contributing and reporting issues

Read the [Privacy Policy](PRIVACY.md) for local storage, capture, updates, and information you choose to share. It is also available from Settings > About in the app.

See [CONTRIBUTORS.md](CONTRIBUTORS.md) for contributions and ordinary bug reports,
[DEVELOPMENT.md](DEVELOPMENT.md) for running and building the app, and
[SECURITY.md](SECURITY.md) for private vulnerability reports.

## License

Promptly's first-party code and supplied brand assets are licensed under the
[MIT License](LICENSE), copyright 2026 Zeyad Omran. Third-party components retain
their own terms; see [license provenance and release qualification](packaging/README.md).
