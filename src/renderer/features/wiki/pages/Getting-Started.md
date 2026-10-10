# Getting Started

Promptly currently targets Windows x64, with Windows 11 as the primary development environment.
Windows 10 compatibility remains manually unqualified. macOS, Linux, x86, and ARM64 are unsupported.

## Install

1. [Download the latest published Windows x64 installer](https://github.com/zeyadomran/promptly/releases).
2. Run `Promptly-x64-Setup.exe` and open Promptly from the Windows Start menu.
3. Follow the first-launch walkthrough below.

See [Releases](https://github.com/zeyadomran/promptly/releases) for release notes and other versions,
or [Development](https://github.com/zeyadomran/promptly/wiki/Development) to build locally.

## Your first snippet

1. On the welcome screen, choose **Press to begin**, then **Press to start** after the guide.
2. Test your capture shortcut. The default is two completed taps of **Shift**; this first test
   saves nothing. You can choose Ctrl or Alt double-taps or **Record a combination** instead.
3. After the shortcut is detected, choose **Continue**. Select the text in the readonly
   practice prompt and use your shortcut to save it.
4. A saved confirmation appears only after the text is stored. If capture is unavailable,
   use **Back** to change the shortcut or **Skip** to continue.
5. Choose your theme, launch-at-login and tray preferences, and Compact or Regular starting view.
6. Choose **Open my library**, then find your snippet and click its row to copy the complete text.
   **Read the guide** opens the in-app Wiki instead.

**Set up later** on the introduction skips setup. Settings lets you change these preferences later.
In the walkthrough, **Enter** continues and **Left Arrow** goes back when a control or recorder
does not own the keys.

The practice prompt is inside Promptly. Its terminal-style presentation does not demonstrate
capture from a real Claude terminal.

The default **Alt+Space** shortcut shows or hides the library. It may conflict with Windows'
window menu; [Keyboard Shortcuts](https://github.com/zeyadomran/promptly/wiki/Keyboard-Shortcuts)
explains changing it. You can also choose **Open Promptly** from the tray menu.

Use Compact for quick search and copy, or Regular for a full-text preview and editing controls.
See [Library and Search](https://github.com/zeyadomran/promptly/wiki/Library-and-Search).

You can create text without capturing it. Choose **Library** or **Queue** in the workspace bar,
then **New** or **Ctrl+N**. Type text or attach a file, choose the destination under **Add to**,
then **Save**. **Alt+Shift+N** is the default global quick-compose shortcut; change its destination
under **Settings → General → Quick compose adds to**. Existing shortcut conflicts can leave new
defaults unassigned. See [Compose and Queue](https://github.com/zeyadomran/promptly/wiki/Compose-and-Queue).

Ordinary Copy leaves Promptly open. **Copy and return** copies before attempting to activate the
previous app; paste yourself. Templates can prompt for values before copying. Files and drawings
have separate image-copy/export controls; text Copy omits them.

The title bar has controls for **Always on top**, **Wiki**, **Settings**, and the Compact/Regular
view switcher. Settings and Wiki open in the main window; the top-left **Back to library** control
returns to your snippets. **F1** opens or closes the in-app Wiki unless assigned to another command.
