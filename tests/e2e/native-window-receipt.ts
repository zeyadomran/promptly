import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { test } from '@playwright/test';

export async function writeWindowReceipt(name: string, receipt: object): Promise<void> {
  const filename = test.info().outputPath(`${name}.json`);

  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, JSON.stringify(receipt, null, 2), 'utf8');
  await test.info().attach(name, { path: filename, contentType: 'application/json' });
}
