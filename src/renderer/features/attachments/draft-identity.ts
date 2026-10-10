import type { Attachment } from '../../../shared/contracts/attachments';

export function draftIdentity(text: string, tags: string[], attachments: Attachment[]) {
  return JSON.stringify([
    text,
    [...tags].sort(),
    attachments.map(({ id, sha256 }) => [id, sha256])
  ]);
}
