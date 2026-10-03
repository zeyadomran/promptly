import { useShellNavigation } from '../window-chrome/shell-navigation';
import { WikiWindow } from './WikiWindow';

export function ConnectedWiki() {
  const { showSettings } = useShellNavigation();
  return <WikiWindow onSettings={showSettings} />;
}
