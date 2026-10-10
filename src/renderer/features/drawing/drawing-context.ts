import { createContext } from 'react';

import type { DrawingOpenOptions } from './drawing-types';

export interface DrawingContextValue {
  isOpen: boolean;
  open(options: DrawingOpenOptions): Promise<void>;
}
export const DrawingContext = createContext<DrawingContextValue | undefined>(undefined);
