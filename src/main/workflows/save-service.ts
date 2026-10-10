import type { DesktopOperations } from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import {
  type WorkflowSaveOutcome,
  workflowSaveRequestSchema
} from '../../shared/contracts/workflow-save';
import type { AttachmentService } from '../attachments/service';
import { executeSaveAndReturn } from '../previous-app/save-and-return';
import type { PreviousAppService } from '../previous-app/service';
import type { TransferOwner } from '../storage/transfer/requests';
import { TransferRequests } from '../storage/transfer/requests';
import type { WorkflowCopyService } from './service';

export class WorkflowSaveService {
  private readonly requests: TransferRequests;
  constructor(
    owner: (id: number) => TransferOwner | undefined,
    private readonly content: Pick<AttachmentService, 'content'>,
    private readonly previousApp: Pick<PreviousAppService, 'returnToPreviousApp'>,
    private readonly workflow: Pick<WorkflowCopyService, 'invalidateDraft'>
  ) {
    this.requests = new TransferRequests(owner);
  }
  readonly services: Pick<DesktopOperations, 'saveWorkflowDraft'> = {
    saveWorkflowDraft: (input, context) =>
      this.requests.run<WorkflowSaveOutcome>(context, async ({ owner }) => {
        const parsed = workflowSaveRequestSchema.safeParse(input);

        if (!parsed.success) return failure('INVALID_REQUEST', 'Invalid draft save.');
        const draft = parsed.data;
        const save = async () => {
          const content = {
            text: draft.text,
            ...(draft.tagIds === undefined ? {} : { tagIds: draft.tagIds }),
            ...(draft.draftToken === undefined ? {} : { draftToken: draft.draftToken })
          };
          const result =
            draft.destination === 'library'
              ? await this.content.content('createSnippet', content, context)
              : draft.queueId === undefined
                ? await this.content.content('createQueueItem', content, context)
                : await this.content.content(
                    'updateQueueItem',
                    { ...content, id: draft.queueId },
                    context
                  );

          if (!result.ok) return result;
          const saved = 'snippet' in result.value ? result.value.snippet : result.value.item;

          // This metadata retirement must not turn a durable save into a retryable failure.
          try {
            this.workflow.invalidateDraft(owner.id, draft.draftId, draft.draftRevision + 1);
          } catch {
            /* Saved content remains confirmed. */
          }

          return {
            ok: true as const,
            value: { destination: draft.destination, id: saved.id, revision: result.value.revision }
          };
        };

        if (!draft.return) {
          const result = await save();

          return result.ok
            ? {
                ok: true as const,
                value: {
                  ...result.value,
                  status: 'saved' as const,
                  returned: 'not-requested' as const,
                  warnings: []
                }
              }
            : result;
        }

        const returned = await executeSaveAndReturn(
          save,
          () => this.previousApp.returnToPreviousApp(),
          owner.isAlive
        );

        if (!returned.ok) return returned;
        return {
          ok: true as const,
          value: {
            ...returned.value.saved,
            status: 'saved' as const,
            returned: returned.value.returned,
            warnings: returned.value.warnings,
            ...(returned.value.returnLabel === undefined
              ? {}
              : { returnLabel: returned.value.returnLabel })
          }
        };
      })
  };
  close() {
    return this.requests.close();
  }
}
