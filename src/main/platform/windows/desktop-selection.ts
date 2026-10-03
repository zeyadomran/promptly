import { observeSelectionStartup, selectionLaunchOptions } from '../native/selection-options';
import { createWindowsSelection } from './windows-selection';

export function startWindowsSelection() {
  const selection = createWindowsSelection(selectionLaunchOptions());

  observeSelectionStartup(selection.ready(), 'Windows');
  return selection;
}
