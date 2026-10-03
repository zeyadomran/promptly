import type { OnboardingState } from '../../shared/contracts/onboarding';
import { CaptureService } from '../capture/service';
import type { Shortcuts } from '../shortcuts/service';
import type { StorageClient } from '../storage/client';
import { LibraryMutations } from '../storage/library-mutations';
import type { OnboardingOwner } from './ports';

export function onboardingOwnerFixture() {
  let alive = true;
  let retired: () => void = () => undefined;
  const states: OnboardingState[] = [];
  const owner: OnboardingOwner = {
    id: 1,
    windowHandle: '0000000000000123',
    alive: () => alive,
    onClose: (listener) => {
      retired = listener;
      return () => {
        retired = () => undefined;
      };
    },
    publish: (state) => {
      states.push(state);
    }
  };

  return {
    owner,
    states,
    close: () => {
      alive = false;
      retired();
    },
    revive: () => {
      alive = true;
    }
  };
}

export function onboardingCaptureFixture(
  storage: Pick<StorageClient, 'call'>,
  shortcuts: Shortcuts,
  windowHandle: string,
  selection: { supported: boolean; pending: Promise<void> }
) {
  const identity = {
    token: 'a'.repeat(32),
    source: { pid: 1, name: 'Promptly', id: 'Promptly.exe' },
    windowHandle
  };

  return new CaptureService(storage, new LibraryMutations(), {
    normalize: () => false,
    admit: () => shortcuts.captureAdmission(),
    now: () => 2,
    native: {
      sourceAvailable: () => Promise.resolve(true),
      foregroundIdentityResult: () => Promise.resolve({ status: 'ok', identity }),
      captureSelection: async () => {
        await selection.pending;
        if (!selection.supported) return { v: 1, id: 'owned', status: 'unsupported' };
        return {
          v: 1,
          id: 'owned',
          status: 'ok',
          identity: identity.token,
          source: identity.source,
          text: 'A real practice selection',
          characterCount: 25,
          elapsedMs: 1,
          targetIntegrityLevel: 8192
        };
      },
      activateSource: () => Promise.resolve('ok')
    }
  });
}
