import { spawn } from 'node:child_process';
import path from 'node:path';

import type {
  NativeBounds,
  NativeCaptureReply,
  NativeSource
} from '../../../shared/contracts/native-selection';
import {
  nativeActivationSchema,
  nativeCaptureSchema,
  nativeForegroundSchema,
  nativeReadySchema
} from '../../../shared/contracts/native-selection';
import type { NativeProcessOptions, TransportFailure } from '../native/native-process';
import { NativeProcess, NativeTransportError } from '../native/native-process';
import { ActivationAdmissionError, admitActivation } from './activation-admission';
import { createForegroundGrant } from './foreground-grant';
import { readActivationTarget } from './read-activation-target';
import { SourceCapabilities } from './source-capabilities';

export interface WindowsIdentity {
  readonly token: string;
  readonly source: NativeSource | null;
  readonly bounds?: Readonly<NativeBounds> | null;
  readonly windowHandle?: string;
}
export type WindowsCaptureResult = NativeCaptureReply | { status: TransportFailure };
export type WindowsForegroundResult =
  | { status: 'ok'; identity: WindowsIdentity }
  | {
      status:
        Exclude<ReturnType<typeof nativeForegroundSchema.parse>['status'], 'ok'> | TransportFailure;
      ownForeground?: true;
    };
export interface WindowsSelectionOptions {
  resourcesPath: string;
  packaged: boolean;
  applicationPath: string;
}
export interface WindowsSelectionEffects extends NativeProcessOptions {
  allowForeground?: (pid: number) => boolean;
  ownPid?: number;
}

/** Paths originate in Electron main only. No renderer channel exposes this adapter. */
export function windowsHelperPath(options: WindowsSelectionOptions): string {
  return options.packaged
    ? path.join(options.resourcesPath, 'promptly-windows.exe')
    : path.join(options.applicationPath, 'native', 'windows', 'out', 'promptly-windows.exe');
}

export class WindowsSelection {
  private readonly transport: NativeProcess;
  private readiness: Promise<ReturnType<typeof nativeReadySchema.parse>> | undefined;
  private readonly identities: SourceCapabilities;

  constructor(private readonly options: WindowsSelectionEffects) {
    this.transport = new NativeProcess(options);
    this.identities = new SourceCapabilities(this.transport);
  }

  ready(): Promise<ReturnType<typeof nativeReadySchema.parse>> {
    if (!this.transport.running) this.readiness = undefined;
    this.readiness ??= this.transport
      .request(
        'capabilities',
        this.options.ownPid === undefined ? {} : { excludePid: this.options.ownPid },
        (value) => {
          const result = nativeReadySchema.parse(value);

          if (!result.warmupReady) throw new NativeTransportError('helperUnavailable');
          return result;
        },
        5000
      )
      .catch((error: unknown) => {
        this.readiness = undefined;
        throw error;
      });
    return this.readiness;
  }

  async foregroundIdentity(): Promise<WindowsIdentity | null> {
    const result = await this.foregroundIdentityResult();

    return result.status === 'ok' ? result.identity : null;
  }

  async foregroundIdentityResult(excludePid?: number): Promise<WindowsForegroundResult> {
    try {
      await this.ready();
      const result = await this.transport.request(
        'foreground',
        excludePid === undefined ? {} : { excludePid },
        (value) => nativeForegroundSchema.parse(value),
        100
      );

      if (result.status !== 'ok')
        return {
          status: result.status,
          ...(result.ownForeground === undefined ? {} : { ownForeground: result.ownForeground })
        };
      const identity = Object.freeze({
        token: result.identity,
        source: result.source,
        ...(result.windowHandle === undefined ? {} : { windowHandle: result.windowHandle }),
        ...(result.bounds === undefined
          ? {}
          : { bounds: result.bounds === null ? null : Object.freeze(result.bounds) })
      });

      this.identities.remember(identity);
      return { status: 'ok', identity };
    } catch (error) {
      this.readiness = undefined;
      return { status: error instanceof NativeTransportError ? error.status : 'helperUnavailable' };
    }
  }

  async captureSelection(identity: WindowsIdentity): Promise<WindowsCaptureResult> {
    if (!this.identities.known(identity)) return { status: 'foregroundChanged', v: 1, id: 'local' };
    try {
      await this.ready();
      return await this.transport.request(
        'capture',
        { identity: identity.token, includeText: true },
        (value) => nativeCaptureSchema.parse(value),
        100
      );
    } catch (error) {
      this.readiness = undefined;
      return { status: error instanceof NativeTransportError ? error.status : 'helperUnavailable' };
    }
  }

  activationTargetIdentity(excludePid: number): Promise<WindowsForegroundResult> {
    return readActivationTarget(this.ready(), this.transport, this.identities, excludePid);
  }

  async activateSource(
    identity: WindowsIdentity
  ): Promise<ReturnType<typeof nativeActivationSchema.parse>['status'] | TransportFailure> {
    if (!this.identities.known(identity)) return 'foregroundChanged';
    try {
      await this.ready();
      if (!this.identities.known(identity)) return 'foregroundChanged';
      const result = await this.transport.request(
        'activate',
        { identity: identity.token },
        (value) => nativeActivationSchema.parse(value),
        100,
        admitActivation(
          this.identities,
          identity,
          this.transport.generation,
          this.options.allowForeground
        )
      );

      return result.status;
    } catch (error) {
      if (error instanceof ActivationAdmissionError) return error.status;
      this.readiness = undefined;
      return error instanceof NativeTransportError ? error.status : 'helperUnavailable';
    }
  }

  dispose(): Promise<void> {
    return this.transport.dispose();
  }

  sourceAvailable(identity: WindowsIdentity): Promise<boolean> {
    return this.identities.available(identity);
  }
}

export function createWindowsSelection(options: WindowsSelectionOptions): WindowsSelection {
  const executable = windowsHelperPath(options);

  return new WindowsSelection({
    ownPid: process.pid,
    allowForeground: createForegroundGrant(),
    launch: () => spawn(executable, [], { windowsHide: true, stdio: 'pipe' })
  });
}
