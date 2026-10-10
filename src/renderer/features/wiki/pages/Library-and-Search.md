# Library and Search

Use the title bar's window-size control to choose **Compact** or **Regular**. Compact provides
quick search and copy. Regular adds a full-text preview, tags, metadata, and editing controls.
**Settings → General → Default size** chooses the view used next time Promptly starts;
it does not resize the current window.

## Find a snippet

- Type in **Search** or press **Ctrl+F**. Search matches the full saved text even when a row
  shows only a shortened preview.
- Select tag filters, or use query filters such as `tag:review` and `from:terminal`.
  Quote names with spaces, for example `tag:"code review"`. Multiple terms and filters are
  combined, so results must match them all.
- Open the sort button showing the current order (initially **Newest first**). Under **Sort by**,
  choose **Newest first**, **Oldest first**, **Most copied**, or **Recently copied**.
- Clear the query and tag filters to return to the whole library.

## Copy and edit

Click a snippet row to copy its full text. In Regular view, it also becomes the previewed
snippet. When Bundle selection is active, rows select without copying. Compact view keeps a
uniform item style. Copy leaves the window open. Recognized variables prompt for values when
enabled; **Copy as written** keeps braces literal.
The Regular preview also has a **Copy** button. Use the arrow keys to select a
snippet and **Enter** to copy when library navigation owns keyboard focus.

In Regular view, choose **Edit**, change the text, and select **Apply changes**. **Cancel**
discards the draft. If you move away with unsaved edits, respond to the draft choice before
continuing. The **More snippet actions** menu offers **Copy as Markdown**, **Duplicate**,
and **Delete snippet**. Deleting a snippet offers temporary **Undo** feedback.

The Regular preview shows the source app when available and the capture time. The count above
the list shows the total snippets or the filtered result count; the footer offers keyboard hints
and pin status. Row previews are shortened to fit; search, the full preview, and Copy still use
the complete text.

The workspace bar switches between Library and Queue. **New snippet** (**New** in Compact)
opens the composer; choose the destination under **Add to**, then **Save**. Saved entries can
contain only attachments, in which case text Copy and bundle selection are unavailable.
Rows show an attachment count and, when variable prompting is enabled, the distinct variable
count. **Copy and return** copies before attempting to switch to the previous app; it never pastes.

The saved snippet's actions also offer **Add to queue**. **Bundle** (Select for bundle) starts a temporary
ordered selection of 2–20 snippets, including selected rows hidden by search or tag filters.
See [Compose and Queue](https://github.com/zeyadomran/promptly/wiki/Compose-and-Queue),
[Attachments and Drawing](https://github.com/zeyadomran/promptly/wiki/Attachments-and-Drawing),
and [Variables and Bundles](https://github.com/zeyadomran/promptly/wiki/Variables-and-Bundles).

See [Tags](https://github.com/zeyadomran/promptly/wiki/Tags) and
[Keyboard Shortcuts](https://github.com/zeyadomran/promptly/wiki/Keyboard-Shortcuts).
