import { describe, expect, it } from "vitest";
import type { RoomRepository } from "./ports";
import { RoomUseCases } from "./use-cases";
import type { Room, RoomSettings } from "../domain/types";
import { addRoomTtl } from "../domain/time";

class MemoryRepository implements RoomRepository {
  room?: Room;

  async createRoom(settings: RoomSettings, now: Date): Promise<Room> {
    this.room = {
      code: "ROOM123",
      settings,
      createdAt: now.toISOString(),
      expiresAt: addRoomTtl(now).toISOString(),
      updatedAt: now.toISOString(),
      families: [],
      assignments: [],
    };
    return this.room;
  }

  async getRoom(): Promise<Room | undefined> {
    return this.room;
  }

  async saveRoom(room: Room): Promise<Room> {
    this.room = room;
    return room;
  }

  async deleteRoom(): Promise<void> {
    this.room = undefined;
  }
}

describe("room use cases", () => {
  it("creates rooms that expire 30 days after creation", async () => {
    const useCases = new RoomUseCases(new MemoryRepository(), () => "id-1", {
      now: () => new Date("2026-05-20T00:00:00.000Z"),
    });

    const result = await useCases.createRoom({ label: "Room" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.expiresAt).toBe("2026-06-19T00:00:00.000Z");
  });

  it("adds families and assigns compatible seats", async () => {
    let id = 0;
    const repository = new MemoryRepository();
    const useCases = new RoomUseCases(repository, () => `id-${++id}`, {
      now: () => new Date("2026-05-20T00:00:00.000Z"),
    });

    await useCases.createRoom({ label: "Room" });
    const familyResult = await useCases.addFamily({
      displayLabel: "Family A",
      children: [{ label: "Kid", directions: ["outbound"], seatType: "booster" }],
      seatOffers: [{ label: "Seat", directions: ["outbound"], seatType: "booster" }],
    });

    expect(familyResult.ok).toBe(true);
    if (!familyResult.ok) return;

    const childId = familyResult.value.families[0]!.children[0]!.id;
    const seatId = familyResult.value.families[0]!.seatOffers[0]!.id;
    const assignment = await useCases.assignSeat({ childId, seatId, direction: "outbound" });

    expect(assignment.ok).toBe(true);
    if (assignment.ok) expect(assignment.value.assignments).toHaveLength(1);
  });
});
