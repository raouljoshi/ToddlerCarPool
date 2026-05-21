export type ErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_EXPIRED"
  | "VALIDATION_ERROR"
  | "VEHICLE_NOT_FOUND"
  | "CHILD_NOT_FOUND"
  | "SEAT_NOT_FOUND"
  | "SEAT_ALREADY_ASSIGNED"
  | "INCOMPATIBLE_ACCESSORY"
  | "DIRECTION_NOT_NEEDED_OR_OFFERED"
  | "VEHICLE_HAS_ASSIGNMENTS"
  | "CHILD_HAS_ASSIGNMENTS"
  | "LIMIT_EXCEEDED";

export interface AppError {
  code: ErrorCode;
  message: string;
  field?: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err(code: ErrorCode, message: string, field?: string): Result<never> {
  return { ok: false, error: { code, message, field } };
}
