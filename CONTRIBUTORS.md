# Contributing to Promptly

Contributions and ordinary bug reports are welcome through
[GitHub Issues](https://github.com/zeyadomran/promptly/issues) and pull requests.
For questions about using the app, start with the
[wiki](https://github.com/zeyadomran/promptly/wiki).

## Report a bug

Search existing issues first. Include your Promptly version, Windows version and
architecture, the view or command involved, steps to reproduce, expected behavior,
and what actually happened. For capture problems, include the source application and
version, whether it was elevated, and the visible capture status. Use harmless fixture
text and redact screenshots; do not upload private snippets, backups, database files,
profile data, or raw native selection replies.

For a suspected security vulnerability, follow [SECURITY.md](SECURITY.md) and report
privately rather than opening a public issue.

## Propose a change

Discuss substantial features or architecture changes in an issue before implementing.
Keep changes focused, describe the resulting behavior, and link the related issue.
Promptly currently supports Windows x64 and native UI Automation capture; clipboard
capture fallback and other platforms are deferred.

Read [DEVELOPMENT.md](DEVELOPMENT.md) for setup, process boundaries, coding conventions,
and build commands. Read [TESTING.md](TESTING.md) before adding or changing tests:
extend the canonical public-service flow rather than duplicating it across suites.
Use owned temporary data and controlled external boundaries. Avoid speculative tests
for cosmetic changes and do not introduce native/GUI fixture frameworks.

## Submit a pull request

Use Conventional Commit titles, such as `fix: preserve snippet tags` or
`docs: explain capture limitations`. Explain the problem, resulting behavior, checks
performed, and material limitations. Run the required checks and relevant packaging
steps in [DEVELOPMENT.md](DEVELOPMENT.md); applicable CI must pass at the current PR head.
Separate functional evidence from manual native qualification. Follow the merge and
review conventions in [repository maintenance](.github/MAINTENANCE.md).

Keep third-party license texts and provenance intact. First-party contributions are
covered by the repository's [MIT License](LICENSE); dependencies retain their own terms.
