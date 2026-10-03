import type { Settings } from '../../../shared/contracts/settings';
import { ShortcutKey } from '../../components/shared/ShortcutKey';

export function OnboardingThemeTile({
  theme,
  index,
  selected,
  disabled,
  onChoose
}: {
  theme: Settings['theme'];
  index: number;
  selected: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  return (
    <button
      type="button"
      className="onboarding-theme-tile"
      data-theme={theme}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onChoose}
    >
      <span className="onboarding-theme-preview" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="onboarding-theme-name">
        <ShortcutKey>{index}</ShortcutKey>
        {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}
      </span>
    </button>
  );
}
