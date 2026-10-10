import { useContext } from 'react';

import { DrawingContext } from './drawing-context';

export function useDrawing() {
  const drawing = useContext(DrawingContext);

  if (drawing === undefined) throw new Error('Drawing provider is missing.');
  return drawing;
}
