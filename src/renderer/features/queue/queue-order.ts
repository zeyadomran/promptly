import type { QueueState } from './queue-state';

export function reorderedQueueIds(
  state: QueueState,
  id: string,
  beforeId: string | undefined
): string[] | undefined {
  if (state.tab !== 'open' || id === beforeId) return undefined;
  const open = state.items.filter((item) => item.completedAt === null).map((item) => item.id);

  if (!open.includes(id)) return undefined;
  const ids = open.filter((candidate) => candidate !== id);
  const index = beforeId === undefined ? ids.length : ids.indexOf(beforeId);

  if (index < 0) return undefined;
  ids.splice(index, 0, id);
  return ids.every((candidate, position) => candidate === open[position]) ? undefined : ids;
}
