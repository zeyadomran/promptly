import { type SettingsSnapshot, settingsSnapshotSchema } from './contracts/settings';

export const settingsArgumentPrefix = '--promptly-settings=';
export const liveSettingsArgument = '--promptly-live-settings';
export const settingsBootstrapChannel = 'promptly:settings-bootstrap';

export function settingsFromArguments(args: readonly string[]): SettingsSnapshot | undefined {
  const argument = args.find((value) => value.startsWith(settingsArgumentPrefix));

  if (argument === undefined) return undefined;
  try {
    return settingsSnapshotSchema.parse(
      JSON.parse(decodeURIComponent(argument.slice(settingsArgumentPrefix.length)))
    );
  } catch {
    throw new Error('Invalid initial preferences.');
  }
}
