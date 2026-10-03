import type { ChangeEvent } from './domain';
import type { DesktopOperations } from './operations';
import type { UpdateState } from './updates';

export interface DesktopBridge extends DesktopOperations {
  readonly platform: 'win32' | 'unsupported';
  subscribeChanges(listener: (event: ChangeEvent) => void): () => void;
  subscribeWindowFocus(listener: () => void): () => void;
  subscribeUpdates(listener: (state: UpdateState) => void): () => void;
}
