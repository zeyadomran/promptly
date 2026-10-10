# Promptly Privacy Policy

Last updated: October 10, 2026

Promptly is an open-source Windows application developed and maintained by Zeyad Omran. This policy explains how the app handles information and how information is handled when you visit its GitHub repository, download releases, or contact the maintainer.

## Your library stays on your computer

Promptly does not require an account. It does not send your Library, Queue, files, drawings or variable answers to the maintainer, a cloud synchronization service, or an AI provider. The app has no advertising, analytics, or automatic crash-report uploads.

Promptly stores the following information locally to provide its features:

- Text you capture, type, or import, including any personal information in that text.
- Snippet and queued-prompt identifiers, dates, tags and tag colors; Queue order and completion state.
- Managed attachment originals, attachment metadata and hashes, flattened drawing PNGs, editable drawing scenes and references to their original backgrounds.
- Staged attachment drafts and temporary database Undo ownership used to preserve files while an edit or Undo is available. Unreferenced staged bytes can remain until cleanup or the next startup.
- The source application's name and executable filename when available during capture.
- Copy counts and the date a snippet or queued prompt was last copied, used for sorting and feedback.
- Preferences such as appearance, shortcuts, window position, startup behavior, and onboarding progress.

The library and preferences are stored in a SQLite database in Promptly's application data folder, normally `%APPDATA%\Promptly`. Settings provides a way to open this folder. Promptly does not encrypt this database or exported files; their protection depends on your Windows account, device security, and any disk encryption you use.

Variable answers and context-bundle selection/order are transient. They are not written into saved snippets, Queue text, preferences or backups. Prepared copy text and answers are held in memory while their workflow is active; closing or cancelling retires that workflow. Composed draft text and unsaved drawing edits are also temporary. Saving a drawing stages it in the entry's attachment draft; saving the entry commits its chosen content.

## Capture, shortcuts, and the clipboard

When you invoke capture, Promptly asks the foreground application's Windows accessibility provider for selected text. It attempts to reject protected or password selections; what is available depends on the source application's accessibility support. Choose carefully what you capture.

Global shortcut detection processes keyboard events locally to recognize configured shortcuts. It does not save a history of what you type. Temporary process and window identifiers are used to capture from, position feedback near, and return to the source application.

While Promptly runs, it observes foreground window and process identity to maintain a recent external target for return when Promptly is opened or refocused. This foreground tracking keeps that identity in memory. It does not read text from the foreground app or persist a history of apps you use.

Native capture does not read the clipboard or simulate Copy. **Paste attachment** is a separate explicit command that reads clipboard images or files and ignores clipboard text. Chooser/drop intake reads the files you select and stores managed copies locally. Safe image decoding occurs in a private isolated local renderer; it does not fetch remote content.

Explicit text, bundle and image Copy actions write the Windows clipboard, including values you filled for that copy. Other applications and Windows clipboard history or synchronization may then access that content according to your system settings. Capture previews and copy/drawing dialogs can display your content on screen.

**Copy and return** writes the clipboard before attempting to activate the previously foreground app. **Save and return** saves before attempting activation and does not copy. Return availability is advisory; a failed switch does not reverse a confirmed copy or save. Promptly never pastes automatically.

## Updates and external links

Installed builds check GitHub's public release API when the window opens or is restored. You can also check for updates in Settings. This request retrieves release metadata; it does not upload snippets, Queue, attachments, drawings, variable answers, tags, searches, copy statistics or preferences. Downloading and applying an update requires you to choose **Download**. Restarting through the updater requires **Restart now**; an accepted update can also take effect on your next normal launch.

GitHub and its delivery infrastructure receive ordinary connection information, such as your IP address, request time, requested URL, and HTTP headers. Update downloads identify the requested release. The initial release check uses the user-agent `Promptly-update-check`.

Opening the repository, wiki, or this policy launches your browser and connects to GitHub. GitHub separately handles visitor data, cookies, accounts, and downloads under the [GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). These services may process data in countries other than your own. Promptly does not control their practices or your browser's settings.

## Backups, imports, and deletion

You choose where JSON backups, Markdown exports, attachment copies and drawing PNG exports are saved. If you choose a shared or cloud-synchronized folder, the relevant service may receive those files. Complete v3 JSON Lines backups contain saved Library and Queue content, tags, original attachment bytes, drawing PNGs and editable scenes/backgrounds. Markdown is text-only and reports omitted files. Neither format includes preferences, transient variable answers/bundle selections or unsaved work. Import previews use temporary local files containing imported data and attachment bytes. Promptly attempts to remove these files when the preview is retired; an interrupted process or cleanup failure can leave temporary files behind.

You can view, edit, export and delete snippets and queued prompts in the app. **Clear all data**, confirmed with `CLEAR ALL`, removes Library, Queue, tags, managed attachments, staged drafts and Undo ownership while retaining preferences. Ordinary deletion can temporarily retain content in memory and file ownership in the database for Undo. A file remains while another entry, drawing background or active Undo still owns it. Deletion and Clear are not secure erase: database files, temporary files, backups, exports, clipboard history or system backups may retain copies.

Updates and uninstalling Promptly retain its application data folder. To remove all local app data, fully quit Promptly and separately remove that folder. Remove any backups, exports, and other copies you no longer need as well. The maintainer cannot access, recover, or delete a library that has remained solely on your device.

## Information you choose to share

If you open an issue, contribute code, or send a report, the maintainer receives the GitHub identity and information you choose to include, such as contact details, screenshots, or diagnostic information. This information is used to respond, investigate problems, maintain the project, and address security or privacy requests. Public issues, comments, and contributions are visible to others and may remain in the project's history.

The maintainer does not sell personal information or use it for advertising. Information you submit may be accessible to GitHub and relevant project collaborators, or disclosed where required by law. Support and project records are retained as needed to handle the request and maintain the project; GitHub's own retention and deletion practices also apply. Avoid posting private snippets, credentials, database files, or other sensitive information publicly.

## Questions and requests

For questions about this policy or information you have shared with the maintainer, [open a GitHub issue](https://github.com/zeyadomran/promptly/issues/new) addressed to Zeyad Omran. For a request involving personal information, initially state only that you need a private follow-up; do not include the personal information in the public issue. Requests to access, correct, or remove information shared with the maintainer can be raised through this channel. Information held solely by GitHub is subject to GitHub's own request process.

For security vulnerabilities or unintended disclosure by the app, use [GitHub's private vulnerability reporting form](https://github.com/zeyadomran/promptly/security/advisories/new).

## Changes to this policy

Changes will be published in this file with an updated date. You can review previous versions in the file's GitHub history. Changes to the app's data handling should be reflected here and in the relevant release notes.
