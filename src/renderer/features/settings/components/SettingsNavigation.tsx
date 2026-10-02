import { TabsList, TabsTrigger } from '../../../components/ui/tabs';

export const settingsSections = ['General', 'Shortcuts', 'Appearance', 'Tags', 'Storage'] as const;

export function SettingsNavigation() {
  return (
    <nav className="settings-navigation" aria-label="Settings sections">
      <TabsList aria-label="Settings sections">
        {settingsSections.map((label) => (
          <TabsTrigger key={label} value={label.toLowerCase()}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </nav>
  );
}
