import type { ComponentProps } from 'react';

import { SettingsField } from '../../../components/shared/SettingsField';

export function SettingsRow(props: ComponentProps<typeof SettingsField>) {
  return <SettingsField {...props} />;
}
