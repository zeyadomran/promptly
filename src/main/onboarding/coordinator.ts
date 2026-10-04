import type {
  OnboardingDestination,
  OnboardingState,
  OnboardingStep
} from '../../shared/contracts/onboarding';
import { type DesktopResult, failure } from '../../shared/contracts/result';
import type { CaptureEvent } from '../capture/ports';
import type { SettingsService } from '../settings/service';
import { capturedOnboardingState, initialOnboardingState } from './capture-state';
import type { OnboardingEffects, OnboardingOwner } from './ports';

interface Session {
  owner: OnboardingOwner;
  stop: () => void;
  state: OnboardingState;
  armedAt: number;
}

export class OnboardingCoordinator {
  private session: Session | undefined;
  private closed = false;
  private finishing: Promise<DesktopResult<OnboardingState>> | undefined;

  constructor(
    private readonly settings: SettingsService,
    private readonly effects: OnboardingEffects
  ) {}

  observeCapture(event: CaptureEvent): void {
    const session = this.session;

    if (
      session === undefined ||
      !this.current(session) ||
      session.state.step !== 'capture' ||
      event.triggeredAt < session.armedAt ||
      event.sourceWindowHandle !== session.owner.windowHandle
    )
      return;
    session.state = capturedOnboardingState(session.state, event);
    this.notify(session);
  }

  state(owner: OnboardingOwner): DesktopResult<OnboardingState> {
    const session = this.owned(owner);

    return session === undefined
      ? failure('UNAUTHORIZED', 'The tutorial window is unavailable.')
      : { ok: true, value: { ...session.state } };
  }

  step(owner: OnboardingOwner, step: OnboardingStep): DesktopResult<OnboardingState> {
    const session = this.owned(owner);

    if (session === undefined)
      return failure('UNAUTHORIZED', 'The tutorial window is unavailable.');
    if (this.finishing !== undefined)
      return failure('UNAVAILABLE', 'Wait for onboarding to finish.');
    if (step === 'detected' && session.state.test.status !== 'detected')
      return failure('CONFLICT', 'Test your shortcut before continuing.');
    this.effects.stopTest(session.owner.id);
    session.armedAt = this.effects.now();
    session.state = {
      ...session.state,
      step,
      error: null,
      test: { status: 'inactive' },
      ...(step === 'capture' ? { saved: false, preview: null } : {})
    };
    if (step === 'shortcut') this.startTest(session);

    this.notify(session);
    return { ok: true, value: { ...session.state } };
  }

  finish(
    owner: OnboardingOwner,
    skip: boolean,
    destination: OnboardingDestination = 'library'
  ): Promise<DesktopResult<OnboardingState>> {
    const session = this.owned(owner);

    if (session === undefined)
      return Promise.resolve(failure('UNAUTHORIZED', 'The tutorial window is unavailable.'));
    if (this.finishing !== undefined)
      return Promise.resolve(failure('UNAVAILABLE', 'Wait for onboarding to finish.'));
    if (!skip && !session.state.saved)
      return Promise.resolve(
        failure('CONFLICT', 'Capture selected text successfully, or choose Skip.')
      );
    session.armedAt = Infinity;
    const finishing = this.complete(session, destination)
      .then((result) => {
        if (!result.ok && this.current(session) && !session.state.completed) {
          this.finishing = undefined;
          if (session.state.step === 'shortcut') this.startTest(session);
        }

        return result;
      })
      .finally(() => {
        this.finishing = undefined;
      });

    this.finishing = finishing;
    return finishing;
  }

  async close(): Promise<void> {
    this.closed = true;
    this.retire();
    await this.finishing;
  }

  private async complete(
    session: Session,
    destination: OnboardingDestination
  ): Promise<DesktopResult<OnboardingState>> {
    const result = await this.settings.services.updateSettings({
      onboardingComplete: true
    });

    if (!result.ok) {
      if (this.current(session)) session.armedAt = this.effects.now();
      return result;
    }

    if (!this.current(session))
      return failure('UNAVAILABLE', 'The tutorial window closed. Completion was saved.');
    session.state = { ...session.state, completed: true };
    this.notify(session);
    try {
      await this.effects.complete(session.owner.id, destination);
      this.effects.stopTest(session.owner.id);
      return { ok: true, value: { ...session.state } };
    } catch {
      return failure('UNAVAILABLE', 'Setup was saved. Reopen Promptly to continue.');
    }
  }

  private startTest(session: Session): void {
    this.effects.startTest(session.owner.id, (test) => {
      if (
        this.finishing !== undefined ||
        !this.current(session) ||
        !['shortcut', 'detected'].includes(session.state.step)
      )
        return;
      session.state = {
        ...session.state,
        test,
        ...(test.status === 'detected' ? { step: 'detected' } : {})
      };
      this.notify(session);
    });
  }

  private current(session: Session): boolean {
    return !this.closed && this.session === session && session.owner.alive();
  }

  private owned(owner: OnboardingOwner): Session | undefined {
    if (this.closed || !owner.alive()) return undefined;
    if (
      this.session?.owner.id === owner.id &&
      this.session.owner.windowHandle === owner.windowHandle
    )
      return this.session;
    this.retire();
    const session: Session = {
      owner,
      stop: () => undefined,
      armedAt: Infinity,
      state: initialOnboardingState(this.settings.current.settings.onboardingComplete)
    };

    this.session = session;
    session.stop = owner.onClose(() => {
      if (this.session === session) this.retire();
    });
    return session;
  }

  private retire(): void {
    if (this.session !== undefined) this.effects.stopTest(this.session.owner.id);
    this.session?.stop();
    this.session = undefined;
  }

  private notify(session: Session): void {
    if (!this.current(session)) return;
    try {
      session.state = { ...session.state, version: session.state.version + 1 };
      session.owner.publish({ ...session.state });
    } catch {
      this.retire();
    }
  }
}
