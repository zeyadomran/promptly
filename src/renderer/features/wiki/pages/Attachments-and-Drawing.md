# Attachments and Drawing

Snippets and queued prompts can contain managed files, images and editable drawings. An entry
can have attachments without text. Text Copy, Markdown copy and bundles omit all attachments;
use **Copy image** or **Save a copy…** for an individual attachment.

## Attach files

In a new composer or snippet editor, choose **Add files**, drop files onto the attachment area,
or choose **Paste attachment**. The default composer shortcut for Paste attachment is
**Ctrl+Shift+V**. This explicit command reads clipboard images or files; clipboard text is ignored.
If none is available, Promptly says “The clipboard has no image or file to attach.”

Promptly copies accepted original bytes into its local SQLite storage. Moving or deleting the
source file afterward does not remove the managed attachment. A pasted image is named
`Pasted image.png`. Files are not uploaded to an AI provider or cloud service.

Limits are **8 attachments per entry**, **10 MiB per file**, and **512 MiB** of managed attachment
bytes. When several files include rejected files, valid files attach and one message names each
rejection. A storage write failure attaches none of the accepted batch and keeps your draft.
An attachment chip shows its name, size and, for previewable images, dimensions.

PNG, JPEG, GIF, WebP and BMP images can be previewed and annotated. Images above **8192 px** on
the long edge or **40 megapixels** are stored as generic files. Previews are safe raster copies;
the original bytes remain available through Save a copy. GIF output uses a still frame.

In a draft, **Remove** is staged until you save. Cancel restores the saved entry's attachments.
On a saved entry, the attachment menu offers **Preview**, **Copy image**, **Annotate**, and
**Save a copy…** as applicable. Annotate first enters the entry's attachment-edit draft.
Removing one reference does not delete an original still used by another entry, drawing or Undo.

## Draw or annotate

Choose **Draw** for a white **1280 × 800** canvas. **Annotate** uses a safe image raster scaled
to at most **4096 px** on its long edge, respecting the decoder's actual orientation and size.
The background is locked. Saving an annotation adds a separate drawing and keeps the original
image. **Edit drawing** reopens its editable scene and replaces that drawing in the draft.

Use **Select**, **Pen**, **Arrow**, **Rectangle**, or **Text**, and the color swatches. Selection lets
you move, recolor or delete an element. Undo and Redo apply to drawing edits; the original
background remains unchanged. Text is a single line placed on the canvas.

| Command                                 | Default in the drawing editor   |
| --------------------------------------- | ------------------------------- |
| Select / Pen / Arrow / Rectangle / Text | V / P / A / R / T               |
| Undo / Redo                             | Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y |
| Add the current shape with canvas focus | Enter                           |
| Select another element                  | Page Up / Page Down             |
| Move selection                          | Arrow keys; Shift moves 10 px   |
| Delete selection                        | Delete or Backspace             |
| Save drawing to the draft               | Ctrl+Enter                      |

Toolbar arrows move among controls; Tab retains normal focus navigation. Text input keeps its
typing keys. Escape cancels a current gesture or text placement before closing the editor.

**Save to prompt** or **Save to snippet** stages the drawing in the entry's draft and closes the
drawing editor. Save the containing entry afterward. **Copy PNG** and **Export PNG** use the
current unsaved canvas, leave the editor open, and do not save or replace the staged attachment.
PNG output includes a white background. **Cancel** on changed work offers Save, Discard, or
Keep drawing; Discard leaves the previous staged drawing unchanged.

A scene allows **500 elements**, **5,000 points per stroke**, **50,000 aggregate element points**,
and **1 MiB** of serialized scene data. A text element allows **10,000 UTF-16 code units**.
PNG output must fit the **10 MiB** file limit. A rejected save keeps the drawing open for editing.

Complete JSON backups retain originals, flattened drawing PNGs, editable scenes and their
background ownership. Markdown exports omit files and report omitted attachment counts.
See [Backup and Restore](https://github.com/zeyadomran/promptly/wiki/Backup-and-Restore) and
the [Privacy Policy](https://github.com/zeyadomran/promptly/blob/main/PRIVACY.md).
