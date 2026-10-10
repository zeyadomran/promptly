import type { ChangeEvent } from './domain';
import type { DesktopOperations } from './operations';
import type { UpdateState } from './updates';
import type { NativeShellView, ShellCommand } from './window';

export interface DesktopBridge extends Omit<DesktopOperations, 'addDroppedAttachments'> {
  addDroppedAttachments(request: {
    draftToken: string;
    files: File[];
  }): ReturnType<DesktopOperations['addDroppedAttachments']>;
  readonly platform: 'win32' | 'unsupported';
  subscribeChanges(listener: (event: ChangeEvent) => void): () => void;
  subscribeShellNavigation(listener: (view: NativeShellView) => void): () => void;
  subscribeShellCommands(listener: (command: ShellCommand) => void): () => void;
  subscribeWindowFocus(listener: () => void): () => void;
  subscribePreviousApp(listener: () => void): () => void;
  subscribeUpdates(listener: (state: UpdateState) => void): () => void;
}
