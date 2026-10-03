import type { CaptureToast } from '../../shared/contracts/capture-toast';
import type { CaptureEvent } from '../capture/ports';
import type { ToastRectangle } from './ports';

export function validToastRectangle(rectangle: ToastRectangle): boolean {
  return (
    Object.values(rectangle).every(Number.isFinite) && rectangle.width > 0 && rectangle.height > 0
  );
}

function preview(text: string): string {
  let line = text.split(/[\r\n]/u, 1)[0]?.slice(0, 512) ?? '';

  if (line.length === 512 && /[\uD800-\uDBFF]$/u.test(line)) line = line.slice(0, -1);
  return line;
}

export function captureNotification(event: CaptureEvent):
  | {
      status: CaptureToast['status'];
      preview: string;
      source: ToastRectangle | undefined;
    }
  | undefined {
  const source =
    event.sourceBounds !== undefined && validToastRectangle(event.sourceBounds)
      ? { ...event.sourceBounds }
      : undefined;

  if (event.status === 'failed') {
    if (event.reason === 'CONFLICT' || event.reason === undefined || event.message === undefined)
      return undefined;
    return { status: 'failed', preview: preview(event.message), source };
  }

  if (event.status === 'empty' || event.preview === undefined || source === undefined)
    return undefined;
  return { status: event.status, preview: preview(event.preview.text), source };
}
