import { type DrawingScene, drawingSceneSchema } from '../../../shared/contracts/drawing';
import { moveElement } from './drawing-elements';
import type { DrawingElement } from './drawing-types';

/** Immutable bounded scenes; one committed pointer gesture is one undo step. */
export class DrawingModel {
  scene: DrawingScene;
  selectedId: string | undefined;
  private readonly initial: string;
  private past: DrawingScene[] = [];
  private future: DrawingScene[] = [];
  constructor(scene: DrawingScene) {
    this.scene = drawingSceneSchema.parse(scene);
    this.initial = JSON.stringify(this.scene);
  }
  get dirty() {
    return JSON.stringify(this.scene) !== this.initial;
  }
  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }
  private commit(elements: DrawingElement[]): void {
    const result = drawingSceneSchema.safeParse({ ...this.scene, elements });

    if (!result.success)
      throw new Error('Drawing limit reached. Remove an element or shorten the stroke.');
    if (JSON.stringify(result.data) === JSON.stringify(this.scene)) return;
    this.past = [...this.past.slice(-49), this.scene];
    this.future = [];
    this.scene = result.data;
  }
  add(element: DrawingElement): void {
    this.commit([...this.scene.elements, element]);
    this.selectedId = element.id;
  }
  replace(element: DrawingElement): void {
    this.commit(
      this.scene.elements.map((current) => (current.id === element.id ? element : current))
    );
  }
  recolor(color: string): void {
    this.commit(
      this.scene.elements.map((element) =>
        element.id === this.selectedId ? { ...element, color } : element
      )
    );
  }
  move(x: number, y: number): void {
    this.commit(
      this.scene.elements.map((element) =>
        element.id === this.selectedId ? moveElement(element, x, y) : element
      )
    );
  }
  delete(): void {
    this.commit(this.scene.elements.filter((element) => element.id !== this.selectedId));
    this.selectedId = undefined;
  }
  cycle(delta: number): void {
    const elements = this.scene.elements,
      index = elements.findIndex((element) => element.id === this.selectedId);

    this.selectedId =
      elements.length === 0
        ? undefined
        : elements[(index + delta + elements.length) % elements.length]?.id;
  }
  undo(): void {
    const previous = this.past.pop();

    if (previous === undefined) return;
    this.future.push(this.scene);
    this.scene = previous;
    this.reconcileSelection();
  }
  redo(): void {
    const next = this.future.pop();

    if (next === undefined) return;
    this.past.push(this.scene);
    this.scene = next;
    this.reconcileSelection();
  }
  private reconcileSelection(): void {
    if (!this.scene.elements.some((element) => element.id === this.selectedId))
      this.selectedId = undefined;
  }
}
