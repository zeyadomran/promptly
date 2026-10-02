import type {
  DesktopOperations,
  OperationName,
  OperationRequest,
  OperationResponse
} from '../../shared/contracts/operations';
import { operations } from '../../shared/contracts/operations';
import type { DesktopResult } from '../../shared/contracts/result';
import { failure, resultSchema } from '../../shared/contracts/result';

export async function dispatchOperation<K extends OperationName>(
  services: Partial<DesktopOperations>,
  authorized: boolean,
  name: K,
  input: unknown,
  context?: { senderId: number }
): Promise<DesktopResult<OperationResponse<K>>> {
  if (!authorized) return failure('UNAUTHORIZED', 'This window cannot access desktop operations.');
  const schema = operations[name];
  const request = schema.request.safeParse(input);

  if (!request.success) return failure('INVALID_REQUEST', 'The desktop request is malformed.');
  const handler = services[name] as
    | ((
        value: OperationRequest<K>,
        context?: { senderId: number }
      ) => Promise<DesktopResult<OperationResponse<K>>>)
    | undefined;

  if (handler === undefined)
    return failure('UNAVAILABLE', 'This desktop operation is not available yet.');
  try {
    const response: unknown = await handler(request.data as OperationRequest<K>, context);
    const parsed = resultSchema<unknown>(schema.response).safeParse(response);

    if (!parsed.success)
      return failure('INTERNAL', 'The desktop service returned an invalid response.');
    return parsed.data as DesktopResult<OperationResponse<K>>;
  } catch {
    // Never transport exception messages, SQL, paths, or stacks across the privilege boundary.
    return failure('INTERNAL', 'The desktop operation failed.');
  }
}
