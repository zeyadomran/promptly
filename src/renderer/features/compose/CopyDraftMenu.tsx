import { ChevronDown, Copy } from 'lucide-react';

import type { WorkflowCopySource } from '../../../shared/contracts/workflow-copy';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { useWorkflowCopy } from '../workflows/workflow-copy-context';

export function CopyDraftMenu({
  source,
  hasText,
  pending
}: {
  source: () => WorkflowCopySource | undefined;
  hasText: boolean;
  pending: boolean;
}) {
  const copy = useWorkflowCopy();
  const disabled = pending || copy.busy || copy.bundleState.active || !hasText;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Draft copy actions" disabled={pending}>
          <Copy aria-hidden="true" />
          Copy
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={disabled}
          onSelect={() => {
            void copy.requestCopy(source);
          }}
        >
          <Copy aria-hidden="true" />
          Copy draft text
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={disabled || copy.returnLabel === undefined}
          onSelect={() => {
            void copy.requestCopy(source, { return: true });
          }}
        >
          Copy draft text and return
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={disabled}
          onSelect={() => {
            void copy.requestCopy(source, { format: 'markdown' });
          }}
        >
          Copy draft as Markdown
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={disabled}
          onSelect={() => {
            void copy.requestCopy(source, { asWritten: true });
          }}
        >
          Copy draft as written
        </DropdownMenuItem>
        {!hasText && (
          <p className="draft-menu-note">Add text to copy. Attachments are shared separately.</p>
        )}
        {copy.returnLabel === undefined && (
          <p className="draft-menu-note">No previous app to return to.</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
