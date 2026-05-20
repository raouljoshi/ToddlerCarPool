import { ROOM_TTL_DAYS } from "./types";

export function addRoomTtl(createdAt: Date): Date {
  const expiresAt = new Date(createdAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + ROOM_TTL_DAYS);
  return expiresAt;
}

export function isExpired(expiresAt: string, now: Date): boolean {
  return Date.parse(expiresAt) <= now.getTime();
}
