# Repository maintenance

## Main branch

Changes enter `main` through pull requests, including administrator changes.
No approving review is required, matching the solo-maintainer setup in
`bob-kanban` and `carbon-react-mcp`. Stale approvals are dismissed, conversations
must be resolved, and `Workflow validation` must pass against an up-to-date branch.
Force pushes and branch deletion are blocked.

`Workflow validation` is the only check currently required by branch protection.
Before merging, the maintainer also verifies every applicable check passes at the
PR's current head: `Functional checks (windows-latest)`,
`Functional checks (macos-latest)`, `Analyze (actions)`, and
`Analyze (javascript-typescript)`. Branch protection does not enforce these
additional checks.

Only squash merges are enabled. Use Conventional Commits for every commit and PR
title, such as `feat: add prompt editor`, `fix: preserve draft content`, or
`ci: update GitHub Actions`. The PR title becomes the squash commit message.
Merged branches are automatically deleted. Auto-merge and the update-branch
button are enabled; auto-merge still requires all branch protections to pass.

## Checks and dependencies

CI validates GitHub Actions workflows with actionlint on every pull request and
push to `main`. Actions and the actionlint container use immutable commit or image
digests. Workflow tokens default to read-only and cannot approve pull requests.

Dependabot alerts and security updates are enabled in repository settings.
Dependabot checks GitHub Actions every Monday at 09:00 Toronto time, groups version
updates, and uses the Conventional Commit prefix `ci`.

The Electron/React foundation uses npm with a committed lockfile. Dependabot checks
npm packages weekly and groups related Forge, React, and Tailwind updates.
The `Functional checks` jobs clean-install, run strict TypeScript, zero-warning
ESLint, architecture and formatting checks, and package the app on Windows and
macOS. Shared functional service tests run once, on Windows. CI has no automated
GUI launch or native E2E suite; packaging does not qualify OS capture, permissions,
input delivery or activation. Packaged applications require the native manual
release checks on both supported OSes in [the test policy](../docs/testing.md).
Require new CI checks in branch protection only after verifying they run
successfully.

## CodeQL availability

This repository is public, so the advanced CodeQL workflow runs for pushes and
pull requests to `main`, manual dispatches, and weekly scans. It analyzes GitHub
Actions and JavaScript/TypeScript with `build-mode: none`. Both language checks
[passed on main at `bbc783b`](https://github.com/zeyadomran/promptly/actions/runs/37031226530).

The workflow retains an eligibility gate for private repositories: setting the
Actions variable `CODEQL_ENABLED` to `true` enables analysis only after eligible
GitHub Code Security access is available. The variable does not grant a license;
see [GitHub's eligibility documentation](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/private-repository-enablement).
Use this advanced workflow rather than also enabling CodeQL default setup.
