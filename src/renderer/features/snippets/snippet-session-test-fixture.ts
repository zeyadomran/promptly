import type { Snippet } from '../../../shared/contracts/domain';

export const first: Snippet = {
  id: '00000000-0000-4000-8000-000000000001',
  text: 'Original 雪🙂',
  createdAt: '2026-10-02T00:00:00Z',
  updatedAt: '2026-10-02T00:00:00Z',
  sourceApp: null,
  sourceAppId: null,
  tags: [],
  attachments: [],
  lastCopiedAt: null,
  copyCount: 0
};
export const second = {
  ...first,
  id: '00000000-0000-4000-8000-000000000002',
  text: 'Other snippet'
};

export function snippetSessionRecords(): Map<string, Snippet> {
  return new Map([
    [first.id, first],
    [second.id, second]
  ]);
}
