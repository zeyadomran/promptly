import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';

interface FoundationScreenProps {
  platform: DesktopBridge['platform'];
}

export function FoundationScreen({ platform }: FoundationScreenProps) {
  const platformName =
    platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'this platform';

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <section className="max-w-sm space-y-4" aria-labelledby="app-title">
        <p className="text-xs font-semibold tracking-widest text-zinc-500">
          YOUR LOCAL TEXT LIBRARY
        </p>
        <h1 id="app-title" className="text-3xl font-semibold tracking-tight">
          Promptly
        </h1>
        <p className="text-sm leading-relaxed text-zinc-600">
          A place for the text you want to use again.
        </p>
        <p className="border-t border-zinc-200 pt-4 text-sm text-zinc-500" role="status">
          Promptly is ready on {platformName}. Capture and your snippet library are coming next.
        </p>
      </section>
    </main>
  );
}
