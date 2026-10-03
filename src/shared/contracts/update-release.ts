import { z } from 'zod';

export const releaseSchema = z.object({
  tag_name: z
    .string()
    .regex(/^v\d+\.\d+\.\d+$/)
    .max(64),
  draft: z.boolean(),
  prerelease: z.boolean(),
  assets: z
    .array(
      z.object({
        name: z.string(),
        browser_download_url: z.string(),
        size: z.number().int().nonnegative()
      })
    )
    .max(100)
});
