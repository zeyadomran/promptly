import { useState } from 'react';

import { TagDot } from '../components/shared/TagDot';
import { Toaster } from '../components/ui/sonner';
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group';
import { TooltipProvider } from '../components/ui/tooltip';
import { useTheme } from '../hooks/use-theme';
import { tagColors } from '../lib/tag-palette';
import type { ThemePreference } from '../lib/theme';
import { CompactFixture } from './CompactFixture';
import { OverlayFixture } from './OverlayFixture';
import { SettingsFixture } from './SettingsFixture';

export function DesignFixture() {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const theme = useTheme(preference);

  return (
    <TooltipProvider delayDuration={200}>
      <main className="flex min-h-screen flex-col gap-6 bg-sidebar p-6">
        <h1 className="text-page font-semibold">Design foundation fixtures</h1>
        <ToggleGroup
          type="single"
          aria-label="Theme preference"
          value={preference}
          onValueChange={(value) => {
            if (value === 'light' || value === 'dark' || value === 'system') setPreference(value);
          }}
        >
          <ToggleGroupItem value="light">Light</ToggleGroupItem>
          <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
          <ToggleGroupItem value="system">System</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex flex-wrap gap-3">
          {tagColors.map((color) => (
            <span key={color} className="inline-flex items-center gap-1.5 text-meta">
              <TagDot color={color} />
              {color}
            </span>
          ))}
        </div>
        <CompactFixture />
        <SettingsFixture />
        <OverlayFixture />
        <Toaster theme={theme} />
      </main>
    </TooltipProvider>
  );
}
