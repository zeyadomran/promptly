import { createElement, hitElement, moveElement } from './drawing-elements';
import type { DrawingState } from './drawing-state';
import type { DrawingElement, DrawingPoint } from './drawing-types';

export interface DrawingGesture {
  start: DrawingPoint;
  original: DrawingElement;
  preview: DrawingElement;
  kind: 'new' | 'move';
  invalid: boolean;
}
export function beginGesture(state: DrawingState, point: DrawingPoint): DrawingGesture | undefined {
  const scene = state.scene;

  if (scene === undefined || state.tool === 'text') return;
  const original =
    state.tool === 'select'
      ? scene.elements.find((element) => element.id === hitElement(scene, point))
      : createElement(state.tool, point, state.color, scene);

  if (original === undefined) return;
  const preview =
    state.tool === 'pen'
      ? { ...original, type: 'stroke' as const, points: [point, point] }
      : original.type === 'arrow' || original.type === 'rectangle'
        ? { ...original, to: point }
        : original;

  return {
    start: point,
    original,
    preview: state.tool === 'select' ? original : preview,
    kind: state.tool === 'select' ? 'move' : 'new',
    invalid: false
  };
}

export function moveGesture(gesture: DrawingGesture, point: DrawingPoint): DrawingGesture {
  const element = gesture.preview;

  if (gesture.kind === 'move')
    return {
      ...gesture,
      preview: moveElement(gesture.original, point.x - gesture.start.x, point.y - gesture.start.y)
    };
  if (element.type === 'stroke') {
    if (element.points.length >= 5000) return { ...gesture, invalid: true };
    return { ...gesture, preview: { ...element, points: [...element.points, point] } };
  }

  if (element.type === 'arrow' || element.type === 'rectangle')
    return { ...gesture, preview: { ...element, to: point } };
  return gesture;
}
