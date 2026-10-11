import { Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { tagInputNameSchema } from '../../../shared/contracts/domain';
import { Button } from '../../components/ui/button';
import { Command, CommandGroup, CommandList } from '../../components/ui/command';
import { CommandInput } from '../../components/ui/command-input';
import { CommandItem } from '../../components/ui/command-item';
import { Popover, PopoverAnchor } from '../../components/ui/popover';
import { PopoverContent } from '../../components/ui/popover-content';
import { useLibrary } from '../library/library-context';
import { TagBadge } from '../tags/TagBadge';
import { TagPickerItem } from '../tags/TagPickerItem';

export function DraftTags({
  selectedIds,
  onChange,
  pending = false,
  compact = false,
  onBusy
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  pending?: boolean;
  compact?: boolean;
  onBusy?: (busy: boolean) => void;
}) {
  const { state } = useLibrary();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const button = useRef<HTMLButtonElement>(null);
  const matches = state.tags.filter(({ name }) =>
    name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );
  const parsedName = tagInputNameSchema.safeParse(query);
  const create = parsedName.success && !state.tags.some((tag) => tag.name === parsedName.data);
  const unavailable = state.loading
    ? []
    : selectedIds.filter((id) => !state.tags.some((tag) => tag.id === id));
  const choose = (id: string) => {
    if (pending || busy) return;
    const ids = selectedIds.includes(id)
      ? selectedIds.filter((selected) => selected !== id)
      : [...selectedIds, id];

    if (ids.length <= 100) onChange(ids);
  };

  const createTag = async () => {
    if (!parsedName.success || pending || busy || selectedIds.length >= 100) return;
    setBusy(true);
    onBusy?.(true);
    setError(undefined);
    try {
      const result = await window.promptly.ensureTag({ name: parsedName.data });

      if (!result.ok) setError(result.error.message);
      else onChange([...new Set([...selectedIds, result.value.tag.id])]);
    } catch {
      setError('Unable to create the tag. Your draft is kept.');
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  };

  return (
    <div className="draft-tags">
      {!compact &&
        state.tags
          .filter(({ id }) => selectedIds.includes(id))
          .map((tag) => <TagBadge key={tag.id} name={tag.name} color={tag.color} />)}
      {!compact &&
        unavailable.map((id) => (
          <Button
            key={id}
            variant="outline"
            size="xs"
            disabled={pending || busy}
            aria-label="Remove unavailable tag from draft"
            title="This tag is unavailable. Remove it to save without it."
            onClick={() => {
              choose(id);
            }}
          >
            Unavailable tag
            <X aria-hidden="true" />
          </Button>
        ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <Button
            ref={button}
            variant="outline"
            size="xs"
            disabled={pending || busy}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => {
              setOpen(!open);
            }}
          >
            <Plus aria-hidden="true" />
            Tags{compact && selectedIds.length > 0 ? ` (${String(selectedIds.length)})` : ''}
          </Button>
        </PopoverAnchor>
        <PopoverContent
          className="tag-picker"
          data-promptly-overlay="tags"
          aria-label="Draft tags"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            button.current?.focus();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
        >
          <Command shouldFilter={false} label="Draft tags">
            <CommandInput
              placeholder="Add or find a tag…"
              aria-label="Add or find a draft tag"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList aria-busy={busy}>
              <CommandGroup heading="Tags">
                {matches.map((tag) => (
                  <TagPickerItem
                    key={tag.id}
                    tag={tag}
                    selected={selectedIds.includes(tag.id)}
                    disabled={
                      pending ||
                      busy ||
                      (!selectedIds.includes(tag.id) && selectedIds.length >= 100)
                    }
                    toggle={() => {
                      choose(tag.id);
                    }}
                  />
                ))}
              </CommandGroup>
              {compact && unavailable.length > 0 && (
                <CommandGroup heading="Unavailable tags">
                  {unavailable.map((id) => (
                    <CommandItem
                      key={id}
                      value={id}
                      disabled={pending || busy}
                      onSelect={() => {
                        choose(id);
                      }}
                    >
                      <X aria-hidden="true" />
                      Remove unavailable tag
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {create && (
                <CommandGroup>
                  <CommandItem
                    value="create"
                    disabled={busy || pending || selectedIds.length >= 100}
                    onSelect={() => {
                      void createTag();
                    }}
                  >
                    <Plus aria-hidden="true" />
                    Create tag “{parsedName.data}”
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
          <p className="tag-picker-footer">Tags are saved with this draft.</p>
          {error !== undefined && (
            <p role="alert" className="library-error">
              {error}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
