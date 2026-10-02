/** Test teardown owns clients independently of an async test body's delayed finally. */
export function ownStorageClients(createClient, removeDirectory) {
  const clients = [];
  let retired = false;
  let disposal;

  return {
    createClient(...args) {
      if (retired) throw new Error('Owned storage fixture has retired.');
      const client = createClient(...args);
      const close = client.close.bind(client);
      const entry = { client, settled: false, closing: undefined };

      client.close = () => {
        try {
          entry.closing ??= close();
        } catch (error) {
          entry.closing = Promise.reject(error);
        }

        void entry.closing.then(
          () => {
            entry.settled = true;
          },
          () => {
            entry.settled = true;
          }
        );
        return entry.closing;
      };

      clients.push(entry);
      return client;
    },
    dispose() {
      // Retire synchronously: a timed-out body may continue and try to reopen later.
      retired = true;
      disposal ??= (async () => {
        const previouslySettled = clients.map((entry) => entry.settled);
        const results = await Promise.allSettled(clients.map((entry) => entry.client.close()));
        const failures = results.flatMap((result, index) =>
          result.status === 'rejected' && !previouslySettled[index] ? [result.reason] : []
        );
        // StorageClient.close awaits terminate even when readiness/draining rejects.
        // Independently inspect only each fixture-owned Worker's terminal thread ID.
        const terminationObserved = clients.every((entry) => entry.client.worker.threadId === -1);

        if (terminationObserved) {
          try {
            await removeDirectory();
          } catch (error) {
            failures.push(error);
          }
        } else
          failures.push(
            new Error('Owned worker termination was not observed; directory retained.')
          );
        if (failures.length > 0)
          throw new AggregateError(failures, 'Owned worker fixture cleanup failed.');
        return { clients: clients.length, terminationObserved, directoryRemoved: true };
      })();
      return disposal;
    }
  };
}
