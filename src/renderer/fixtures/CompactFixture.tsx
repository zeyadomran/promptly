import { PinIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { useState } from 'react';

import { HighlightedText } from '../components/shared/HighlightedText';
import { IconButton } from '../components/shared/IconButton';
import { Logo } from '../components/shared/Logo';
import { PinStatus } from '../components/shared/PinStatus';
import { ShortcutKey } from '../components/shared/ShortcutKey';
import { TagDot } from '../components/shared/TagDot';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { findTextMatches } from '../lib/highlight';
import { cn } from '../lib/utils';

const examples = [
  {
    text: 'Refactor this module to use dependency injection. Keep the public API identical and add tests for…',
    source: 'Cursor',
    colors: ['blue', 'green'],
    tags: 'refactor, testing'
  },
  {
    text: 'Read the failing tests first. Explain the root cause in two sentences, then propose the smallest fix.',
    source: 'Terminal',
    colors: ['green', 'amber'],
    tags: 'testing, debugging'
  },
  {
    text: 'Generate property-based tests for the date parser. Cover leap years, DST, and invalid input.',
    source: 'VS Code',
    colors: ['green'],
    tags: 'testing'
  }
] as const;

export function CompactFixture() {
  const [pinned, setPinned] = useState(false);
  const [query, setQuery] = useState('test');

  return (
    <section
      aria-label="Compact component fixture"
      className="w-[440px] max-w-full overflow-hidden rounded-[14px] border bg-background shadow-sm"
    >
      <header className="flex h-10 items-center justify-between border-b px-3.5">
        <Logo size={16} wordmark />
        <IconButton
          label="Always on top"
          icon={PinIcon}
          aria-pressed={pinned}
          variant={pinned ? 'secondary' : 'ghost'}
          onClick={() => {
            setPinned(!pinned);
          }}
        />
      </header>
      <div className="flex items-center gap-2 border-b px-3.5 py-3">
        <SearchIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        <Input
          aria-label="Search fixture"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        <ShortcutKey>esc</ShortcutKey>
      </div>
      <div className="flex items-center gap-1.5 border-b border-border-soft px-3.5 py-2">
        <Badge>All</Badge>
        <Badge variant="outline">
          <TagDot color="blue" />
          refactor
        </Badge>
        <Badge variant="outline">
          <TagDot color="green" />
          testing
        </Badge>
        <IconButton label="New tag fixture" icon={PlusIcon} disabled />
      </div>
      <div className="flex flex-col gap-0.5 p-1.5">
        {examples.map((example, index) => (
          <div
            key={example.source}
            className={cn('flex gap-2.5 rounded-lg p-2.5', index === 0 && 'bg-row-selected')}
          >
            <div className="flex flex-col gap-1 pt-1.5">
              {example.colors.map((color) => (
                <TagDot key={color} color={color} size="row" />
              ))}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="line-clamp-2 font-mono text-snippet leading-[1.55] text-foreground-2">
                <HighlightedText
                  text={example.text}
                  ranges={findTextMatches(example.text, query)}
                />
              </p>
              <p className="text-meta text-muted-foreground">
                {example.tags} · {example.source}
              </p>
            </div>
          </div>
        ))}
      </div>
      <footer className="flex justify-between border-t px-3.5 py-2 text-meta text-muted-foreground">
        <span>3 example snippets</span>
        <PinStatus pinned={pinned} />
      </footer>
    </section>
  );
}
