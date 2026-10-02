import { useState } from 'react';

import { SettingsField } from '../../components/shared/SettingsField';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';
import { usePreferences } from '../settings/settings-context';

/** P20 extends the responsive shell; only working window preferences are presented here. */
export function WindowSettings() {
  const [section, setSection] = useState('appearance');
  const { settings, update } = usePreferences();

  return (
    <main className="window-settings">
      <nav aria-label="Settings sections">
        {['general', 'appearance'].map((item) => (
          <Button
            key={item}
            variant={section === item ? 'secondary' : 'ghost'}
            aria-current={section === item ? 'page' : undefined}
            onClick={() => {
              setSection(item);
            }}
          >
            {item === 'general' ? 'General' : 'Appearance'}
          </Button>
        ))}
      </nav>
      <section className="window-settings-content">
        <h1 className="text-lg font-semibold">
          {section === 'general' ? 'General' : 'Appearance'}
        </h1>
        {section === 'general' ? (
          <SettingsField label="Default size" description="The size used when Promptly starts.">
            <ToggleGroup
              type="single"
              value={settings.defaultSizeMode}
              onValueChange={(value) => {
                if (value === 'compact' || value === 'regular')
                  void update({ defaultSizeMode: value });
              }}
            >
              <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
              <ToggleGroupItem value="regular">Regular</ToggleGroupItem>
            </ToggleGroup>
          </SettingsField>
        ) : (
          <>
            <SettingsField label="Theme" description="Choose how Promptly looks.">
              <ToggleGroup
                type="single"
                value={settings.theme}
                onValueChange={(value) => {
                  if (value === 'light' || value === 'dark' || value === 'system')
                    void update({ theme: value });
                }}
              >
                {(['light', 'dark', 'system'] as const).map((value) => (
                  <ToggleGroupItem key={value} value={value}>
                    {value}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </SettingsField>
            <SettingsField
              label="Always on top"
              description="Keep Promptly above other windows."
              inline
            >
              <Switch
                aria-label="Always on top"
                checked={settings.alwaysOnTop}
                onCheckedChange={(checked) => {
                  void update({ alwaysOnTop: checked });
                }}
              />
            </SettingsField>
          </>
        )}
      </section>
    </main>
  );
}
