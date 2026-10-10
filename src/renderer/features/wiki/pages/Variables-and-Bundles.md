# Variables and Bundles

Variables fill reusable text for one copy. Context bundles combine selected Library snippets
in an order you review. Neither feature rewrites saved snippets or creates a saved bundle.

## Fill variable values

Write a variable such as `{{project}}` in a snippet, queued prompt or draft. With **Settings →
Shortcuts → Prompt for variable values** enabled, copying recognized variables asks you to fill
in values before the clipboard changes. Enter each value, inspect the resolved preview, then
choose **Copy** or **Copy and return**. Cancel leaves the clipboard untouched.

- Names start with a Unicode letter and may continue with Unicode letters, decimal digits,
  `_` or `-`. Names have at most **64 Unicode characters**. Spaces or tabs immediately inside
  the braces are allowed, so `{{ project }}` is valid.
- Names are case-sensitive: `{{Project}}` and `{{project}}` are different. Repeated occurrences
  of the same name share one value, including across snippets in a bundle.
- Empty answers remain unresolved until you choose **Leave blank**. A value consisting only
  of spaces is a value and is preserved.
- Unsupported sequences, such as `{{ }}`, `{{two words}}` or `{{1name}}`, remain literal text.
  Replacement happens once; `{{another}}` inside a supplied value is not expanded again.

For a single snippet, queued prompt or draft, **Copy as written** copies literal braces without
resolving variables. Turning **Prompt for
variable values** off makes ordinary Copy literal as well and hides variable indicators.
When enabled, Library and Queue rows show the recognized distinct-name count, capped as **32+**.
Variable answers are temporary and are not saved to the snippet, Queue, preferences or backup.

A resolved copy allows **32 distinct names**, each value up to **100,000 UTF-16 code units**.
Saved entry text, combined bundle text and resolved copy text have a **1,000,000 UTF-16 code-unit**
limit; some Unicode characters use two units. With too many names, reduce them or use Copy as
written. If saved content changed or the copy preparation expired, refresh and review again.

## Build a context bundle

1. In Library, choose **Bundle** (Select for bundle; default **Ctrl+B**). Rows now select snippets;
   selecting a row or checkbox does not copy anything.
2. Select **2–20** text-bearing snippets. Selection order becomes the initial bundle order.
   Search and tag filters can hide selected rows without removing their selection; the footer
   reports how many are not shown. Clear or Cancel ends selection without copying.
3. Choose **Review bundle**. Reorder or remove snippets and choose
   a separator. Full saved text is used, including text beyond row previews.
4. Fill shared variable values when prompted, check the exact resolved preview, then choose
   **Copy bundle**. Copy and return has the same explicit return behavior as a single copy;
   paste yourself. **Back** returns to selection. To copy literal variables in a bundle,
   turn Prompt for variable values off before preparing it.

| Separator  | Output                                                                  |
| ---------- | ----------------------------------------------------------------------- |
| Blank line | Two newline characters between snippet blocks                           |
| Divider    | A blank line, `---`, and another blank line between blocks              |
| Tagged     | Each block wrapped in numbered `<snippet index="1">…</snippet>` markers |

Trailing CR/LF characters are removed from each source before separators are added; internal
text and leading whitespace remain. The exact preview shows the text that will be copied.
Attachments are omitted and the review reports that the bundle is text only.

Bundle selection and order are temporary. Changed or deleted sources require refreshed review
before copying; Promptly does not silently copy an earlier snapshot. A successful bundle copy
records copy statistics for each included saved snippet, without changing its text.

See [Compose and Queue](https://github.com/zeyadomran/promptly/wiki/Compose-and-Queue),
[Library and Search](https://github.com/zeyadomran/promptly/wiki/Library-and-Search), and
[Keyboard Shortcuts](https://github.com/zeyadomran/promptly/wiki/Keyboard-Shortcuts).
