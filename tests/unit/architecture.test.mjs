import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { inspectModule } from '../../scripts/architecture/inspect-module.mjs';

const root = process.cwd();
const inspect = (layer, source) =>
  inspectModule(path.join(root, 'src', layer, 'fixture.tsx'), source, root);

describe('process boundaries', () => {
  it.each([
    "import fs from 'node:fs';",
    "export * from '../main/storage';",
    "void import('../preload/preload');",
    'void import(variable);',
    "import electron from 'electron';",
    "import sql from 'better-sqlite3';",
    "import adapter from '@native/capture';",
    "const x = require('fs');",
    'console.log(process.env);',
    "export * from './hidden.js';"
  ])('rejects renderer escape: %s', (source) => {
    expect(inspect('renderer', source).length).toBeGreaterThan(0);
  });
  it.each([
    "export * from '../main/storage';",
    "import fs from 'node:fs';",
    "export * from 'react';"
  ])('blocks transitive escape through shared: %s', (source) =>
    expect(inspect('shared', source).length).toBeGreaterThan(0)
  );
  it('allows the renderer to consume pure shared contracts and React', () => {
    expect(
      inspect(
        'renderer',
        "import type { X } from '../shared/contracts/x'; import { memo } from 'react';"
      )
    ).toEqual([]);
  });
});

describe('component ownership', () => {
  it('rejects two components, including a wrapped component', () => {
    expect(
      inspect(
        'renderer',
        'function First() { return <div />; } const Second = memo(() => <span />);'
      )
    ).toEqual([expect.stringContaining('own implementation file')]);
  });
  it('allows an explicit re-export entrypoint', () => {
    expect(
      inspect('renderer', "export { First } from './First'; export { Second } from './Second';")
    ).toEqual([]);
  });
  it.each([
    'const First = () => null; const Second = forwardRef(() => null);',
    'const First = () => null; export default () => <span />;',
    'const First = () => null; const Second = (() => <span />) as Component;'
  ])('rejects wrapped or anonymous second component: %s', (source) => {
    expect(inspect('renderer', source)).toEqual([
      expect.stringContaining('own implementation file')
    ]);
  });
  it('flags modules requiring extraction', () => {
    expect(inspect('shared', '\n'.repeat(201))).toEqual([expect.stringContaining('200 lines')]);
  });
});
