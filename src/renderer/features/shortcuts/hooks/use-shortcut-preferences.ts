import { useRef, useState } from 'react';

import { type SettingsPatch, settingsSchema } from '../../../../shared/contracts/settings';
import { shortcutChangeConflict, shortcutConflict } from '../../../../shared/shortcuts/conflicts';
import { planShortcutEdit, type ShortcutTarget } from '../../../../shared/shortcuts/shortcut-edit';
import { usePreferences } from '../../settings/settings-context';

export function useShortcutPreferences() {
  const preferences = usePreferences();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const apply = async (patch: SettingsPatch) => {
    if (busy.current) throw new Error('Wait for the current shortcut change to finish.');
    busy.current = true;
    setPending(true);
    setError(undefined);
    try {
      const candidate = settingsSchema.safeParse({ ...preferences.settings, ...patch });

      if (!candidate.success)
        throw new Error(candidate.error.issues[0]?.message ?? 'Use a valid key or combination.');
      const conflict = shortcutChangeConflict(
        preferences.settings,
        candidate.data,
        window.promptly.platform
      );

      if (conflict !== undefined) throw new Error(conflict);
      const result = await preferences.update(patch);

      if (!result.ok) throw new Error(result.error.message);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to change this shortcut.';

      setError(message);
      throw new Error(message, { cause: caught });
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  return {
    ...preferences,
    pending,
    error: error ?? shortcutConflict(preferences.settings, window.promptly.platform),
    apply,
    inspect: (target: ShortcutTarget, binding: string | null) =>
      planShortcutEdit(preferences.settings, target, binding),
    bind: async (target: ShortcutTarget, binding: string | null) => {
      const edit = planShortcutEdit(preferences.settings, target, binding);

      if (edit.kind !== 'ready') {
        const message =
          edit.kind === 'invalid' ? edit.message : 'Already used by ' + edit.collision.label;

        setError(message);
        throw new Error(message);
      }

      await apply(edit.patch);
    },
    swap: async (target: ShortcutTarget, binding: string, other: ShortcutTarget) => {
      const edit = planShortcutEdit(preferences.settings, target, binding);

      if (
        edit.kind !== 'conflict' ||
        edit.collision.action !== other ||
        edit.swapPatch === undefined
      )
        throw new Error('The bindings changed or cannot be exchanged. Record another shortcut.');
      await apply(edit.swapPatch);
    }
  };
}
