import { createElement } from './drawing-elements';
import type { DrawingModel } from './drawing-model';
import type { DrawingState } from './drawing-state';
import type { DrawingElement, DrawingPoint, DrawingTool } from './drawing-types';

interface CommandPort {
  state(): DrawingState;
  model(): DrawingModel | undefined;
  change(edit: (model: DrawingModel) => void, announcement: string): boolean;
  update(state: Partial<DrawingState>): void;
}
export class DrawingCommands {
  constructor(readonly port: CommandPort) {}
  setTool(tool: DrawingTool): void {
    if (this.port.state().pending === undefined) this.port.update({ tool, textAt: undefined });
  }
  setColor(color: string): void {
    if (!/^#[a-f0-9]{6}$/iu.test(color) || this.port.state().pending !== undefined) return;
    if (this.port.model()?.selectedId !== undefined)
      this.port.change((model) => {
        model.recolor(color);
      }, 'Selection recoloured.');
    this.port.update({ color });
  }
  addAt(point: DrawingPoint): boolean {
    const model = this.port.model(),
      state = this.port.state();

    if (model === undefined || state.tool === 'select' || state.pending !== undefined) return false;
    if (state.tool === 'text') {
      this.port.update({ textAt: point });
      return true;
    }

    return this.add(createElement(state.tool, point, state.color, model.scene));
  }
  add(element: DrawingElement): boolean {
    return this.port.change(
      (model) => {
        model.add(element);
      },
      `${element.type === 'stroke' ? 'Pen stroke' : element.type} added and selected.`
    );
  }
  replace(element: DrawingElement): boolean {
    return this.port.change((model) => {
      model.replace(element);
    }, 'Selection moved.');
  }
  select(id: string | undefined): void {
    this.port.change(
      (model) => {
        model.selectedId = id;
      },
      id === undefined ? 'Selection cleared.' : 'Element selected.'
    );
  }
  move(x: number, y: number): void {
    this.port.change(
      (model) => {
        model.move(x, y);
      },
      `Selection moved by ${String(x)}, ${String(y)} pixels.`
    );
  }
  cycle(delta: number): void {
    this.port.change((model) => {
      model.cycle(delta);
    }, 'Selection changed.');
  }
  delete(): void {
    this.port.change((model) => {
      model.delete();
    }, 'Selection deleted.');
  }
  undo(): void {
    this.port.change((model) => {
      model.undo();
    }, 'Undid drawing change.');
  }
  redo(): void {
    this.port.change((model) => {
      model.redo();
    }, 'Redid drawing change.');
  }
  cancelText(): void {
    this.port.update({ textAt: undefined });
  }
  commitText(text: string): boolean {
    const model = this.port.model(),
      state = this.port.state(),
      point = state.textAt;

    if (point === undefined || model === undefined || text.trim() === '') return false;
    const added = this.add(createElement('text', point, state.color, model.scene, text));

    if (added) this.cancelText();
    return added;
  }
}
