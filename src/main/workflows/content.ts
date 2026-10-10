import { createHash } from 'node:crypto';

import type { DesktopResult } from '../../shared/contracts/result';
import { failure } from '../../shared/contracts/result';
import type { PreparedCopy, WorkflowCopySource } from '../../shared/contracts/workflow-copy';
import { workflowLimits } from '../../shared/contracts/workflow-copy';
import { formatContext } from '../../shared/workflows/context-text';
import { parseTemplate } from '../../shared/workflows/template';
import type { WorkflowContent, WorkflowCopyPorts } from './ports';

export function contentFingerprint(content: WorkflowContent): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        text: content.text,
        tags: content.tags.map(({ id, name, color }) => ({ id, name, color })),
        attachments: content.attachments.map((asset) => ({
          id: asset.id,
          sha256: asset.sha256,
          name: asset.name,
          kind: asset.kind,
          mimeType: asset.mimeType,
          byteLength: asset.byteLength,
          width: asset.width,
          height: asset.height,
          hasScene: asset.hasScene
        }))
      })
    )
    .digest('hex');
}

type PreparedContent = Pick<
  PreparedCopy,
  'source' | 'segments' | 'text' | 'variables' | 'attachmentCount'
>;
export async function prepareContent(
  source: WorkflowCopySource,
  ports: WorkflowCopyPorts,
  signal: AbortSignal
): Promise<DesktopResult<PreparedContent>> {
  const segments: PreparedCopy['segments'] = [];
  let attachmentCount = 0;
  let aggregateLength = 0;

  if (source.kind === 'draft') {
    if (source.text.trim().length === 0)
      return failure('UNAVAILABLE', 'No text to copy. Attachments are copied separately.');
    segments.push({
      kind: 'draft',
      id: source.draftId,
      text: source.text,
      fingerprint: createHash('sha256').update(JSON.stringify(source)).digest('hex')
    });
    attachmentCount = source.attachmentCount;
  } else {
    const sources =
      source.kind === 'bundle'
        ? source.ids.map((id) => ({ kind: 'snippet' as const, id }))
        : [source];

    for (const entry of sources) {
      signal.throwIfAborted();
      const found = await ports.lookup(entry);

      if (!found.ok) return found;
      if (found.value.id !== entry.id || found.value.kind !== entry.kind)
        return failure('INTERNAL', 'The content source did not match the requested entry.');
      if (found.value.text.trim().length === 0)
        return failure('UNAVAILABLE', 'No text to copy. Attachments are copied separately.');
      aggregateLength += found.value.text.length;
      if (aggregateLength > workflowLimits.text)
        return failure('INVALID_REQUEST', 'This bundle is too long to copy. Remove a snippet.');
      segments.push({
        ...entry,
        text: found.value.text,
        fingerprint: contentFingerprint(found.value)
      });
      attachmentCount += found.value.attachments.length;
    }
  }

  try {
    const text =
      source.kind === 'bundle'
        ? formatContext(
            segments.map((part) => part.text),
            source.separator
          )
        : (segments[0]?.text ?? '');
    const names = new Map<string, PreparedCopy['variables'][number]>();

    if (await ports.variablesEnabled()) {
      for (const [index, segment] of segments.entries()) {
        for (const variable of parseTemplate(segment.text)) {
          const previous = names.get(variable.name);

          names.set(variable.name, {
            name: variable.name,
            count: (previous?.count ?? 0) + variable.count,
            sourceIndexes: [...(previous?.sourceIndexes ?? []), index + 1]
          });
          if (names.size > workflowLimits.variables)
            throw new Error('A copy can use at most 32 variable names.');
        }
      }
    }

    return {
      ok: true,
      value: { source, segments, text, variables: [...names.values()], attachmentCount }
    };
  } catch (error) {
    return failure(
      'INVALID_REQUEST',
      error instanceof Error ? error.message : 'Unable to prepare this text.'
    );
  }
}
