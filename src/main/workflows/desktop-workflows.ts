import type { SavedCopySource } from '../../shared/contracts/workflow-copy';
import type { AttachmentService } from '../attachments/service';
import type { CopyService } from '../copy/service';
import type { PreviousAppService } from '../previous-app/service';
import type { SettingsService } from '../settings/service';
import type { StorageClient } from '../storage/client';
import type { TransferOwner } from '../storage/transfer/requests';
import { WorkflowSaveService } from './save-service';
import { WorkflowCopyService } from './service';

export function createDesktopWorkflows(
  storage: Pick<StorageClient, 'call'>,
  owner: (id: number) => TransferOwner | undefined,
  settings: Pick<SettingsService, 'current'>,
  copy: Pick<CopyService, 'executePrepared'>,
  attachments: Pick<AttachmentService, 'content'>,
  previousApp: Pick<PreviousAppService, 'returnToPreviousApp'>
) {
  const lookup = async (source: SavedCopySource) => {
    const result =
      source.kind === 'snippet'
        ? await storage.call('getSnippet', { id: source.id })
        : await storage.call('getQueueItem', { id: source.id });

    if (!result.ok) return result;
    const content = 'snippet' in result.value ? result.value.snippet : result.value.item;

    return {
      ok: true as const,
      value: { ...source, text: content.text, tags: content.tags, attachments: content.attachments }
    };
  };

  const workflow = new WorkflowCopyService({
    owner,
    lookup,
    variablesEnabled: () => settings.current.settings.promptVariables,
    executePrepared: (context, resolve) => copy.executePrepared(context, resolve)
  });
  const saves = new WorkflowSaveService(owner, attachments, previousApp, workflow);

  return { workflow, saves, services: { ...workflow.services, ...saves.services } };
}
