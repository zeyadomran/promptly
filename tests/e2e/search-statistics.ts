export function summarizeSearchSamples(samples: Record<string, number[]>) {
  return Object.fromEntries(
    Object.entries(samples).map(([query, values]) => {
      const warm = values.slice(1).sort((left, right) => left - right);

      return [
        query,
        {
          cold: values[0],
          sampleCount: values.length,
          p50: warm[Math.floor(warm.length / 2)],
          p95: warm[Math.ceil(warm.length * 0.95) - 1],
          max: Math.max(...values)
        }
      ];
    })
  );
}
