# Troubleshooting

## Nothing is captured

Check that capture is not paused in the tray menu and that [Settings → Shortcuts](promptly:settings/shortcuts) shows
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

## The app cannot open its library or becomes unresponsive

Follow the visible recovery options. If prompted to restart or quit, choose explicitly.
A damaged or newer database is retained rather than automatically reset. Quit before making
any manual profile backup and preserve `promptly.sqlite` plus any WAL/SHM companions together.
Do not delete the profile to troubleshoot. Report the visible error using harmless reproduction
data instead of uploading the database.

## Installation and updates

Published unsigned Windows installers are available on the
[Releases page](https://github.com/zeyadomran/promptly/releases). Installer construction alone
does not qualify every native capture source. Windows 10 runtime
compatibility and signing/SmartScreen behavior remain unqualified. Updates are available in the installed Windows app. If a check or download fails,
check your connection and retry from [Settings → About](promptly:settings/about).
Development and unpackaged builds show updates as unavailable. See the
[release guide](https://github.com/zeyadomran/promptly/blob/main/RELEASING.md).

Report ordinary bugs through [CONTRIBUTORS.md](https://github.com/zeyadomran/promptly/blob/main/CONTRIBUTORS.md).
Report suspected vulnerabilities privately through [SECURITY.md](https://github.com/zeyadomran/promptly/blob/main/SECURITY.md).
Include the app/Windows/source-app versions, steps, expected outcome, and visible status.
Do not include private snippets, exports, profile data, credentials, or raw native replies.
