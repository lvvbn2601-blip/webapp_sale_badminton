export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiFailure = {
  success: false;
  error: string;
  details?: unknown;
};

export const ok = <T>(data: T, message?: string): ApiSuccess<T> => ({
  success: true,
  data,
  message,
});
