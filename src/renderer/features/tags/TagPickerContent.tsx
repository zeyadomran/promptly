import { Plus } from 'lucide-react';
import { useRef } from 'react';

import type { TagSummary } from '../../../shared/contracts/domain';
import { tagInputNameSchema } from '../../../shared/contracts/domain';
import { Button } from '../../components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandList } from '../../components/ui/command';
import { CommandInput } from '../../components/ui/command-input';
import { CommandItem } from '../../components/ui/command-item';
import { PopoverContent } from '../../components/ui/popover-content';
import type { TagPickerController } from './tag-picker-controller';
import { TagPickerItem } from './TagPickerItem';

export function TagPickerContent({
  picker,
  state,
  tags,
  selectedIds,
  chooseFilter,
  clearFilters,
  untagged,
  chooseUntagged,
  restoreFocus
}: {
  picker: TagPickerController;
  state: ReturnType<TagPickerController['snapshot']>;
  tags: readonly TagSummary[];
  selectedIds: readonly string[];
  chooseFilter: (id: string) => void;
  clearFilters: () => void;
  untagged: boolean;
  chooseUntagged: () => void;
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
        // Radix owns initial focus so this runs on each open, including after an outside click.
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
          placeholder={state.targetId === null ? 'Filter tags…' : 'Add or find a tag…'}
          aria-label={state.targetId === null ? 'Filter tags' : 'Add or find a tag'}
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
              <TagPickerItem
                key={tag.id}
                tag={tag}
                filter={state.targetId === null}
                selected={selectedIds.includes(tag.id)}
                disabled={disabled || (!selectedIds.includes(tag.id) && selectedIds.length >= 100)}
                toggle={() => {
                  if (state.targetId === null) chooseFilter(tag.id);
                  else void picker.toggle(tag.id);
                }}
              />
            ))}
          </CommandGroup>
          {state.targetId === null &&
            (state.query.trim() === '' ||
              'untagged'.includes(state.query.trim().toLowerCase())) && (
              <CommandGroup heading="Other filters">
                <CommandItem value="untagged" onSelect={chooseUntagged} disabled={disabled}>
                  <span className="tag-picker-name">Untagged</span>
                  {untagged && <span>Selected</span>}
                </CommandItem>
              </CommandGroup>
            )}
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
                <span className="tag-picker-name">Create tag '{name.data}'</span>
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
              ? String(selectedIds.length) + ' selected'
              : 'Changes save immediately.'}
        </span>
        {state.targetId === null && (
          <Button
            variant="ghost"
            size="xs"
            disabled={disabled || (selectedIds.length === 0 && !untagged)}
            onClick={clearFilters}
          >
            Clear
          </Button>
        )}
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
