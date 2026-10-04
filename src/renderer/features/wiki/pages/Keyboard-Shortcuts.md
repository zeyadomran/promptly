# Keyboard Shortcuts

Open [Settings → Shortcuts](promptly:settings/shortcuts) to view or change the current bindings.

## Defaults

| Command                                | Default                                    |
| -------------------------------------- | ------------------------------------------ |
| Save selection (global)                | Double-tap Shift                           |
| Show or hide Promptly (global)         | Alt+Space                                  |
| Toggle always on top (global)          | Unassigned                                 |
| Next / previous snippet                | Down / Up                                  |
| Copy selected snippet                  | Enter                                      |
| Delete selected snippet outside search | Delete or Backspace                        |
| Focus search                           | Ctrl+F                                     |
| Open selected snippet's tags           | Ctrl+T                                     |
| Open Settings                          | Ctrl+,                                     |
| Dismiss                                | Escape: clear search first, otherwise hide |
| Open offline wiki                      | F1, unless assigned to another command     |
| Cancel text edit                       | Escape                                     |

In-app commands run when their command owns keyboard focus. Typing, text selection, clipboard
keys, control navigation, and IME composition retain their native behavior. **Tab** moves focus.
Escape in an overlay or editor is handled there before library dismissal.

## Change a binding

For capture, choose **Double-tap a modifier** and select the modifier, or click the
**Key combination** recorder. For other commands, click the current binding and press the new
keys. Release the keys to apply the candidate. Click the recorder again or move focus away to
cancel; local recording also offers **Cancel**. Local Escape can itself be recorded.

Double-tap timing is adjustable. **Reset all** restores global and in-app defaults,
including the double-tap timing. Existing bindings stay authoritative until Windows accepts
their replacement.

Alt+Space also opens Windows' window menu and may conflict. The Settings button
**Use Ctrl+Alt+Space** offers an alternative if Windows accepts it. If registration is unavailable,
use **Retry unavailable shortcuts** or choose another binding. Registration success alone does not
prove delivery in every application. A failed modifier listener may require restarting Promptly.
