import {
  ArrowUpRightIcon,
  MousePointer2Icon,
  PencilIcon,
  Redo2Icon,
  SquareIcon,
  Trash2Icon,
  TypeIcon,
  Undo2Icon
} from 'lucide-react';

import { Button } from '../../components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';
import type { DrawingSession } from './drawing-session';
import type { DrawingState } from './drawing-state';
import type { DrawingTool } from './drawing-types';

const tools = [
  { value: 'select', label: 'Select', key: 'V', icon: MousePointer2Icon },
  { value: 'pen', label: 'Pen', key: 'P', icon: PencilIcon },
  { value: 'arrow', label: 'Arrow', key: 'A', icon: ArrowUpRightIcon },
  { value: 'rectangle', label: 'Rectangle', key: 'R', icon: SquareIcon },
  { value: 'text', label: 'Text', key: 'T', icon: TypeIcon }
] satisfies { value: DrawingTool; label: string; key: string; icon: typeof TypeIcon }[];
const colours = [
  { color: '#18181b', name: 'Black' },
  { color: '#e44755', name: 'Red' },
  { color: '#d89a17', name: 'Amber' },
  { color: '#4e80ed', name: 'Blue' },
  { color: '#2a9a68', name: 'Green' }
];

export function DrawingToolbar({
  session,
  state
}: {
  session: DrawingSession;
  state: DrawingState;
}) {
  const disabled = state.pending !== undefined || state.confirm;

  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      className="drawing-toolbar"
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
          return;
        const buttons = [
          ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
            'button[data-drawing-control]:not(:disabled)'
          )
        ];
        const target = event.target instanceof HTMLElement ? event.target.closest('button') : null;
        const index = buttons.findIndex((button) => button === target);
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? buttons.length - 1
              : (index +
                  (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) +
                  buttons.length) %
                buttons.length;

        buttons[next]?.focus();
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <ToggleGroup
        type="single"
        value={state.tool}
        onValueChange={(value) => {
          const tool = tools.find((item) => item.value === value);

          if (tool !== undefined) session.commands.setTool(tool.value);
        }}
        variant="outline"
        size="sm"
        aria-label="Tool"
        className="drawing-tools"
        disabled={disabled}
      >
        {tools.map(({ value, label, key, icon: Icon }) => (
          <ToggleGroupItem
            key={value}
            value={value}
            data-drawing-control
            aria-label={`${label} (${key})`}
            title={`${label} (${key})`}
          >
            <Icon aria-hidden="true" data-icon="inline-start" />
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ToggleGroup
        type="single"
        value={state.color}
        onValueChange={(value) => {
          if (value !== '') session.commands.setColor(value);
        }}
        variant="outline"
        size="sm"
        aria-label="Colour"
        className="drawing-colours"
        disabled={disabled}
      >
        {colours.map(({ color, name }) => (
          <ToggleGroupItem
            key={color}
            value={color}
            data-drawing-control
            aria-label={`${name} colour`}
            title={name}
          >
            <span
              aria-hidden="true"
              className="drawing-swatch"
              style={{ backgroundColor: color }}
            />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Button
        variant="outline"
        size="icon-sm"
        data-drawing-control
        disabled={disabled || !state.canUndo}
        aria-label="Undo (Ctrl+Z)"
        title="Undo (Ctrl+Z)"
        onClick={() => {
          session.commands.undo();
        }}
      >
        <Undo2Icon aria-hidden="true" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        data-drawing-control
        disabled={disabled || !state.canRedo}
        aria-label="Redo (Ctrl+Y)"
        title="Redo (Ctrl+Y)"
        onClick={() => {
          session.commands.redo();
        }}
      >
        <Redo2Icon aria-hidden="true" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        data-drawing-control
        disabled={disabled || state.selectedId === undefined}
        aria-label="Delete selected element (Del)"
        title="Delete selected element (Del)"
        onClick={() => {
          session.commands.delete();
        }}
      >
        <Trash2Icon aria-hidden="true" />
      </Button>
    </div>
  );
}
