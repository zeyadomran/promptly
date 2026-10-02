import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';
import { Logo } from '../../components/shared/Logo';

interface FoundationScreenProps {
  platform: DesktopBridge['platform'];
}

export function FoundationScreen({ platform }: FoundationScreenProps) {
  const platformName = platform === 'win32' ? 'Windows' : 'this platform';

  return (
    <main className="flex h-full items-center justify-center p-8">
      <section className="flex max-w-sm flex-col gap-4" aria-labelledby="app-title">
        <Logo />
        <p className="text-xs font-semibold tracking-widest text-muted-foreground">
          YOUR LOCAL TEXT LIBRARY
        </p>
        <h1 id="app-title" className="text-3xl font-semibold tracking-tight">
          Promptly
        </h1>
        <p className="text-sm leading-relaxed text-foreground-2">
          A place for the text you want to use again.
        </p>
        <p className="border-t pt-4 text-sm text-muted-foreground" role="status">
          Promptly is ready on {platformName}. Capture and your snippet library are coming next.
        </p>
      </section>
    </main>
  );
}
