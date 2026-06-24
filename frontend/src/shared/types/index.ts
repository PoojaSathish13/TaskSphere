export interface ApiError {
  code: string;
  message: string;
  field: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  meta: Record<string, unknown> | null;
  errors: ApiError[] | null;
}
