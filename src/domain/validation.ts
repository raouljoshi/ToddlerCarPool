import type {
  BorrowFlags,
  Child,
  Direction,
  DirectionMeta,
  RoomSettings,
  TimeReference,
  Vehicle,
} from "./types";
import { DIRECTIONS, EMPTY_BORROWS, ROOM_LIMITS } from "./types";
import { err, ok, type Result } from "./result";

export const directions: Direction[] = DIRECTIONS;

const nameMax = 60;
const labelMax = 80;
const infoMax = 800;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function cleanText(value: unknown, maxLength = labelMax): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanLongText(value: unknown): string | undefined {
  const text = cleanText(value, infoMax);
  return text.length > 0 ? text : undefined;
}

function cleanTime(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return timeRegex.test(trimmed) ? trimmed : undefined;
}

function cleanTimeReference(value: unknown): TimeReference | undefined {
  if (value === "departure" || value === "arrival") return value;
  return undefined;
}

function cleanUrlLike(value: unknown): string | undefined {
  const text = cleanText(value, 500);
  if (!text) return undefined;
  if (!/^https?:\/\//i.test(text)) return text;
  try {
    return new URL(text).toString();
  } catch {
    return text;
  }
}

function normalizeDirectionMeta(input: Partial<DirectionMeta> | undefined, defaultEnabled: boolean): DirectionMeta {
  const enabled = input?.enabled ?? defaultEnabled;
  if (!enabled) {
    return { enabled: false };
  }
  return {
    enabled: true,
    time: cleanTime(input?.time),
    timeReference: cleanTimeReference(input?.timeReference),
    info: cleanLongText(input?.info),
  };
}

export function validateSettings(input: Partial<RoomSettings>): Result<RoomSettings> {
  const outbound = normalizeDirectionMeta(input.outbound, true);
  const inbound = normalizeDirectionMeta(input.inbound, true);
  if (!outbound.enabled && !inbound.enabled) {
    return err("VALIDATION_ERROR", "At least one direction must be enabled.", "directions");
  }
  return ok({
    label: cleanText(input.label, labelMax) || "Carpool event",
    staticInfo: cleanLongText(input.staticInfo),
    mapLink: cleanUrlLike(input.mapLink),
    outbound,
    inbound,
  });
}

export interface VehicleInput {
  driverName: string;
  seatCount: number;
  directions: Direction[];
  lendsBooster: boolean;
  lendsRearFacing: boolean;
  lendsFrontFacing: boolean;
  reservedRiders: ReservedRiderInput[];
}

export interface ReservedRiderInput {
  seatIndex: number;
  name: string;
}

export interface VehicleNormalized {
  driverName: string;
  seatCount: number;
  directions: Direction[];
  lendsBooster: boolean;
  lendsRearFacing: boolean;
  lendsFrontFacing: boolean;
  reservedRiders: { seatIndex: number; name: string }[];
}

function normalizeDirections(values: unknown, enabled: Direction[]): Direction[] {
  if (!Array.isArray(values)) return [];
  return enabled.filter((d) => values.includes(d));
}

export function validateVehicleInput(
  input: VehicleInput,
  enabledDirections: Direction[],
  existing: Vehicle[],
): Result<VehicleNormalized> {
  const driverName = cleanText(input.driverName, nameMax);
  if (!driverName) return err("VALIDATION_ERROR", "Driver name is required.", "driverName");

  const seatCount = Math.floor(Number(input.seatCount));
  if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > ROOM_LIMITS.seatsPerVehicle) {
    return err(
      "VALIDATION_ERROR",
      `Seat count must be between 1 and ${ROOM_LIMITS.seatsPerVehicle}.`,
      "seatCount",
    );
  }

  const directions = normalizeDirections(input.directions, enabledDirections);
  if (directions.length === 0) {
    return err("VALIDATION_ERROR", "Pick at least one direction the vehicle serves.", "directions");
  }

  const reservedRiders: { seatIndex: number; name: string }[] = [];
  const seenIndexes = new Set<number>();
  for (const rider of input.reservedRiders ?? []) {
    const idx = Math.floor(Number(rider.seatIndex));
    if (!Number.isInteger(idx) || idx < 0 || idx >= seatCount) {
      return err("VALIDATION_ERROR", "Reserved seat index out of range.", "reservedRiders");
    }
    if (seenIndexes.has(idx)) {
      return err("VALIDATION_ERROR", "A seat is reserved twice.", "reservedRiders");
    }
    seenIndexes.add(idx);
    const name = cleanText(rider.name, nameMax);
    if (!name) {
      return err("VALIDATION_ERROR", "Each reserved seat needs a rider name.", "reservedRiders");
    }
    reservedRiders.push({ seatIndex: idx, name });
  }

  if (existing.length + 1 > ROOM_LIMITS.vehicles) {
    return err("LIMIT_EXCEEDED", "This room has reached the vehicle limit.");
  }

  return ok({
    driverName,
    seatCount,
    directions,
    lendsBooster: Boolean(input.lendsBooster),
    lendsRearFacing: Boolean(input.lendsRearFacing),
    lendsFrontFacing: Boolean(input.lendsFrontFacing),
    reservedRiders,
  });
}

export function validateVehicleUpdate(
  input: Partial<VehicleInput>,
  existing: Vehicle,
  enabledDirections: Direction[],
): Result<Pick<VehicleNormalized, "driverName" | "directions" | "lendsBooster" | "lendsRearFacing" | "lendsFrontFacing">> {
  const driverName = cleanText(input.driverName ?? existing.driverName, nameMax);
  if (!driverName) return err("VALIDATION_ERROR", "Driver name is required.", "driverName");

  const directions = normalizeDirections(input.directions ?? existing.directions, enabledDirections);
  if (directions.length === 0) {
    return err("VALIDATION_ERROR", "Pick at least one direction the vehicle serves.", "directions");
  }

  return ok({
    driverName,
    directions,
    lendsBooster: input.lendsBooster ?? existing.lendsBooster,
    lendsRearFacing: input.lendsRearFacing ?? existing.lendsRearFacing,
    lendsFrontFacing: input.lendsFrontFacing ?? existing.lendsFrontFacing,
  });
}

export interface ChildInput {
  name: string;
  directions: Direction[];
  borrows: Partial<BorrowFlags>;
}

export interface ChildNormalized {
  name: string;
  directions: Direction[];
  borrows: BorrowFlags;
}

function normalizeBorrows(input: Partial<BorrowFlags> | undefined): BorrowFlags {
  return {
    booster: Boolean(input?.booster),
    rearFacing: Boolean(input?.rearFacing),
    frontFacing: Boolean(input?.frontFacing),
  };
}

export function validateChildInput(
  input: ChildInput,
  enabledDirections: Direction[],
  existing: Child[],
): Result<ChildNormalized> {
  const name = cleanText(input.name, nameMax);
  if (!name) return err("VALIDATION_ERROR", "Child name is required.", "name");

  const directions = normalizeDirections(input.directions, enabledDirections);
  if (directions.length === 0) {
    return err("VALIDATION_ERROR", "Pick at least one direction the child needs.", "directions");
  }

  if (existing.length + 1 > ROOM_LIMITS.children) {
    return err("LIMIT_EXCEEDED", "This room has reached the child limit.");
  }

  return ok({
    name,
    directions,
    borrows: normalizeBorrows(input.borrows),
  });
}

export function validateChildUpdate(
  input: Partial<ChildInput>,
  existing: Child,
  enabledDirections: Direction[],
): Result<ChildNormalized> {
  const name = cleanText(input.name ?? existing.name, nameMax);
  if (!name) return err("VALIDATION_ERROR", "Child name is required.", "name");

  const directions = normalizeDirections(input.directions ?? existing.directions, enabledDirections);
  if (directions.length === 0) {
    return err("VALIDATION_ERROR", "Pick at least one direction the child needs.", "directions");
  }

  return ok({
    name,
    directions,
    borrows: input.borrows ? normalizeBorrows(input.borrows) : existing.borrows,
  });
}

export function makeReservedChildBorrows(): BorrowFlags {
  return { ...EMPTY_BORROWS };
}
