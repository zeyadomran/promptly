import { SegmentedControl } from '../../../components/shared/SegmentedControl';
import { ToggleGroupItem } from '../../../components/ui/toggle-group';
import { type SettingsSectionId, settingsSectionIds } from '../../window-chrome/shell-navigation';

export function SettingsNavigation({
  active,
  navigate
}: {
  active: SettingsSectionId;
  navigate: (section: SettingsSectionId) => void;
}) {
  return (
    <nav className="settings-navigation" aria-label="Settings sections">
      <SegmentedControl
        value={active}
        aria-label="Settings sections"
        onValueChange={(value) => {
          const section = settingsSectionIds.find((candidate) => candidate === value);

          if (section !== undefined) navigate(section);
        }}
      >
        {settingsSectionIds.map((section) => (
          <ToggleGroupItem
            key={section}
            value={section}
            aria-current={active === section ? 'location' : undefined}
            aria-controls={`settings-${section}`}
            onClick={() => {
              if (active === section) navigate(section);
            }}
          >
            {section[0]?.toUpperCase()}
            {section.slice(1)}
          </ToggleGroupItem>
        ))}
      </SegmentedControl>
    </nav>
  );
}
