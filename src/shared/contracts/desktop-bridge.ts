import type { ChangeEvent } from './domain';
import type { DesktopOperations } from './operations';

export interface DesktopBridge extends DesktopOperations {
  readonly platform: 'win32' | 'unsupported';
  subscribeChanges(listener: (event: ChangeEvent) => void): () => void;
  subscribeWindowFocus(listener: () => void): () => void;
}
