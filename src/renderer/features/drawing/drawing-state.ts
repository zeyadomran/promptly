import type { DrawingScene } from '../../../shared/contracts/drawing';
import type { DrawingPoint, DrawingRaster, DrawingTool } from './drawing-types';

export interface DrawingState {
  isOpen: boolean;
  scene: DrawingScene | undefined;
  background: DrawingRaster | undefined;
  tool: DrawingTool;
  color: string;
  selectedId: string | undefined;
  textAt: DrawingPoint | undefined;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  confirm: boolean;
  pending: 'load' | 'save' | 'copy' | 'export' | undefined;
  error: string | undefined;
  announcement: string;
  saveTarget: 'prompt' | 'snippet';
}
export const initialDrawingState = (): DrawingState => ({
  isOpen: false,
  scene: undefined,
  background: undefined,
  tool: 'pen',
  color: '#18181b',
  selectedId: undefined,
  textAt: undefined,
  dirty: false,
  canUndo: false,
  canRedo: false,
  confirm: false,
  pending: undefined,
  error: undefined,
  announcement: '',
  saveTarget: 'prompt'
});
