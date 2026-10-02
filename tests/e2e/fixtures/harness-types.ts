export interface IpcHarness {
  subscriberCount(): number;
  openUntrusted(): Promise<void>;
  rejectChildFrame(): boolean;
}

export interface HarnessGlobal {
  p02Harness: IpcHarness;
}

declare global {
  interface Window {
    fixtureEvents: number[];
    fixtureStop: () => void;
  }
}
