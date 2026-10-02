import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { test } from '@playwright/test';

/** Callers supply only fixed fixture labels, numeric timing/integrity and statuses. */
export async function saveNativeReceipt(name: string, receipt: object): Promise<void> {
  const json = JSON.stringify(receipt);
  const output = test.info().outputPath(`${name}.json`);

  console.log(json);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, json, 'utf8');
  await test.info().attach(name, { path: output, contentType: 'application/json' });
}
