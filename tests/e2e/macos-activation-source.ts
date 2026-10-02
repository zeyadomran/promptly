import { macosFixture } from './macos-fixture';
import { OwnedFixtureSetupError } from './macos-fixture-failure';

export interface CooperativeSourceSetup {
  coordinatorForeground: boolean;
  cooperativeYielded: boolean;
}

/** A verified owned foreground coordinator yields before the direct target activates. */
export async function launchActivationSource(
  mode: 'launchServices' | 'direct',
  observe: (state: CooperativeSourceSetup) => void
) {
  if (mode === 'launchServices') return macosFixture('selected');
  const coordinator = await macosFixture('empty');
  let source: Awaited<ReturnType<typeof macosFixture>> | undefined;

  try {
    const foreground = (await coordinator.isForeground(coordinator.fixturePid)).matched;

    observe({ coordinatorForeground: foreground, cooperativeYielded: false });
    if (!foreground) throw new Error('Owned coordinator is not foreground');
    source = await macosFixture('selected', 'direct', coordinator);
    observe({ coordinatorForeground: true, cooperativeYielded: true });
    await coordinator.close();
    return source;
  } catch (error) {
    throw new OwnedFixtureSetupError(
      error,
      await Promise.allSettled([coordinator.close(), ...(source ? [source.close()] : [])])
    );
  }
}
