# Troubleshooting

## Nothing is captured

Check that capture is not paused in the tray menu and that **Settings → Shortcuts** shows
your capture listener as available. Try the onboarding practice text or another application
with an accessible selected-text provider. For double-tap capture, press and release the
modifier twice without holding it or combining it with typing.

Windows UI Automation support varies by application. Unsupported, empty, protected, denied,
failed, and timed-out selections save nothing. Promptly does not simulate Copy or fall back
to reading the clipboard. **Codex desktop** and **Claude in a terminal** remain unqualified
capture sources; the terminal-style onboarding sample is a Promptly textarea. Actual elevated
applications, secure desktop, broad accessibility, fullscreen, and multi-monitor behavior also
remain manual qualification work.

## A shortcut is unavailable or does not arrive

Alt+Space can conflict with Windows' window menu. Use **Use Ctrl+Alt+Space** or record another
accepted binding. **Retry unavailable shortcuts** retries registration; it does not promise repair
of a failed modifier listener or delivery in every application. Restart Promptly if the listener
requires recovery. In text fields and dialogs, native typing and focused controls keep their keys.

## A snippet seems truncated or missing

Rows show bounded previews, but search and Copy use the full saved text. Open Regular view to
read the full preview. Clear both search and tag filters to check the whole library.
Copy leaves Promptly open.

## Copy or save succeeded, but Promptly stayed open

Return is a separate step. The previous app may have closed or Windows may have refused
activation. Read the result: a confirmed copy stays copied and a confirmed save stays saved.
With Always on top enabled, Promptly stays visible after return. Paste yourself; Promptly never
pastes automatically. An unavailable return control needs a known previous app, not a retry of
an already confirmed clipboard write.

## Braces were copied literally or a bundle cannot copy

Check **Settings → Shortcuts → Prompt for variable values**, or use Copy as written deliberately.
Only recognized case-sensitive `{{name}}` sequences are variables; unsupported sequences stay
literal. An empty value needs Leave blank. Resolved copies allow 32 distinct names. Copy as written
is available for single-source copies; disable variable prompting to copy literal bundle text. A bundle
needs 2–20 text-bearing snippets and refreshed review after a source changes or disappears.
See [Variables and Bundles](https://github.com/zeyadomran/promptly/wiki/Variables-and-Bundles).

## A file was rejected or an attachment looks missing

Read the named rejection. Files are limited to 10 MiB each, eight per entry and 512 MiB managed
in total. Valid files in a mixed batch still attach. A storage refusal attaches none of that
accepted batch and keeps the draft. Paste attachment ignores clipboard text and reports when
there is no image or file. A failed preview does not itself mean the stored original is gone;
try Save a copy. See [Attachments and Drawing](https://github.com/zeyadomran/promptly/wiki/Attachments-and-Drawing).

## The app cannot open its library or becomes unresponsive

Follow the visible recovery options. If prompted to restart or quit, choose explicitly.
A damaged or newer database is retained rather than automatically reset. Quit before making
any manual profile backup and preserve `promptly.sqlite` plus any WAL/SHM companions together.
Do not delete the profile to troubleshoot. Report the visible error using harmless reproduction
data instead of uploading the database.

## Installation and updates

Use the [latest published Windows x64 installer](https://github.com/zeyadomran/promptly/releases),
or find notes and other versions on [Releases](https://github.com/zeyadomran/promptly/releases).
Installer construction or signing does not qualify every native capture source.
Windows 10 runtime compatibility and SmartScreen behavior remain manually unqualified.
Updates are available in the installed Windows app. If a check or download fails,
check your connection and choose **Retry** from **Settings → About**.
Development and unpackaged builds show updates as unavailable. See the
[release guide](https://github.com/zeyadomran/promptly/blob/main/RELEASING.md).

Report ordinary bugs through [CONTRIBUTORS.md](https://github.com/zeyadomran/promptly/blob/main/CONTRIBUTORS.md).
Report suspected vulnerabilities privately through [SECURITY.md](https://github.com/zeyadomran/promptly/blob/main/SECURITY.md).
Include the app/Windows/source-app versions, steps, expected outcome, and visible status.
Do not include private snippets, exports, profile data, credentials, or raw native replies.

See the [Privacy Policy](https://github.com/zeyadomran/promptly/blob/main/PRIVACY.md) for local data
and what you choose to share in reports.
