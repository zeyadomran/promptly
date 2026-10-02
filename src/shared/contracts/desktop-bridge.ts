/** Read-only bootstrap information. Domain commands belong to P02. */
export interface DesktopBridge {
  readonly platform: 'darwin' | 'win32' | 'unsupported';
}
