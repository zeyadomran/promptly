/** A diagnostic-only bound; a hung evaluation cannot bypass owned launcher cleanup. */
export async function sessionDeadline<T>(operation: Promise<T>, milliseconds = 4000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Owned session operation timed out'));
        }, milliseconds);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
