import { failure } from '../../shared/contracts/result';

const messages: Record<string, string> = {
  unsupported:
    'This focused control does not expose a supported native text selection. No snippet was saved.',
  permissionDenied: 'This app’s selected text cannot be accessed. No snippet was saved.',
  secureInput: 'Protected text cannot be captured. No snippet was saved.',
  foregroundChanged:
    'The selected app or control changed before capture finished. No snippet was saved.',
  timedOut: 'Native selection capture timed out. No snippet was saved.',
  selectionTooLarge: 'The selected text is too large to capture. No snippet was saved.'
};

export function nativeCaptureFailure(status: string) {
  return failure(
    'UNAVAILABLE',
    messages[status] ?? 'Native selection capture is unavailable. No snippet was saved.'
  );
}
