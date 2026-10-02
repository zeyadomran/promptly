import { z } from 'zod';

import { idSchema, snippetTextSchema, tagSchema } from '../domain';

export const backupLimits = {
  bytes: 64 * 1024 * 1024,
  snippets: 20_000,
  tags: 4000,
  memberships: 200_000,
  textUnits: 16_000_000
} as const;
const date = z.iso.datetime({ precision: 3 }).refine((value) => {
  const milliseconds = Date.parse(value);

  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
});

export const portableSnippetSchema = z.strictObject({
  id: idSchema,
  text: snippetTextSchema,
  createdAt: date,
  updatedAt: date,
  lastCopiedAt: date.nullable(),
  copyCount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
});
export const backupSchema = z
  .strictObject({
    format: z.literal('promptly-library'),
    version: z.literal(1),
    snippets: z.array(portableSnippetSchema).max(backupLimits.snippets),
    tags: z
      .array(
        tagSchema.extend({
          createdAt: date,
          name: tagSchema.shape.name.refine(
            (name) => !/[\uD800-\uDFFF]/u.test(name),
            'Tag names must contain well-formed Unicode.'
          )
        })
      )
      .max(backupLimits.tags),
    memberships: z
      .array(z.strictObject({ snippetId: idSchema, tagId: idSchema }))
      .max(backupLimits.memberships)
  })
  .superRefine((backup, context) => {
    const snippets = new Set(backup.snippets.map((snippet) => snippet.id));
    const tags = new Set(backup.tags.map((tag) => tag.id));
    const memberships = new Set<string>();
    const counts = new Map<string, number>();
    const invalid = (message: string) => {
      context.addIssue({ code: 'custom', message });
    };

    if (snippets.size !== backup.snippets.length || tags.size !== backup.tags.length)
      invalid('Record IDs must be unique within each collection.');
    if (
      backup.snippets.reduce((total, snippet) => total + snippet.text.length, 0) >
      backupLimits.textUnits
    )
      invalid('Library text exceeds the portable limit.');
    for (const association of backup.memberships) {
      const key = `${association.snippetId}:${association.tagId}`;
      const count = (counts.get(association.snippetId) ?? 0) + 1;

      if (!snippets.has(association.snippetId) || !tags.has(association.tagId))
        invalid('Membership refers to a missing record.');
      if (memberships.has(key)) invalid('Duplicate membership.');
      if (count > 100) invalid('A snippet has too many tags.');
      memberships.add(key);
      counts.set(association.snippetId, count);
    }
  });

export type PortableBackup = z.infer<typeof backupSchema>;
