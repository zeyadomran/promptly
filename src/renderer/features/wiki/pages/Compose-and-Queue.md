# Compose and Queue

Library holds reusable snippets. Queue holds prompts you plan to work through, with separate
**Open** and **Done** lists. Saved prompts stay in Queue after you quit and reopen Promptly.

## Create a snippet or prompt

1. Choose **Library** or **Queue** in the workspace bar, then **New snippet** or **New prompt**
   (**New** in Compact). The default in-app shortcut is **Ctrl+N**.
2. Type your text. **Add to** chooses **Queue** or **Library** for a new draft. You can also add
   tags and [attachments](https://github.com/zeyadomran/promptly/wiki/Attachments-and-Drawing).
3. Choose **Save**. Text is saved exactly as typed, including whitespace and `{{variables}}`.
   Capture normalization does not apply to composed text. Saving does not write the clipboard.

A draft needs nonblank text or at least one attachment. Attachment-only entries can be saved,
but their text Copy and bundle actions are unavailable. The composer keeps one draft through
workspace navigation and Compact/Regular changes. It does not replace an existing draft when
New is invoked again. **Cancel** on a changed draft offers **Save**, **Discard**, or **Keep editing**.
A failed save keeps your draft and staged attachments. Save work before quitting the app.

The composer **Copy** menu copies the current draft text without saving it. Recognized variables
can be filled for this copy only; attachments are omitted. See
[Variables and Bundles](https://github.com/zeyadomran/promptly/wiki/Variables-and-Bundles).

## Quick compose from another app

The default global quick-compose shortcut is **Alt+Shift+N**. It opens Promptly and focuses the
composer. **Settings → General → Quick compose adds to** chooses Queue or Library for a new
global draft; Queue is the default. Change or disable the binding under **Settings → Shortcuts**.
If Windows cannot register it, use the visible New button or choose another binding.

Existing custom shortcuts are preserved during an upgrade. A missing new default that conflicts
with an established binding is left unassigned; review Settings rather than assuming every
default was enabled.

## Work through Queue

- **Open** shows pending prompts in manual order. **Done** keeps completed prompts.
- Copy uses full prompt text and leaves its status unchanged. Choose **Mark done** explicitly
  after using a prompt; choose **Reopen** to return a completed prompt to Open.
- Drag Open rows to reorder them, or use **Alt+Up / Alt+Down** when queue navigation owns focus.
  The prompt menu also offers **Move to top**.
- **Edit** changes a prompt through the composer. **Save to library** creates a reusable snippet
  and keeps the prompt in Queue. A Library snippet's **Add to queue** creates a separate prompt;
  later text edits do not change its source snippet.
- Completion and deletion offer temporary **Undo**. Completion Undo restores before the same
  next Open neighbour, or at the end if that neighbour is gone. If you edited a completed prompt
  before Undo, its current content is kept.

Queue can hold up to **2,000** saved prompts across Open and Done. A JSON backup includes both
lists, their order and attachments, even when Library is empty. See
[Backup and Restore](https://github.com/zeyadomran/promptly/wiki/Backup-and-Restore).

## Copy or save and return

**Copy** writes text and keeps Promptly open. **Copy and return** writes the clipboard first,
then attempts to return to the recent external app observed when Promptly opened or regained
focus. **Save and return** saves the draft first and then attempts the same return; it does
not copy text.

Promptly observes window and process identity while it runs to refresh the return target when
refocused. This tracking does not read app text or save an app history. Return availability is
conservative: these actions are unavailable if Promptly cannot establish or validate a target.

Promptly never pastes automatically. Paste yourself in the target app. If that app closed or
Windows refuses activation, the copy or save remains successful and Promptly reports why it
stayed open. With **Always on top** enabled, Promptly stays visible after a successful return.

See [Keyboard Shortcuts](https://github.com/zeyadomran/promptly/wiki/Keyboard-Shortcuts).
