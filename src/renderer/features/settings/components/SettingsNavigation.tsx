import { Button } from '../../../components/ui/button';
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
      {settingsSectionIds.map((section) => (
        <Button
          key={section}
          variant="ghost"
          aria-current={active === section ? 'location' : undefined}
          onClick={() => {
            navigate(section);
          }}
        >
          {section[0]?.toUpperCase()}
          {section.slice(1)}
        </Button>
      ))}
    </nav>
  );
}
