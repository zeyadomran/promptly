# Settings

Open Settings with **Ctrl+,**, the title bar control, or **Settings** in the tray menu.
The shortcut can be customized.

| Section                                    | What you can change                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| [General](promptly:settings/general)       | Launch at login, show in system tray, default Compact/Regular size                 |
| [Shortcuts](promptly:settings/shortcuts)   | Global and in-app bindings, double-tap timing, capture confirmation, normalization |
| [Appearance](promptly:settings/appearance) | Light, Dark, or System theme; Always on top                                        |
| [Tags](promptly:settings/tags)             | Create, rename, recolor, merge, or delete tags                                     |
| [Storage](promptly:settings/storage)       | JSON/Markdown export, JSON import, Clear all                                       |
| [About](promptly:settings/about)           | Running version, updates, offline wiki, repository and privacy information         |

**Default size** applies when Promptly starts; the current window remains at its current size.
Promptly remembers window geometry for its views. **Always on top** keeps it above other windows
and applies on startup.

**Launch at login** shows Windows' actual launch state separately from the saved request.
If Windows has disabled startup, enabling it explicitly may be needed. An unavailable native
control does not prevent changing unrelated settings.

Hiding the tray icon does not quit Promptly. Use the configured Open shortcut or its taskbar
window to regain access. The tray menu can open Promptly or Settings, copy recent snippets,
pause/resume capture, and **Quit** the app fully.

The version shown is the running app's version. In the installed Windows app, update checks run on startup and can also be requested from
[Settings â†’ About](promptly:settings/about). Downloading an available update and restarting
are explicit choices. Development and unpackaged builds report updates as unavailable.
Update checks contact GitHub; cloud sync and telemetry are not configured.

See [Keyboard Shortcuts](https://github.com/zeyadomran/promptly/wiki/Keyboard-Shortcuts),
[Tags](https://github.com/zeyadomran/promptly/wiki/Tags), and
[Backup and Restore](https://github.com/zeyadomran/promptly/wiki/Backup-and-Restore).
