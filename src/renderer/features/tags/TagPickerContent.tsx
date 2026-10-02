import { Check, Plus } from 'lucide-react';
import { useRef } from 'react';

import type { TagSummary } from '../../../shared/contracts/domain';
import { tagInputNameSchema } from '../../../shared/contracts/domain';
import { Button } from '../../components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandList } from '../../components/ui/command';
import { CommandInput } from '../../components/ui/command-input';
import { CommandItem } from '../../components/ui/command-item';
import { PopoverClose } from '../../components/ui/popover';
import { PopoverContent } from '../../components/ui/popover-content';
import { tagColorClasses } from '../../lib/tag-palette';
import type { TagPickerController } from './tag-picker-controller';

export function TagPickerContent({
  picker,
  state,
  tags,
  selectedIds,
  chooseFilter,
  restoreFocus
}: {
  picker: TagPickerController;
  state: ReturnType<TagPickerController['snapshot']>;
  tags: readonly TagSummary[];
  selectedIds: readonly string[];
  chooseFilter: (id: string) => void;
  restoreFocus: () => void;
}) {
  const composing = useRef(false);
  const restore = useRef(true);
  const name = tagInputNameSchema.safeParse(state.query);
  const create = name.success && !tags.some((tag) => tag.name === name.data);
  const disabled = state.loading || state.busy;

  return (
    <PopoverContent
      className="tag-picker"
      data-promptly-overlay="tags"
      aria-label={state.targetId === null ? 'Create or filter tags' : 'Edit snippet tags'}
      onOpenAutoFocus={() => {
        restore.current = true;
      }}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (restore.current) restoreFocus();
      }}
      onInteractOutside={(event) => {
        const target = event.target;

        if (
          target instanceof HTMLElement &&
          target.closest('input,textarea,button,[contenteditable=true],[role=dialog]') !== null
        )
          restore.current = false;
      }}
      onEscapeKeyDown={(event) => {
        if (composing.current || event.isComposing) event.preventDefault();
      }}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={() => {
        composing.current = false;
      }}
      onKeyDownCapture={(event) => {
        if (
          (composing.current || event.nativeEvent.isComposing || event.key === 'Process') &&
          (event.key === 'Enter' || event.key === 'Escape' || event.key === 'Process')
        )
          event.stopPropagation();
        else if (event.repeat && event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    >
      <Command label="Tags" shouldFilter={false} vimBindings={false}>
        <CommandInput
          autoFocus
          placeholder="Search or create a tag…"
          aria-label="Search or create a tag"
          value={state.query}
          onValueChange={(query) => {
            picker.query(query);
          }}
        />
        <CommandList aria-busy={disabled}>
          <CommandEmpty>No matching tags.</CommandEmpty>
          <CommandGroup
            heading={state.targetId === null ? 'Filter tags (match all)' : 'Snippet tags'}
          >
            {picker.matches(tags).map((tag) => (
              <CommandItem
                key={tag.id}
                value={tag.id}
                disabled={disabled || (!selectedIds.includes(tag.id) && selectedIds.length >= 100)}
                onSelect={() => {
                  if (state.targetId === null) chooseFilter(tag.id);
                  else void picker.toggle(tag.id);
                }}
              >
                <span
                  className={`library-tag-dot ${tagColorClasses[tag.color]}`}
                  aria-hidden="true"
                />
                <span className="tag-picker-name">{tag.name}</span>
                <span
                  className="tag-picker-count"
                  aria-label={`${String(tag.snippetCount)} snippets`}
                >
                  {tag.snippetCount}
                </span>
                {selectedIds.includes(tag.id) && <Check aria-label="Selected" size={14} />}
              </CommandItem>
            ))}
          </CommandGroup>
          {create && (
            <CommandGroup heading="Create tag">
              <CommandItem
                value="create-tag"
                disabled={disabled}
                onSelect={() => {
                  void picker.create();
                }}
              >
                <Plus aria-hidden="true" size={14} />
                <span className="tag-picker-name">Create “{name.data}”</span>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </Command>
      <div className="tag-picker-footer">
        <span role="status">
          {disabled
            ? 'Updating tags…'
            : state.targetId === null
              ? 'Select filters or create a tag.'
              : 'Changes save immediately.'}
        </span>
        <PopoverClose asChild>
          <Button variant="ghost" size="xs">
            Done
          </Button>
        </PopoverClose>
      </div>
      {state.query.trim() !== '' && !name.success && (
        <p className="library-error">Use 1–64 characters of well-formed Unicode.</p>
      )}
      {state.error !== undefined && (
        <p className="library-error" role="alert">
          {state.error}
        </p>
      )}
    </PopoverContent>
  );
}
