import type { CaptureResult } from '../../shared/contracts/domain';
import type { DesktopResult } from '../../shared/contracts/result';
import type { WindowsIdentity, WindowsSelection } from '../platform/windows/windows-selection';

export type CaptureIdentity = WindowsIdentity;
export type CaptureNative = Pick<
  WindowsSelection,
  'foregroundIdentityResult' | 'captureSelection' | 'activateSource' | 'sourceAvailable'
>;

export interface CaptureEvent {
  status: CaptureResult['status'] | 'failed';
  id?: string;
  revision?: number;
  reason?: string;
  message?: string;
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
  /** Physical DWM source frame, main-only; never sent to a desktop renderer. */
  sourceBounds?: Readonly<{ x: number; y: number; width: number; height: number }>;
  /** Main-only exact source window correlation for the tutorial; never transported to renderers. */
  sourceWindowHandle?: string;
}

export type CapturePhases = Pick<
  CaptureEvent,
  'triggeredAt' | 'selectedAt' | 'persistedAt' | 'sourceBounds' | 'sourceWindowHandle'
>;

export interface CaptureEffects {
  native: CaptureNative | undefined;
  admit: () => (() => boolean) | undefined;
  normalize: () => boolean;
  now?: () => number;
  remember?: (id: string, identity: CaptureIdentity) => void;
}

export type CaptureReply = DesktopResult<CaptureResult>;
