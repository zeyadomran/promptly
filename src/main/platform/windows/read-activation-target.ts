import { nativeForegroundSchema } from '../../../shared/contracts/native-selection';
import { type NativeProcess, NativeTransportError } from '../native/native-process';
import type { SourceCapabilities } from './source-capabilities';
import type { WindowsForegroundResult } from './windows-selection';

export async function readActivationTarget(
  ready: Promise<unknown>,
  transport: NativeProcess,
  identities: SourceCapabilities,
  excludePid: number
): Promise<WindowsForegroundResult> {
  try {
    await ready;
    const result = await transport.request(
      'activationTarget',
      { excludePid },
      (value) => nativeForegroundSchema.parse(value),
      100
    );

    if (result.status !== 'ok') return { status: result.status };
    const identity = Object.freeze({ token: result.identity, source: result.source });

    identities.remember(identity);
    return { status: 'ok', identity };
  } catch (error) {
    return { status: error instanceof NativeTransportError ? error.status : 'helperUnavailable' };
  }
}
