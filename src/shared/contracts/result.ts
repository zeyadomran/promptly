import { z } from 'zod';

export const desktopErrorSchema = z.strictObject({
  code: z.enum([
    'INVALID_REQUEST',
    'UNAUTHORIZED',
    'NOT_FOUND',
    'CONFLICT',
    'UNAVAILABLE',
    'TEMPLATE_REQUIRES_PREPARATION',
    'PREPARATION_EXPIRED',
    'INTERNAL'
  ]),
  message: z.string().min(1).max(256)
});
export type DesktopError = z.infer<typeof desktopErrorSchema>;
export type DesktopResult<T> = { ok: true; value: T } | { ok: false; error: DesktopError };

export function resultSchema<T>(value: z.ZodType<T>) {
  return z.discriminatedUnion('ok', [
    z.strictObject({ ok: z.literal(true), value }),
    z.strictObject({ ok: z.literal(false), error: desktopErrorSchema })
  ]);
}

export function failure(code: DesktopError['code'], message: string): DesktopResult<never> {
  return { ok: false, error: { code, message } };
}
