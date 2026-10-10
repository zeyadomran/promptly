import type { DrawingScene } from '../../../shared/contracts/drawing';
import type { DrawingElement, DrawingPoint, DrawingTool } from './drawing-types';

export function createElement(
  tool: Exclude<DrawingTool, 'select'>,
  point: DrawingPoint,
  color: string,
  scene: DrawingScene,
  text = 'Text'
): DrawingElement {
  const base = { id: crypto.randomUUID(), color, width: 4 };
  const to = { x: Math.min(scene.width, point.x + 120), y: Math.min(scene.height, point.y + 80) };

  if (tool === 'text') return { ...base, type: 'text', at: point, text, fontSize: 24 };
  if (tool === 'pen') return { ...base, type: 'stroke', points: [point, to] };
  return { ...base, type: tool, from: point, to };
}

export function elementBounds(element: DrawingElement) {
  const points =
    element.type === 'stroke'
      ? element.points
      : element.type === 'text'
        ? [
            element.at,
            {
              x: element.at.x + element.text.length * element.fontSize * 0.65,
              y: element.at.y + element.fontSize * 1.2
            }
          ]
        : [element.from, element.to];

  return {
    left: Math.min(...points.map((p) => p.x)),
    top: Math.min(...points.map((p) => p.y)),
    right: Math.max(...points.map((p) => p.x)),
    bottom: Math.max(...points.map((p) => p.y))
  };
}

export function hitElement(scene: DrawingScene, point: DrawingPoint): string | undefined {
  return [...scene.elements].reverse().find((element) => {
    const bounds = elementBounds(element),
      pad = Math.max(6, element.width);

    return (
      point.x >= bounds.left - pad &&
      point.x <= bounds.right + pad &&
      point.y >= bounds.top - pad &&
      point.y <= bounds.bottom + pad
    );
  })?.id;
}

export function moveElement(element: DrawingElement, x: number, y: number): DrawingElement {
  const move = (point: DrawingPoint) => ({
    x: Math.max(-4096, Math.min(8192, point.x + x)),
    y: Math.max(-4096, Math.min(8192, point.y + y))
  });

  if (element.type === 'stroke') return { ...element, points: element.points.map(move) };
  if (element.type === 'text') return { ...element, at: move(element.at) };
  return { ...element, from: move(element.from), to: move(element.to) };
}
