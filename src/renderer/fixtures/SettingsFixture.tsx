import { useState } from 'react';

import { SettingsField } from '../components/shared/SettingsField';
import { ShortcutKey } from '../components/shared/ShortcutKey';
import { FieldGroup } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';

export function SettingsFixture() {
  const [timing, setTiming] = useState([300]);

  return (
    <section
      aria-label="Settings component fixture"
      className="max-w-[760px] rounded-lg border bg-background px-8 py-6"
    >
      <h2 className="text-page font-semibold tracking-[-0.015em]">Shortcuts</h2>
      <p className="mt-1 text-body text-muted-foreground">
        Local component states for the settings foundation.
      </p>
      <FieldGroup className="mt-6 gap-0">
        <SettingsField label="Save selection" description="Saves the highlighted text">
          <Input defaultValue="Shift, Shift" />
        </SettingsField>
        <SettingsField label="Open Promptly" description="Shows the compact window from anywhere">
          <Input placeholder="Press a key…" />
        </SettingsField>
        <SettingsField label="Double-tap window" description="Max time between taps">
          <Slider min={150} max={600} step={10} value={timing} onValueChange={setTiming} />
        </SettingsField>
        <p className="py-2 font-mono text-meta text-muted-foreground">
          {timing[0]}ms · <ShortcutKey label="Shift">⇧</ShortcutKey>{' '}
          <ShortcutKey label="Shift">⇧</ShortcutKey>
        </p>
        <SettingsField label="Show confirmation toast" inline>
          <Switch defaultChecked />
        </SettingsField>
        <SettingsField label="Trim whitespace and terminal prompts" inline>
          <Switch defaultChecked />
        </SettingsField>
        <SettingsField
          label="Disabled control"
          description="Preferences are supplied by the desktop layer."
          disabled
        >
          <Input defaultValue="Unavailable" />
        </SettingsField>
      </FieldGroup>
    </section>
  );
}
