import { AxiosError } from 'axios';
import { ApiResponse } from '@/types';

// Pulls the most useful error message out of an axios error coming back
// from our backend. The backend speaks one of two shapes:
//   - { success: false, message: '...' }
//   - { success: false, message: 'Validation failed', errors: [...] }
// Anything else (network failure, CORS, etc.) falls back to a generic string.
export const getApiErrorMessage = (
  error: unknown,
  fallback = 'Etwas ist schiefgelaufen'
): string => {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiResponse<unknown>>;
    const payload = axiosError.response?.data;
    if (payload?.errors && payload.errors.length > 0) {
      return payload.errors.map((e) => e.message).join(', ');
    }
    if (payload?.message) return payload.message;
    if (axiosError.message) return axiosError.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const getApiErrorStatus = (error: unknown): number | undefined => {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    return (error as AxiosError).response?.status;
  }
  return undefined;
};
