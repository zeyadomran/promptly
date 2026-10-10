import type { DrawingScene } from '../../../shared/contracts/drawing';
import { elementBounds } from './drawing-elements';
import type { DrawingElement } from './drawing-types';

export function renderElement(context: CanvasRenderingContext2D, element: DrawingElement): void {
  context.strokeStyle = element.color;
  context.fillStyle = element.color;
  context.lineWidth = element.width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  if (element.type === 'text') {
    context.font = `${String(element.fontSize)}px system-ui, sans-serif`;
    context.textBaseline = 'top';
    context.fillText(element.text, element.at.x, element.at.y);
    return;
  }

  context.beginPath();
  if (element.type === 'stroke') {
    const first = element.points[0];

    if (first === undefined) return;
    context.moveTo(first.x, first.y);
    for (const point of element.points.slice(1)) context.lineTo(point.x, point.y);
    if (element.points.every((point) => point.x === first.x && point.y === first.y)) {
      context.arc(first.x, first.y, element.width / 2, 0, Math.PI * 2);
      context.fill();
    } else context.stroke();
  } else if (element.type === 'rectangle') {
    context.strokeRect(
      element.from.x,
      element.from.y,
      element.to.x - element.from.x,
      element.to.y - element.from.y
    );
  } else {
    context.moveTo(element.from.x, element.from.y);
    context.lineTo(element.to.x, element.to.y);
    context.stroke();
    const angle = Math.atan2(element.to.y - element.from.y, element.to.x - element.from.x),
      head = Math.max(12, element.width * 3);

    context.beginPath();
    context.moveTo(element.to.x, element.to.y);
    context.lineTo(
      element.to.x - head * Math.cos(angle - Math.PI / 6),
      element.to.y - head * Math.sin(angle - Math.PI / 6)
    );
    context.lineTo(
      element.to.x - head * Math.cos(angle + Math.PI / 6),
      element.to.y - head * Math.sin(angle + Math.PI / 6)
    );
    context.closePath();
    context.fill();
  }
}

export function renderDrawing(
  context: CanvasRenderingContext2D,
  scene: DrawingScene,
  background?: CanvasImageSource,
  selectedId?: string,
  preview?: DrawingElement
): void {
  context.clearRect(0, 0, scene.width, scene.height);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, scene.width, scene.height);
  if (background !== undefined) context.drawImage(background, 0, 0, scene.width, scene.height);
  for (const element of scene.elements)
    renderElement(context, element.id === preview?.id ? preview : element);
  if (preview !== undefined && !scene.elements.some((element) => element.id === preview.id))
    renderElement(context, preview);
  const selected =
    preview?.id === selectedId
      ? preview
      : scene.elements.find((element) => element.id === selectedId);

  if (selected !== undefined) {
    const bounds = elementBounds(selected);

    context.save();
    context.strokeStyle = '#4e80ed';
    context.lineWidth = 2;
    context.setLineDash([6, 4]);
    context.strokeRect(
      bounds.left - 5,
      bounds.top - 5,
      bounds.right - bounds.left + 10,
      bounds.bottom - bounds.top + 10
    );
    context.restore();
  }
}
