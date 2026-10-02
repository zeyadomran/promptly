import type { ReactNode } from 'react';

import { TabsContent } from '../../../components/ui/tabs';

export function SettingsSection({
  value,
  title,
  description,
  children
}: {
  value: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <TabsContent value={value} className="settings-section">
      <div className="settings-section-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </TabsContent>
  );
}
