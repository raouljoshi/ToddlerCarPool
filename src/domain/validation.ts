import type { Direction, FamilyEntry, RoomSettings, SeatType, TripNotes } from "./types";
import { ROOM_LIMITS } from "./types";
import { err, ok, type Result } from "./result";

export const seatTypes: SeatType[] = ["regular", "booster", "front-facing", "rear-facing"];
export const directions: Direction[] = ["outbound", "inbound"];

const labelMax = 80;
const noteMax = 240;
const infoMax = 800;

export interface FamilyInput {
  displayLabel: string;
  children: Array<{
    label: string;
    directions: Direction[];
    seatType: SeatType;
    note?: string;
  }>;
  seatOffers: Array<{
    label: string;
    directions: Direction[];
    seatType: SeatType;
    note?: string;
  }>;
  notes?: TripNotes;
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function cleanText(value: unknown, maxLength = labelMax): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function cleanNote(value: unknown): string | undefined {
  const text = cleanText(value, noteMax);
  return text.length > 0 ? text : undefined;
}

export function validateSettings(input: Partial<RoomSettings>): Result<RoomSettings> {
  const settings: RoomSettings = {
    label: cleanText(input.label, labelMax) || "Carpool event",
    staticInfo: cleanLongText(input.staticInfo),
    mapLink: cleanUrlLike(input.mapLink),
    outboundEnabled: input.outboundEnabled ?? true,
    outboundLabel: cleanText(input.outboundLabel, labelMax) || "Outbound",
    outboundInfo: cleanLongText(input.outboundInfo),
    inboundEnabled: input.inboundEnabled ?? true,
    inboundLabel: cleanText(input.inboundLabel, labelMax) || "Inbound",
    inboundInfo: cleanLongText(input.inboundInfo),
  };
  if (!settings.outboundEnabled && !settings.inboundEnabled) {
    return err("VALIDATION_ERROR", "At least one direction must be enabled.", "directions");
  }
  return ok(settings);
}

export function validateFamilyInput(input: FamilyInput, existing: FamilyEntry[]): Result<FamilyInput> {
  const displayLabel = cleanText(input.displayLabel);
  if (!displayLabel) return err("VALIDATION_ERROR", "Family display label is required.", "displayLabel");

  const children = input.children.map((child) => ({
    label: cleanText(child.label),
    directions: normalizeDirections(child.directions),
    seatType: child.seatType,
    note: cleanNote(child.note),
  }));

  const seatOffers = input.seatOffers.map((seat) => ({
    label: cleanText(seat.label),
    directions: normalizeDirections(seat.directions),
    seatType: seat.seatType,
    note: cleanNote(seat.note),
  }));

  if (children.some((child) => !child.label || child.directions.length === 0 || !seatTypes.includes(child.seatType))) {
    return err("VALIDATION_ERROR", "Each child needs a label, direction, and seat type.", "children");
  }

  if (seatOffers.some((seat) => !seat.label || seat.directions.length === 0 || !seatTypes.includes(seat.seatType))) {
    return err("VALIDATION_ERROR", "Each offered seat needs a label, direction, and seat type.", "seatOffers");
  }

  const childCount = existing.reduce((sum, family) => sum + family.children.length, 0) + children.length;
  const seatCount = existing.reduce((sum, family) => sum + family.seatOffers.length, 0) + seatOffers.length;

  if (existing.length + 1 > ROOM_LIMITS.families) return err("LIMIT_EXCEEDED", "This room has reached the family limit.");
  if (childCount > ROOM_LIMITS.children) return err("LIMIT_EXCEEDED", "This room has reached the child limit.");
  if (seatCount > ROOM_LIMITS.seats) return err("LIMIT_EXCEEDED", "This room has reached the offered seat limit.");

  return ok({
    displayLabel,
    children,
    seatOffers,
    notes: {
      outbound: cleanNote(input.notes?.outbound),
      inbound: cleanNote(input.notes?.inbound),
    },
  });
}

export function validateFamilyUpdateInput(
  input: FamilyInput,
  existing: FamilyEntry[],
  familyId: string,
): Result<FamilyInput> {
  const otherFamilies = existing.filter((family) => family.id !== familyId);
  return validateFamilyInput(input, otherFamilies);
}

function normalizeDirections(values: Direction[]): Direction[] {
  return directions.filter((direction) => values.includes(direction));
}

function cleanLongText(value: unknown): string | undefined {
  const text = cleanText(value, infoMax);
  return text.length > 0 ? text : undefined;
}

function cleanUrlLike(value: unknown): string | undefined {
  const text = cleanText(value, 500);
  if (!text) return undefined;
  if (!/^https?:\/\//i.test(text)) return text;
  try {
    const url = new URL(text);
    return url.toString();
  } catch {
    return text;
  }
}
