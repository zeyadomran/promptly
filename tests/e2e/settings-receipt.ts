import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { TestInfo } from '@playwright/test';

/** List-reporter attachments must also exist under the CI-uploaded output directory. */
export async function writeSettingsReceipt(info: TestInfo, name: string, body: string | Buffer) {
  const filename = info.outputPath(`${name}.json`);

  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, body);
  await info.attach(name, { path: filename, contentType: 'application/json' });
}
