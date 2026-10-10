# Keyboard Shortcuts

Open **Settings → Shortcuts** to view or change the current bindings.

## Defaults

| Command                                | Default                                    |
| -------------------------------------- | ------------------------------------------ |
| Capture selection (global)             | Double-tap Shift                           |
| Show or hide Promptly (global)         | Alt+Space                                  |
| Toggle always on top (global)          | Unassigned                                 |
| Quick compose (global)                 | Alt+Shift+N                                |
| New in the current workspace           | Ctrl+N                                     |
| Show Library / Queue                   | Ctrl+1 / Ctrl+2                            |
| Next / previous snippet                | Down / Up                                  |
| Copy selected snippet                  | Enter                                      |
| Copy selected text and return          | Ctrl+Enter                                 |
| Mark done / reopen a queued prompt     | Ctrl+D                                     |
| Move queued prompt or bundle item      | Alt+Up / Alt+Down                          |
| Bundle (Select for bundle)             | Ctrl+B                                     |
| Delete selected snippet outside search | Delete or Backspace                        |
| Focus search                           | Ctrl+F                                     |
| Open selected snippet's tags           | Ctrl+T                                     |
| Open Settings                          | Ctrl+,                                     |
| Dismiss                                | Escape: clear search first, otherwise hide |
| Open or close in-app Wiki              | F1, unless assigned to another command     |
| Cancel text edit                       | Escape                                     |

In-app commands run when their command owns keyboard focus. Typing, text selection, clipboard
keys, control navigation, and IME composition retain their native behavior. **Tab** moves focus.
Escape in an overlay or editor is handled there before library dismissal.

In the composer, **Ctrl+Enter** saves, **Ctrl+Shift+Enter** saves and returns when available,
and **Ctrl+Shift+V** runs Paste attachment. In variable-value or bundle review, **Ctrl+Enter**
copies and **Ctrl+Shift+Enter** copies and returns when available. These contextual commands
do not turn ordinary Save into a clipboard action. Text fields keep their native editing and
clipboard keys. See [Attachments and Drawing](https://github.com/zeyadomran/promptly/wiki/Attachments-and-Drawing)
for canvas shortcuts.

Global quick compose adds to Queue by default; **Settings → General → Quick compose adds to**
can choose Library. The global binding and new in-app commands can be disabled. Existing
custom bindings survive upgrades; a missing conflicting new default stays unassigned.
Copy and return never pastes. Availability requires a previously foreground app and remains
advisory until activation succeeds.

## Change a binding

For **Capture selection**, choose **Double-tap** and its **Modifier**, or select
**Key combination** to record a combination. For other commands, click the current binding and press the new
keys. Release the keys to apply the candidate. Click the recorder again or move focus away to
cancel; local recording also offers **Cancel**. Local Escape can itself be recorded.

If the candidate is already used by another Promptly command, the recorder identifies it.
Choose **Swap** when offered to exchange the bindings, or **Cancel** to keep the current ones.
Some conflicts cannot be swapped; the recorder explains why.

Double-tap timing is adjustable. **Reset all** restores global and in-app defaults,
including the double-tap timing. The In-app group's **Reset** restores only its bindings.
Existing bindings stay authoritative until a replacement is accepted.

## Registration status

The Global group summarizes configured bindings, for example **All registered** or **Capture unavailable**.
Open and pin rows also show their individual status. Hover or focus a status to read its detail.

- **Registered** means the shortcut is available; it does not prove capture support or delivery in every app.
- **Checking** means registration has not been verified yet. **Not set** is an unassigned optional binding.
- **Suppressed** appears during recording or session suspension; **Paused** means capture is paused.
- **Listener unavailable** or **Windows didn’t accept this** means the listener or combination is unavailable.
- **Restart required** means shortcut recovery needs a Promptly restart.

Alt+Space also opens Windows' window menu and may conflict. The Settings button
**Use Ctrl+Alt+Space** offers an alternative if Windows accepts it. If registration is unavailable,
use **Retry unavailable shortcuts** or choose another binding. Registration success alone does not
prove delivery in every application. A failed modifier listener may require restarting Promptly.
