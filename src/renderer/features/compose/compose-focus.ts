import type { WorkflowSaveOutcome } from '../../../shared/contracts/workflow-save';

export function focusComposeElement(element: HTMLElement | null | undefined): boolean {
  if (
    element?.isConnected !== true ||
    element.closest('[hidden],[inert]') !== null ||
    element.getClientRects().length === 0
  )
    return false;
  element.focus({ preventScroll: true });
  return document.activeElement === element;
}

export function restoreComposeFocus(
  saved?: WorkflowSaveOutcome,
  opener?: HTMLElement | null
): void {
  if (saved?.returned === 'returned') return;
  const row =
    saved === undefined
      ? null
      : document.getElementById(
          `${saved.destination === 'library' ? 'snippet' : 'queue'}-${saved.id}`
        );

  // Collections focus their listbox and expose the selected row through aria-activedescendant.
  if (row !== null && focusComposeElement(row.closest<HTMLElement>('[role="listbox"]'))) return;
  if (focusComposeElement(document.querySelector<HTMLElement>('[data-promptly-search]'))) return;
  if (focusComposeElement(opener)) return;
  for (const list of document.querySelectorAll<HTMLElement>('[role="listbox"]'))
    if (focusComposeElement(list)) return;
  focusComposeElement(document.querySelector<HTMLElement>('[data-drawing-fallback]'));
}
