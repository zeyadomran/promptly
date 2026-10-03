# Development

The source repository maintains the developer and contributor guides:

- [DEVELOPMENT.md](https://github.com/zeyadomran/promptly/blob/main/DEVELOPMENT.md): prerequisites,
  run/check/build commands, process boundaries, native capture, and dependencies.
- [TESTING.md](https://github.com/zeyadomran/promptly/blob/main/TESTING.md): canonical functional
  flows, one-test-per-flow policy, and manual release checks.
- [RELEASING.md](https://github.com/zeyadomran/promptly/blob/main/RELEASING.md): unsigned Windows
  installer construction, artifact provenance, and remaining qualification.
- [CONTRIBUTORS.md](https://github.com/zeyadomran/promptly/blob/main/CONTRIBUTORS.md): contributions
  and ordinary bug reporting.
- [SECURITY.md](https://github.com/zeyadomran/promptly/blob/main/SECURITY.md): private vulnerability reporting.
- [License provenance](https://github.com/zeyadomran/promptly/blob/main/packaging/README.md):
  retained third-party terms and outstanding installer dependency qualification.

The maintained target is Windows x64. Functional CI verifies service behavior and constructs
the package; it does not qualify actual OS shortcut delivery, capture, accessibility, or focus.
Use owned profiles and harmless fixture text for any manual checks.

The old repository docs, design references, and native qualification receipts are available
in [Git history](https://github.com/zeyadomran/promptly/tree/292f584f0424f8b2101d71472d40efc427804be4/docs).
They describe their historical checkout and are not current setup instructions or proof that
remaining native behavior passed.
