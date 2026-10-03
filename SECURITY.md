# Security policy

## Report a vulnerability privately

Use GitHub's
[private vulnerability reporting form](https://github.com/zeyadomran/promptly/security/advisories/new)
for suspected security vulnerabilities in Promptly. Do not disclose the details in a
public issue or pull request. Ordinary bugs belong in
[GitHub Issues](https://github.com/zeyadomran/promptly/issues), following
[CONTRIBUTORS.md](CONTRIBUTORS.md).

Include the affected version or commit, Windows version and architecture, a description
of the impact, and reproducible steps or a minimal proof of concept using harmless
fixture data. Explain any prerequisites, such as an elevated source application.
Do not include private snippets, credentials, databases, backups, or raw capture replies.

Coordinate disclosure in the private report while the maintainer investigates and
prepares a fix. There is no guaranteed response deadline or bug bounty program.

## Supported scope

Promptly is under development. Security fixes target the current `main` branch;
older development builds are not maintained as separate security release lines.
The supported application target is Windows x64. Installer builds are unsigned
development artifacts and have not completed production release qualification.

Report issues involving capture privacy, unsafe IPC or renderer isolation, file/import
handling, helper ownership, or unintended data disclosure through the private channel.
Local storage and backups can contain sensitive snippet text; handle them as private data.
