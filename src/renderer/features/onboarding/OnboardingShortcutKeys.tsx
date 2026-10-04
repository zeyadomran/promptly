import type { Settings } from '../../../shared/contracts/settings';
import type { ShortcutTestState } from '../../../shared/contracts/shortcut-test';
import { ShortcutKeycaps } from '../shortcuts/components/ShortcutKeycaps';

const symbols = { shift: '⇧', control: 'Ctrl', alt: 'Alt', meta: 'Win' };

export function OnboardingShortcutKeys({
  shortcut,
  test
}: {
  shortcut: Settings['saveShortcut'];
  test: ShortcutTestState;
}) {
  if (shortcut.kind === 'combination')
    return (
      <div className="onboarding-shortcut-keys">
        <ShortcutKeycaps accelerator={shortcut.accelerator} platform={window.promptly.platform} />
      </div>
    );
  return (
    <div className="onboarding-shortcut-keys" aria-label={`Double-tap ${shortcut.modifier}`}>
      <span
        className="onboarding-tap-key"
        data-filled={test.status === 'tap' || test.status === 'detected'}
        aria-hidden="true"
      >
        {symbols[shortcut.modifier]}
      </span>
      <span
        className="onboarding-tap-key"
        data-filled={test.status === 'detected'}
        aria-hidden="true"
      >
        {symbols[shortcut.modifier]}
      </span>
    </div>
  );
}
