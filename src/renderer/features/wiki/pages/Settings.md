# Settings

Open Settings with **Ctrl+,**, the title bar control, or **Settings** in the tray menu.
The shortcut can be customized.

Choose a section in Settings navigation. Settings stays inside the main window;
use the top-left **Back to library** control or the Settings title bar button to return.

| Section        | What you can change                                                               |
| -------------- | --------------------------------------------------------------------------------- |
| **General**    | Launch at login, show in system tray, default size, Quick compose adds to         |
| **Shortcuts**  | Global/in-app bindings, variable prompting, double-tap timing and capture options |
| **Appearance** | Light, Dark, or System theme; Always on top                                       |
| **Tags**       | Create, rename, recolor, or delete tags                                           |
| **Storage**    | Complete JSON backup, text-only Markdown, JSON import, Clear all data             |
| **About**      | Running version, updates, offline wiki, repository and privacy information        |

**Default size** applies when Promptly starts; the current window remains at its current size.
Promptly remembers window geometry for its views. **Always on top** keeps it above other windows
and applies on startup.

**Launch at login** shows Windows' actual launch state separately from the saved request.
If Windows has disabled startup, enabling it explicitly may be needed. An unavailable native
control does not prevent changing unrelated settings.

Hiding the tray icon does not quit Promptly. Use the configured Open shortcut or its taskbar
window to regain access. The tray menu can open Promptly or Settings, copy recent snippets,
pause/resume capture, and **Quit** the app fully.

## Updates

**Settings → About** shows the version running on your computer and the **Updates** controls.
Installed Windows builds check when the window opens or is restored; choose **Check for updates**
to check manually.
Choose **Download** for an available update and **Restart now** when it is ready. A failed check,
download, or restart offers **Retry**. Downloading and restarting require your choice.

An available update can also appear in the title bar. Its button downloads an available update,
retries a failed action, or restarts when the update is ready. A startup notification opens About when clicked.
Dismissal does not authorize downloading. Development and unpackaged builds report updates as unavailable.
Update checks contact GitHub; cloud sync and telemetry are not configured.

## Composing and copying

**General → Quick compose adds to** chooses Queue or Library for new global-shortcut drafts.
The **Quick compose** binding is under Shortcuts; it can be changed or disabled. Existing custom
bindings survive upgrades. Conflicting missing defaults remain unassigned instead of replacing
an established shortcut.

**Shortcuts → Prompt for variable values** is on by default. Turning it off makes ordinary
Copy use literal `{{name}}` text and hides variable indicators. It does not edit saved content.
Copy always keeps Promptly open unless you explicitly choose Copy and return. No action
pastes automatically. See [Variables and Bundles](https://github.com/zeyadomran/promptly/wiki/Variables-and-Bundles).

## Help and privacy

About also provides **Open wiki**, **Open repository**, and **Privacy policy**.
The in-app Wiki works offline; repository and privacy links open your browser.
Read the [Privacy Policy](https://github.com/zeyadomran/promptly/blob/main/PRIVACY.md) for details.

See [Keyboard Shortcuts](https://github.com/zeyadomran/promptly/wiki/Keyboard-Shortcuts),
[Tags](https://github.com/zeyadomran/promptly/wiki/Tags), and
[Backup and Restore](https://github.com/zeyadomran/promptly/wiki/Backup-and-Restore).
