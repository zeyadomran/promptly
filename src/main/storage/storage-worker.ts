import { parentPort, workerData } from 'node:worker_threads';

import { failure } from '../../shared/contracts/result';
import { StorageEngine } from './engine';
import type { WorkerRequest } from './protocol';
import { storageTimestamp } from './worker-diagnostics';

if (parentPort === null) throw new Error('Storage must run in a worker thread.');
const port = parentPort;

try {
  if (typeof workerData !== 'string') throw new Error('Invalid storage location.');
  const engine = new StorageEngine(workerData);

  port.postMessage({ id: 0, result: { ok: true, value: { revision: engine.context.revision() } } });
  port.on('message', (message: WorkerRequest) => {
    const received =
      message.operation === 'searchSnippets' && message.diagnostic === true
        ? storageTimestamp()
        : undefined;

    if (message.operation === 'close') {
      engine.close();
      port.postMessage({ id: message.id, result: { ok: true, value: null } });
      port.close();
      return;
    }

    const reply = engine.run(message.id, message.operation, message.input);

    if (received !== undefined) reply.diagnostic = { received, sent: storageTimestamp() };
    port.postMessage(reply);
  });
} catch {
  port.postMessage({ id: 0, result: failure('INTERNAL', 'Unable to open local storage.') });
  port.close();
}
