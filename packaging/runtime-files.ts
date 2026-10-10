const runtimePackages = ['/node_modules/koffi', '/node_modules/@koromix/koffi-win32-x64'];

/** Vite bundles other dependencies; preserve only these external native runtime trees. */
export function ignoreRuntimeFile(file: string): boolean {
  if (file === '' || file === '/node_modules' || file === '/node_modules/@koromix') return false;
  return !['/.vite', ...runtimePackages].some(
    (directory) => file === directory || file.startsWith(`${directory}/`)
  );
}
