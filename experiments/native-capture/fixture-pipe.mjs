import { fixtureLifecycle } from './fixture-lifecycle.mjs';
import { fixtureMetadata, metadataBytes } from './fixture-metadata.mjs';

export async function startPipeFixture(child, mode) {
  const lifecycle = fixtureLifecycle(child, mode);
  let buffer = '';
  let reading = true;
  let receivedBytes = 0;
  const read = (chunk) => {
    if (!reading || !lifecycle.pending) return;
    receivedBytes += chunk.length;
    if (receivedBytes > metadataBytes) {
      reading = false;
      buffer = '';
      lifecycle.fail('metadataTooLarge');
      return;
    }

    buffer += chunk.toString('utf8');
    const newline = buffer.indexOf('\n');

    if (newline === -1) return;
    reading = false;
    try {
      lifecycle.accept(fixtureMetadata(buffer.slice(0, newline), child.pid));
    } catch {
      lifecycle.fail('invalidMetadata');
    }
  };

  const end = () => {
    reading = false;
    buffer = '';
    lifecycle.fail('outputClosed');
  };

  child.stdout.on('data', read);
  child.stdout.on('end', end);
  child.stdout.on('close', end);
  try {
    const metadata = await lifecycle.readiness;

    return {
      ...metadata,
      startupReceipt: lifecycle.receipt(),
      receipt: () => lifecycle.receipt(),
      close: lifecycle.close
    };
  } catch (error) {
    try {
      error.cleanup = await lifecycle.close();
    } catch (cleanupError) {
      error.cleanup = cleanupError.receipt;
    }

    if (error.cleanup !== undefined) {
      error.receipt = {
        ...error.receipt,
        exitCode: error.cleanup.exitCode,
        signal: error.cleanup.signal,
        stdoutBytes: error.cleanup.stdoutBytes,
        stderrBytes: error.cleanup.stderrBytes
      };
      error.message = `Native fixture lifecycle: ${JSON.stringify(error.receipt)}`;
    }

    throw error;
  } finally {
    buffer = '';
    child.stdout.off('data', read);
    child.stdout.off('end', end);
    child.stdout.off('close', end);
  }
}
