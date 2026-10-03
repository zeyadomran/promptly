# Promptly Privacy Policy

Last updated: October 3, 2026

Promptly is an open-source Windows application developed and maintained by Zeyad Omran. This policy explains how the app handles information and how information is handled when you visit its GitHub repository, download releases, or contact the maintainer.

## Your library stays on your computer

Promptly does not require an account. It does not send your snippet library to the maintainer, a cloud synchronization service, or an AI provider. The app has no advertising, analytics, or automatic crash-report uploads.

Promptly stores the following information locally to provide its features:

- Text you capture, type, or import, including any personal information in that text.
- Snippet identifiers, creation and modification dates, tags, and tag colors.
- The source application's name and executable filename when available during capture.
- Copy counts and the date a snippet was last copied, used for library sorting.
- Preferences such as appearance, shortcuts, window position, startup behavior, and onboarding progress.

The library and preferences are stored in a SQLite database in Promptly's application data folder, normally `%APPDATA%\Promptly`. Settings provides a way to open this folder. Promptly does not encrypt this database or exported files; their protection depends on your Windows account, device security, and any disk encryption you use.

## Capture, shortcuts, and the clipboard

When you invoke capture, Promptly asks the foreground application's Windows accessibility provider for selected text. It attempts to reject protected or password selections; what is available depends on the source application's accessibility support. Choose carefully what you capture.

Global shortcut detection processes keyboard events locally to recognize configured shortcuts. It does not save a history of what you type. Temporary process and window identifiers are used to capture from, position feedback near, and return to the source application.

Native capture does not read the clipboard or simulate Copy. Explicit Copy actions place the chosen snippet on the Windows clipboard. Other applications and Windows clipboard history or synchronization may then access that text according to your system settings. Capture previews can display snippet text on screen.

## Updates and external links

Installed builds check GitHub's public release API at startup. You can also check for updates in Settings. This request retrieves release metadata; it does not upload snippets, tags, searches, copy statistics, or preferences. Downloading and applying an update requires you to choose **Update**. Restarting through the updater requires **Restart now**; an accepted update can also take effect on your next normal launch.

GitHub and its delivery infrastructure receive ordinary connection information, such as your IP address, request time, requested URL, and HTTP headers. Update downloads identify the requested release. The initial release check uses the user-agent `Promptly-update-check`.

Opening the repository, wiki, or this policy launches your browser and connects to GitHub. GitHub separately handles visitor data, cookies, accounts, and downloads under the [GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). These services may process data in countries other than your own. Promptly does not control their practices or your browser's settings.

## Backups, imports, and deletion

You choose where JSON backups and Markdown exports are saved. If you choose a shared or cloud-synchronized folder, the relevant service may receive those files. Import previews use temporary local files containing imported library data. Promptly attempts to remove these files when the preview is retired; an interrupted process or cleanup failure can leave temporary files behind.

You can view, edit, export, and delete snippets in the app. **Clear library** removes snippets and tags from the active library but retains preferences. Deleting a snippet may temporarily retain an in-memory copy for Undo. Deletion is not a secure erase: database files, temporary files, backups, exports, clipboard history, or system backups may retain copies.

Updates and uninstalling Promptly retain its application data folder. To remove all local app data, fully quit Promptly and separately remove that folder. Remove any backups, exports, and other copies you no longer need as well. The maintainer cannot access, recover, or delete a library that has remained solely on your device.

## Information you choose to share

If you open an issue, contribute code, or send a report, the maintainer receives the GitHub identity and information you choose to include, such as contact details, screenshots, or diagnostic information. This information is used to respond, investigate problems, maintain the project, and address security or privacy requests. Public issues, comments, and contributions are visible to others and may remain in the project's history.

The maintainer does not sell personal information or use it for advertising. Information you submit may be accessible to GitHub and relevant project collaborators, or disclosed where required by law. Support and project records are retained as needed to handle the request and maintain the project; GitHub's own retention and deletion practices also apply. Avoid posting private snippets, credentials, database files, or other sensitive information publicly.

## Questions and requests

For questions about this policy or information you have shared with the maintainer, [open a GitHub issue](https://github.com/zeyadomran/promptly/issues/new) addressed to Zeyad Omran. For a request involving personal information, initially state only that you need a private follow-up; do not include the personal information in the public issue. Requests to access, correct, or remove information shared with the maintainer can be raised through this channel. Information held solely by GitHub is subject to GitHub's own request process.

For security vulnerabilities or unintended disclosure by the app, use [GitHub's private vulnerability reporting form](https://github.com/zeyadomran/promptly/security/advisories/new).

## Changes to this policy

Changes will be published in this file with an updated date. You can review previous versions in the file's GitHub history. Changes to the app's data handling should be reflected here and in the relevant release notes.
