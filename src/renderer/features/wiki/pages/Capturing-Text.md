# Capturing Text

1. Select the text you want to save in a supported application.
2. Keep that application in the foreground and use your configured **Save selection** shortcut.
3. Look for the saved or duplicate confirmation, then open Promptly to find the snippet.

The default capture shortcut is two completed `Shift` taps. Change it under [Settings → Shortcuts](promptly:settings/shortcuts).
Two taps mean press and release twice; holding the key or combining it with typing does not
count as a completed double tap.

Under **When saving**, **Show confirmation toast** controls saved feedback.
**Trim whitespace and terminal prompts** controls normalization before saving. Turn normalization
off when you need captured whitespace preserved. Repeating an exact existing capture reports
the existing snippet rather than creating another copy.

## Capture limits

> Capture uses native Windows UI Automation. It never simulates `Ctrl+C` and never reads or writes
> the clipboard. Explicit snippet Copy actions do write the clipboard. Clipboard capture fallback
> is deferred.

Unsupported, empty, protected, denied, failed, and timed-out selections save nothing. A source
application can show selected text without exposing it through an accessible selection provider.
Capture support in **Codex desktop** and **Claude running in a terminal** remains unqualified;
do not assume support from the app's appearance or from the onboarding practice prompt.
Elevated applications and secure desktop behavior also remain unqualified.

The tray menu's **Pause capture** temporarily stops capture; choose **Resume capture** to resume.
It does not disable library search or explicit copy commands.

See [Troubleshooting](https://github.com/zeyadomran/promptly/wiki/Troubleshooting) for unavailable
shortcuts, unsupported selections, and safe bug-report details.
