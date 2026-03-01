import { isAxiosError } from 'axios';

const SHOULD_NOT_RETRY_STATUSES = new Set([401, 403, 404]);

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (
    isAxiosError(error) &&
    error.response &&
    SHOULD_NOT_RETRY_STATUSES.has(error.response.status)
  ) {
    return false;
  }
  return failureCount < 1;
}
