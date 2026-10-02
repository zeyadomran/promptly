import { sessionDeadline } from './session-deadline';

/** Both attempts settle; child rejection/timeout must never bypass launcher retirement. */
export async function retireSession(
  child: () => Promise<object>,
  launcher: () => Promise<object>,
  observe: (stage: 'child' | 'launcher', status: 'verified' | 'failed') => void
) {
  const errors: unknown[] = [];
  let childResult: object | undefined;
  let launcherResult: object | undefined;

  try {
    childResult = await sessionDeadline(Promise.resolve().then(child));
    observe('child', 'verified');
  } catch (error) {
    errors.push(error);
    observe('child', 'failed');
  }

  try {
    launcherResult = await launcher();
    observe('launcher', 'verified');
  } catch (error) {
    errors.push(error);
    observe('launcher', 'failed');
  }

  if (errors.length)
    throw new AggregateError(errors, 'Owned session retirement failed', { cause: errors[0] });
  return { child: childResult, launcher: launcherResult };
}
