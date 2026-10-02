import { describe, expect, it } from 'vitest';

import { defaultSettings } from './contracts/settings';
import { settingsArgumentPrefix, settingsFromArguments } from './settings-bootstrap';

describe('validated synchronous bootstrap', () => {
  it('round trips a persisted snapshot and rejects malformed or privileged payloads', () => {
    const snapshot = { revision: 19, settings: { ...defaultSettings(), theme: 'dark' } };

    expect(
      settingsFromArguments([
        `${settingsArgumentPrefix}${encodeURIComponent(JSON.stringify(snapshot))}`
      ])
    ).toEqual(snapshot);
    expect(settingsFromArguments([])).toBeUndefined();
    for (const value of ['%', '{}', JSON.stringify({ ...snapshot, shell: 'execute' })])
      expect(() => settingsFromArguments([`${settingsArgumentPrefix}${value}`])).toThrow(
        'Invalid initial preferences'
      );
  });
});
