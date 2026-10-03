# Issue 101: selection resolution and source capability accuracy

Development baseline: `6817fa0d98e60c64e7c9cf510c65f5377ec4b1a1`.
Integrated main before final validation: `2cde579651956794528426521ff7a31e37e5b93f`.

## Reproduced service behavior

`npx vitest run src/main/capture/service.test.ts` failed because source availability
remained true after 32 additional foreground identities evicted the native token.
The canonical flow uses real WindowsSelection/CaptureSources and an owned external
Node provider. It now verifies token eviction, helper death/replacement and copied
identity rejection. Availability never launches a helper; busy/temporary validation
failure is unavailable without inventing authority.

`npx vitest run src/main/capture-toast/service.test.ts` failed because actionable
failed capture produced no visible confirmation. The canonical flow now verifies
bounded failure feedback, cooldown, silent empty/cancellation and preference/close
retirement. The capture flow verifies that unsupported provider messages reach its
published event. These controlled service tests do not prove native UI delivery.

## Bounded owned Windows provider check

A throwaway WPF fixture under `out/issue-101-probe/` exposed a focused text child
without TextPattern inside its own TextPattern container. Its DocumentRange and
unrelated text APIs throw. Only this owned PID/window/selected fixture text was used;
no user's terminal, Codex app, profile or clipboard was inspected or modified.
The probe sources are retained as local qualification artifacts, outside the suite.

The baseline SelectionReader returned `unsupported`, and the assertion-bearing
baseline probe exited 1. The resolver returned exact `exact 雪🙂\r\nselection`.
The real production WindowsSelection transport then captured this owned external
WPF provider with `ok`, provider elapsed 26.3486 ms and the unchanged 100-ms request
deadline. This is one controlled positive check, not a latency qualification.

Additional bounded owned checks returned:

- Password ancestor: `secureInput`, without selected text.
- Minimized retained source: activation `ok`, `minimized:false` after restoration.
- Closed retained source window: `foregroundChanged` during capability validation.

One probe invocation returned `foregroundChanged` before reading selection. That
guarded foreground race is retained as an observation, not hidden as a passing
attempt. A later owned invocation verified the added closed-window check; all
owned probe processes exited. No broad app matrix or automated native GUI suite
was introduced.

## Remaining qualification

Codex desktop and Claude Code in PowerShell remain unqualified until the user
manually tests the packaged build. A source with no supported focused/ancestor
selection provider remains unsupported. Same-PID and exact foreground-window
ownership are still mandatory; unsupported multi-process trees are not granted a
cross-process exception. Microsoft Terminal implements TextPattern/GetSelection;
it is not claimed inherently unsupported.

No clipboard fallback, Copy injection, elevation, whole-document read, descendant
scan or increased capture deadline is introduced. Issue 89's physical hook
delivery and real affected-app behavior remain separate from these reproductions.

Primary contracts: [UIA parent navigation](https://learn.microsoft.com/en-us/dotnet/api/system.windows.automation.treewalker.getparent),
[embedded objects](https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/textpattern-and-embedded-objects-overview),
[asynchronous restore](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-showwindowasync).
