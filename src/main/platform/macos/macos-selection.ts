import { spawn } from 'node:child_process';
import path from 'node:path';

import type { MacosIdentity } from '../../../shared/contracts/macos-selection';
import {
  macosCaptureSchema,
  macosForegroundSchema,
  macosPermissionsSchema,
  macosReadySchema
} from '../../../shared/contracts/macos-selection';
import { nativeActivationSchema } from '../../../shared/contracts/native-selection';
import type { NativeProcessOptions, TransportFailure } from '../native/native-process';
import { NativeProcess, NativeTransportError } from '../native/native-process';

interface HelperPaths {
  resourcesPath: string;
  packaged: boolean;
  applicationPath: string;
}
export function macosHelperPath(options: HelperPaths): string {
  return options.packaged
    ? path.join(options.resourcesPath, 'promptly-macos')
    : path.join(options.applicationPath, 'native', 'macos', 'out', 'promptly-macos');
}

/** Main-held object identity is the activation capability; renderer strings cannot mint one. */
export class MacosSelection {
  private readonly transport: NativeProcess;
  private readiness: Promise<ReturnType<typeof macosReadySchema.parse>> | undefined;
  private readonly identities = new WeakSet<MacosIdentity>();

  constructor(options: NativeProcessOptions) {
    this.transport = new NativeProcess(options);
  }

  ready(): Promise<ReturnType<typeof macosReadySchema.parse>> {
    if (!this.transport.running) this.readiness = undefined;
    this.readiness ??= this.transport
      .request(
        'capabilities',
        {},
        (value) => {
          const result = macosReadySchema.parse(value);

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

  async foregroundIdentityResult() {
    try {
      await this.ready();
      const result = await this.transport.request(
        'foreground',
        {},
        (value) => macosForegroundSchema.parse(value),
        100
      );

      if (result.status !== 'ok') return { status: result.status } as const;
      const identity = Object.freeze({
        token: result.identity,
        source: result.source === null ? null : Object.freeze(result.source)
      });

      this.identities.add(identity);
      return { status: 'ok', identity } as const;
    } catch (error) {
      return { status: this.failure(error) };
    }
  }

  async captureSelection(identity: MacosIdentity) {
    if (!this.identities.has(identity)) return { status: 'foregroundChanged' } as const;
    try {
      await this.ready();
      return await this.transport.request(
        'capture',
        { identity: identity.token, includeText: true },
        (value) => macosCaptureSchema.parse(value),
        100
      );
    } catch (error) {
      return { status: this.failure(error) };
    }
  }

  async getPermissions() {
    try {
      await this.ready();
      const { accessibility, inputMonitoring, inputMonitoringRequiredFor, selectionRequires } =
        await this.transport.request(
          'permissions',
          {},
          (value) => macosPermissionsSchema.parse(value),
          100
        );

      return { accessibility, inputMonitoring, inputMonitoringRequiredFor, selectionRequires };
    } catch (error) {
      this.failure(error);
      return {
        accessibility: 'unknown',
        inputMonitoring: 'unknown',
        inputMonitoringRequiredFor: 'passiveKeyboardHook',
        selectionRequires: 'accessibility'
      } as const;
    }
  }

  async activateSource(identity: MacosIdentity) {
    if (!this.identities.has(identity)) return 'foregroundChanged' as const;
    try {
      await this.ready();
      return (
        await this.transport.request(
          'activate',
          { identity: identity.token },
          (value) => nativeActivationSchema.parse(value),
          100
        )
      ).status;
    } catch (error) {
      return this.failure(error);
    }
  }

  dispose(): Promise<void> {
    return this.transport.dispose();
  }

  private failure(error: unknown): TransportFailure {
    this.readiness = undefined;
    return error instanceof NativeTransportError ? error.status : 'helperUnavailable';
  }
}

export function createMacosSelection(options: HelperPaths): MacosSelection {
  const executable = macosHelperPath(options);

  return new MacosSelection({ launch: () => spawn(executable, [], { stdio: 'pipe' }) });
}
