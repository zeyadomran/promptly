import type { DrawingSession } from './drawing-session';
import type { DrawingTool } from './drawing-types';

const tools: Record<string, DrawingTool | undefined> = {
  v: 'select',
  p: 'pen',
  a: 'arrow',
  r: 'rectangle',
  t: 'text'
};

export function drawingKeyboard(
  session: DrawingSession,
  event: {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    isComposing?: boolean;
  },
  canvas = false
): boolean {
  const state = session.snapshot(),
    commands = session.commands,
    key = event.key.toLowerCase();

  if (
    event.isComposing === true ||
    state.pending !== undefined ||
    state.confirm ||
    state.textAt !== undefined
  )
    return false;
  if (event.ctrlKey || event.metaKey) {
    if (key === 'z') {
      if (event.shiftKey) commands.redo();
      else commands.undo();
      return true;
    }

    if (key === 'y') {
      commands.redo();
      return true;
    }

    if (key === 'enter') {
      void session.output('save');
      return true;
    }

    return false;
  }

  if (event.altKey) return false;
  const tool = tools[key];

  if (tool !== undefined) {
    commands.setTool(tool);
    return true;
  }

  if (!canvas || state.scene === undefined) return false;
  const delta = event.shiftKey ? 10 : 1;
  const arrows: Record<string, [number, number] | undefined> = {
    arrowleft: [-delta, 0],
    arrowright: [delta, 0],
    arrowup: [0, -delta],
    arrowdown: [0, delta]
  };
  const move = arrows[key];

  if (move !== undefined) commands.move(...move);
  else if (key === 'enter') commands.addAt({ x: state.scene.width / 2, y: state.scene.height / 2 });
  else if (key === 'pageup' || key === 'pagedown') commands.cycle(key === 'pageup' ? -1 : 1);
  else if (key === 'delete' || key === 'backspace') commands.delete();
  else return false;
  return true;
}
