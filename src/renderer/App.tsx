import { FoundationScreen } from './features/library';
import { SettingsProvider } from './features/settings/SettingsProvider';
import { DesignFixture } from './fixtures/DesignFixture';

export function App() {
  if (
    (import.meta.env.DEV || import.meta.env.PROMPTLY_DESIGN_FIXTURE === '1') &&
    window.location.hash === '#design'
  )
    return <DesignFixture />;

  return (
    <SettingsProvider>
      <FoundationScreen platform={window.promptly.platform} />
    </SettingsProvider>
  );
}
