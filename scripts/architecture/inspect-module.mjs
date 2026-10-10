import path from 'node:path';

import { parseSync } from 'oxc-parser';

import { componentNames, walk } from './ast.mjs';

const rendererPackages = new Set([
  'react',
  'react-markdown',
  'remark-gfm',
  'react-dom',
  'react-dom/client',
  'radix-ui',
  'cmdk',
  'lucide-react',
  'class-variance-authority',
  'clsx',
  'tailwind-merge',
  'sonner',
  'get-nonce'
]);
const testPackages = new Set(['vitest', 'vite']);
const browserGlobals = new Set([
  'require',
  'process',
  'Buffer',
  'global',
  '__dirname',
  '__filename'
]);

export function inspectModule(filename, source, root) {
  const errors = [];
  const relative = path.relative(root, filename).replaceAll('\\', '/');
  const layer = relative.match(/^src\/(main|preload|renderer|shared)\//)?.[1];
  const isTest = /\.test\.[cm]?[jt]sx?$/.test(filename);
  const result = parseSync(filename, source);

  errors.push(...result.errors.map((error) => error.message));
  if (source.split(/\r?\n/).length > 200)
    errors.push('Module exceeds 200 lines; extract focused modules.');
  if (!filename.endsWith('.d.ts') && componentNames(result.program).length > 1) {
    errors.push('Each React component needs its own implementation file.');
  }

  function checkImport(specifier) {
    if (!['renderer', 'shared', 'preload', 'main'].includes(layer)) return;
    if (typeof specifier !== 'string') {
      errors.push('Computed imports are forbidden in application modules.');
      return;
    }

    if (specifier.startsWith('.') || specifier.startsWith('@/')) {
      const target = path
        .relative(
          root,
          specifier.startsWith('@/')
            ? path.resolve(root, 'src/renderer', specifier.slice(2))
            : path.resolve(path.dirname(filename), specifier)
        )
        .replaceAll('\\', '/');
      const targetLayer = target.match(/^src\/(main|preload|renderer|shared)\//)?.[1];
      const allowed = layer === 'shared' ? ['shared'] : [layer, 'shared'];

      if (
        isTest &&
        relative === 'src/main/snippets/tag-picker.test.ts' &&
        target === 'src/renderer/features/tags/tag-picker-controller'
      )
        return;

      if (!allowed.includes(targetLayer)) errors.push(`Forbidden ${layer} import: ${specifier}`);
      if (/\.(?:[cm]?js|node|json)$/.test(target))
        errors.push(`Unscanned source import: ${specifier}`);
      return;
    }

    if (layer === 'main') {
      if (relative === 'src/main/platform/windows/foreground-grant.ts' && specifier === 'koffi')
        return;
      if (
        relative === 'src/main/lifecycle/application-startup.ts' &&
        specifier === 'electron-squirrel-startup'
      )
        return;
      if (isTest && testPackages.has(specifier)) return;
      if (!specifier.startsWith('node:') && specifier !== 'electron')
        errors.push(`Unapproved main dependency: ${specifier}`);
      return;
    }

    if (layer === 'preload' && specifier === 'electron') return;
    if (isTest && testPackages.has(specifier)) return;
    if (layer === 'shared' && specifier === 'zod') return;
    if (
      layer === 'renderer' &&
      (rendererPackages.has(specifier) || (isTest && testPackages.has(specifier)))
    )
      return;
    errors.push(`Forbidden ${layer} dependency: ${specifier}`);
  }

  walk(result.program, (node) => {
    if (
      ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) &&
      node.source
    ) {
      checkImport(node.source.value);
    }

    if (node.type === 'TSImportType') checkImport(node.source?.value);
    if (node.type === 'TSExternalModuleReference') checkImport(node.expression?.value);
    if (node.type === 'ImportExpression') checkImport(node.source?.value);
    if (
      !filename.endsWith('.d.ts') &&
      ['renderer', 'shared'].includes(layer) &&
      node.type === 'Identifier' &&
      browserGlobals.has(node.name)
    ) {
      errors.push(`Node global is forbidden in ${layer}: ${node.name}`);
    }

    if (layer && node.type === 'CallExpression' && node.callee?.name === 'require') {
      errors.push('Use static imports; CommonJS require is forbidden in source.');
    }

    if (
      layer &&
      ['CallExpression', 'NewExpression'].includes(node.type) &&
      ['eval', 'Function'].includes(node.callee?.name)
    ) {
      errors.push('Runtime code generation is forbidden in application modules.');
    }
  });

  return [...new Set(errors)].map((error) => `${relative}: ${error}`);
}
