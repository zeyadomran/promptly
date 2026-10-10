import type { ReactNode } from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import { DrawingContext } from './drawing-context';
import { encodeDrawing } from './drawing-png';
import { DrawingSession } from './drawing-session';
import { DrawingEditor } from './DrawingEditor';

export function DrawingProvider({ children }: { children: ReactNode }) {
  const [session] = useState(
    () => new DrawingSession(window.promptly, encodeDrawing, (message) => toast.warning(message))
  );
  const state = useSyncExternalStore(session.subscribe, session.snapshot);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    session.start();
    const stop = window.promptly.subscribeChanges((event) => {
      if (event.cause === 'clear') session.retire();
    });

    return () => {
      stop();
      session.close();
    };
  }, [session]);
  return (
    <DrawingContext
      value={{
        isOpen: state.isOpen,
        open: (options) => {
          if (!session.snapshot().isOpen)
            opener.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          return session.open(options);
        }
      }}
    >
      {children}
      <DrawingEditor session={session} state={state} opener={opener} />
    </DrawingContext>
  );
}
