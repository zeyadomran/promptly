export interface ShortcutCommands {
  capture: () => void;
  open: () => void;
  pin: () => void;
  compose: () => void;
  captureAvailable: () => boolean;
}
