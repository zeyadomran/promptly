import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../../components/ui/button';

export function SettingsTitleBar() {
  const [error, setError] = useState<string>();

  return (
    <>
      <header className="settings-titlebar" data-platform={window.promptly.platform}>
        <Button
          variant="ghost"
          size="sm"
          className="settings-back"
          aria-label="Back to Promptly"
          onClick={() => {
            void window.promptly.returnToMainWindow({}).then((result) => {
              if (!result.ok) setError(result.error.message);
            });
          }}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Settings</span>
        </Button>
        <span className="settings-window-title">Settings</span>
      </header>
      {error !== undefined && (
        <p role="alert" className="settings-row-error px-4">
          {error}
        </p>
      )}
    </>
  );
}
