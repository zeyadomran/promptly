# Repository maintenance

## Main branch

Changes enter `main` through pull requests, including administrator changes.
No approving review is required, matching the solo-maintainer setup in
`bob-kanban` and `carbon-react-mcp`. Stale approvals are dismissed, conversations
must be resolved, and `Workflow validation` must pass against an up-to-date branch.
Force pushes and branch deletion are blocked.

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

This repository does not yet contain application code or package manifests.
Add the relevant Dependabot ecosystems, application CI checks, and CodeQL languages
when the application stack is introduced. Require new CI checks in branch
protection only after verifying they run successfully.

## CodeQL availability

The CodeQL workflow is prepared for push, pull request, manual, and weekly runs.
It currently targets GitHub Actions.

**CodeQL analysis is currently skipped.** GitHub rejected default setup with HTTP
403 for this personal private repository. Private CodeQL scanning requires an
eligible organization with GitHub Code Security access; see
[GitHub's eligibility documentation](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/private-repository-enablement).

The workflow activates automatically if the repository becomes public. If the
repository instead gains eligible GitHub Code Security access, set the repository
Actions variable `CODEQL_ENABLED` to `true`. That variable enables the workflow;
it does not grant a license. Use this advanced workflow rather than also enabling
CodeQL default setup. After an actual scan passes, consider requiring its check
in branch protection.
