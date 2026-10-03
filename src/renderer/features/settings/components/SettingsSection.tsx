import type { ReactNode } from 'react';

import type { SettingsSectionId } from '../../window-chrome/shell-navigation';

export function SettingsSection({
  value,
  title,
  description,
  children
}: {
  value: SettingsSectionId;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={`settings-${value}`}
      data-settings-section={value}
      className="settings-section"
      aria-labelledby={`settings-${value}-heading`}
    >
      <div className="settings-section-heading">
        <h1 id={`settings-${value}-heading`} tabIndex={-1}>
          {title}
        </h1>
        <p>{description}</p>
      </div>
      <div className="settings-card">{children}</div>
    </section>
  );
}
