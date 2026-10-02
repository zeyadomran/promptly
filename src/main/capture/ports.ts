import type { CaptureResult } from '../../shared/contracts/domain';
import type { DesktopResult } from '../../shared/contracts/result';
import type { WindowsIdentity, WindowsSelection } from '../platform/windows/windows-selection';

export type CaptureIdentity = WindowsIdentity;
export type CaptureNative = Pick<
  WindowsSelection,
  'foregroundIdentityResult' | 'captureSelection' | 'activateSource'
>;

export interface CaptureEvent {
  status: CaptureResult['status'] | 'failed';
  id?: string;
  revision?: number;
  reason?: string;
  /** Main-only committed content for toast consumers. Never log or publish as a change event. */
  preview?: Readonly<{
    id: string;
    text: string;
    sourceApp: string | null;
    sourceAppId: string | null;
  }>;
  triggeredAt: number;
  selectedAt?: number;
  persistedAt?: number;
  completedAt: number;
}

export interface CaptureEffects {
  native: CaptureNative | undefined;
  admit: () => (() => boolean) | undefined;
  normalize: () => boolean;
  now?: () => number;
  remember?: (id: string, identity: CaptureIdentity) => void;
}

export type CaptureReply = DesktopResult<CaptureResult>;
