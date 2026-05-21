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
      vehicles: [],
      children: [],
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

function buildUseCases() {
  let counter = 0;
  const repository = new MemoryRepository();
  const useCases = new RoomUseCases(repository, () => `id-${++counter}`, {
    now: () => new Date("2026-05-20T00:00:00.000Z"),
  });
  return { repository, useCases };
}

const enabledSettings: Partial<RoomSettings> = {
  label: "Class outing",
  outbound: { enabled: true },
  inbound: { enabled: true },
};

describe("RoomUseCases.createRoom", () => {
  it("creates a room that expires 30 days later", async () => {
    const { useCases } = buildUseCases();
    const result = await useCases.createRoom(enabledSettings);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.expiresAt).toBe("2026-06-19T00:00:00.000Z");
  });
});

describe("RoomUseCases.createVehicle", () => {
  it("creates a vehicle with no reserved riders", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const result = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 3,
      directions: ["outbound", "inbound"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.vehicles).toHaveLength(1);
    expect(result.value.children).toHaveLength(0);
    expect(result.value.assignments).toHaveLength(0);
  });

  it("promotes reserved riders to Child + Assignment per direction", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const result = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 3,
      directions: ["outbound", "inbound"],
      reservedRiders: [
        { seatIndex: 0, name: "Anna" },
        { seatIndex: 1, name: "Ben" },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.children).toHaveLength(2);
    expect(result.value.assignments).toHaveLength(4);
    expect(result.value.children.every((c) => c.borrows.booster === false)).toBe(true);
  });

  it("rejects invalid seat count", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const result = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 0,
      directions: ["outbound"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects directions not enabled by room settings", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom({
      label: "Outbound only",
      outbound: { enabled: true },
      inbound: { enabled: false },
    });
    const result = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 3,
      directions: ["inbound"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("RoomUseCases.updateVehicle", () => {
  it("allows safe driver-name edits while vehicle has assignments", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const created = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 1,
      directions: ["outbound"],
      reservedRiders: [{ seatIndex: 0, name: "Anna" }],
    });
    if (!created.ok) throw new Error("setup");
    const vehicleId = created.value.vehicles[0]!.id;
    const result = await useCases.updateVehicle(vehicleId, { driverName: "Anders B" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.vehicles[0]!.driverName).toBe("Anders B");
  });

  it("blocks vehicle edits that remove an assigned direction", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const created = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 1,
      directions: ["outbound", "inbound"],
      reservedRiders: [{ seatIndex: 0, name: "Anna" }],
    });
    if (!created.ok) throw new Error("setup");
    const vehicleId = created.value.vehicles[0]!.id;
    const result = await useCases.updateVehicle(vehicleId, { directions: ["outbound"] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("DIRECTION_NOT_NEEDED_OR_OFFERED");
  });

  it("blocks vehicle edits that remove equipment from assigned riders", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const vehicle = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 1,
      directions: ["outbound"],
      lendsBooster: true,
    });
    const child = await useCases.createChild({
      name: "Anna",
      directions: ["outbound"],
      borrows: { booster: true },
    });
    if (!vehicle.ok || !child.ok) throw new Error("setup");
    const vehicleId = vehicle.value.vehicles[0]!.id;
    const childId = child.value.children[0]!.id;
    const assigned = await useCases.assignChild({ childId, vehicleId, direction: "outbound", seatIndex: 0 });
    expect(assigned.ok).toBe(true);

    const result = await useCases.updateVehicle(vehicleId, { lendsBooster: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INCOMPATIBLE_ACCESSORY");
  });

  it("permits edit when vehicle is empty", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const created = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 3,
      directions: ["outbound"],
    });
    if (!created.ok) throw new Error("setup");
    const vehicleId = created.value.vehicles[0]!.id;
    const result = await useCases.updateVehicle(vehicleId, { driverName: "Anders B" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.vehicles[0]!.driverName).toBe("Anders B");
  });
});

describe("RoomUseCases.deleteVehicle", () => {
  it("removes vehicle and its assignments, preserves children", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const created = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 1,
      directions: ["outbound"],
      reservedRiders: [{ seatIndex: 0, name: "Anna" }],
    });
    if (!created.ok) throw new Error("setup");
    const vehicleId = created.value.vehicles[0]!.id;

    const result = await useCases.deleteVehicle(vehicleId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.vehicles).toHaveLength(0);
    expect(result.value.assignments).toHaveLength(0);
    expect(result.value.children).toHaveLength(1);
    expect(result.value.children[0]!.name).toBe("Anna");
  });
});

describe("RoomUseCases.assignChild", () => {
  it("creates an assignment with the requested exact seat index", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const vehicle = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 3,
      directions: ["outbound", "inbound"],
    });
    const child = await useCases.createChild({ name: "Anna", directions: ["outbound"] });
    if (!vehicle.ok || !child.ok) throw new Error("setup");
    const vehicleId = vehicle.value.vehicles[0]!.id;
    const childId = child.value.children[0]!.id;

    const result = await useCases.assignChild({ childId, vehicleId, direction: "outbound", seatIndex: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const a = result.value.assignments.find((x) => x.childId === childId);
    expect(a?.seatIndex).toBe(2);
  });

  it("rejects when accessory cannot be supplied", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const vehicle = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 2,
      directions: ["outbound"],
      lendsBooster: false,
    });
    const child = await useCases.createChild({
      name: "Anna",
      directions: ["outbound"],
      borrows: { booster: true },
    });
    if (!vehicle.ok || !child.ok) throw new Error("setup");
    const result = await useCases.assignChild({
      childId: child.value.children[0]!.id,
      vehicleId: vehicle.value.vehicles[0]!.id,
      direction: "outbound",
      seatIndex: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INCOMPATIBLE_ACCESSORY");
  });

  it("rejects when child already assigned for that direction", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const vehicle = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 2,
      directions: ["outbound"],
    });
    const child = await useCases.createChild({ name: "Anna", directions: ["outbound"] });
    if (!vehicle.ok || !child.ok) throw new Error("setup");
    const vehicleId = vehicle.value.vehicles[0]!.id;
    const childId = child.value.children[0]!.id;
    const first = await useCases.assignChild({ childId, vehicleId, direction: "outbound", seatIndex: 0 });
    expect(first.ok).toBe(true);
    const second = await useCases.assignChild({ childId, vehicleId, direction: "outbound", seatIndex: 1 });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("SEAT_ALREADY_ASSIGNED");
  });

  it("rejects an occupied requested seat", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const vehicle = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 2,
      directions: ["outbound"],
      reservedRiders: [{ seatIndex: 0, name: "Ben" }],
    });
    const child = await useCases.createChild({ name: "Anna", directions: ["outbound"] });
    if (!vehicle.ok || !child.ok) throw new Error("setup");
    const result = await useCases.assignChild({
      childId: child.value.children.find((c) => c.name === "Anna")!.id,
      vehicleId: vehicle.value.vehicles[0]!.id,
      direction: "outbound",
      seatIndex: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SEAT_ALREADY_ASSIGNED");
  });
});

describe("RoomUseCases.unassignChild", () => {
  it("removes the assignment by id", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const vehicle = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 1,
      directions: ["outbound"],
      reservedRiders: [{ seatIndex: 0, name: "Anna" }],
    });
    if (!vehicle.ok) throw new Error("setup");
    const assignmentId = vehicle.value.assignments[0]!.id;
    const result = await useCases.unassignChild(assignmentId);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.assignments).toHaveLength(0);
  });
});

describe("RoomUseCases.updateChild", () => {
  it("allows safe name edits while child has assignments", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const vehicle = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 1,
      directions: ["outbound"],
      reservedRiders: [{ seatIndex: 0, name: "Anna" }],
    });
    if (!vehicle.ok) throw new Error("setup");
    const childId = vehicle.value.children[0]!.id;
    const result = await useCases.updateChild(childId, { name: "Anna B" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.children[0]!.name).toBe("Anna B");
  });

  it("blocks child edits that remove an assigned direction", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const vehicle = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 1,
      directions: ["outbound", "inbound"],
      reservedRiders: [{ seatIndex: 0, name: "Anna" }],
    });
    if (!vehicle.ok) throw new Error("setup");
    const childId = vehicle.value.children[0]!.id;
    const result = await useCases.updateChild(childId, { directions: ["outbound"] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("DIRECTION_NOT_NEEDED_OR_OFFERED");
  });

  it("blocks child edits that add unsupported borrow needs", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom(enabledSettings);
    const vehicle = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 1,
      directions: ["outbound"],
    });
    const child = await useCases.createChild({ name: "Anna", directions: ["outbound"] });
    if (!vehicle.ok || !child.ok) throw new Error("setup");
    const vehicleId = vehicle.value.vehicles[0]!.id;
    const childId = child.value.children[0]!.id;
    const assigned = await useCases.assignChild({ childId, vehicleId, direction: "outbound", seatIndex: 0 });
    expect(assigned.ok).toBe(true);

    const result = await useCases.updateChild(childId, { borrows: { booster: true } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INCOMPATIBLE_ACCESSORY");
  });
});

describe("RoomUseCases.updateSettings", () => {
  it("mirrors outbound seats when Home is added by default", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom({
      label: "Outbound only",
      outbound: { enabled: true },
      inbound: { enabled: false },
    });
    const vehicle = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 2,
      directions: ["outbound"],
      reservedRiders: [{ seatIndex: 1, name: "Anna" }],
    });
    if (!vehicle.ok) throw new Error("setup");

    const result = await useCases.updateSettings({ inbound: { enabled: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.vehicles[0]!.directions).toEqual(["outbound", "inbound"]);
    expect(result.value.children[0]!.directions).toEqual(["outbound", "inbound"]);
    expect(result.value.assignments.map((assignment) => [assignment.direction, assignment.seatIndex])).toEqual([
      ["outbound", 1],
      ["inbound", 1],
    ]);
  });

  it("can add Home with participants but no mirrored seats", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom({
      label: "Outbound only",
      outbound: { enabled: true },
      inbound: { enabled: false },
    });
    const vehicle = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 2,
      directions: ["outbound"],
      reservedRiders: [{ seatIndex: 1, name: "Anna" }],
    });
    if (!vehicle.ok) throw new Error("setup");

    const result = await useCases.updateSettings({
      inbound: { enabled: true },
      returnTripSetup: "same-participants",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.vehicles[0]!.directions).toEqual(["outbound", "inbound"]);
    expect(result.value.children[0]!.directions).toEqual(["outbound", "inbound"]);
    expect(result.value.assignments).toHaveLength(1);
  });

  it("can add Home as an empty board", async () => {
    const { useCases } = buildUseCases();
    await useCases.createRoom({
      label: "Outbound only",
      outbound: { enabled: true },
      inbound: { enabled: false },
    });
    const vehicle = await useCases.createVehicle({
      driverName: "Anders",
      seatCount: 2,
      directions: ["outbound"],
      reservedRiders: [{ seatIndex: 1, name: "Anna" }],
    });
    if (!vehicle.ok) throw new Error("setup");

    const result = await useCases.updateSettings({
      inbound: { enabled: true },
      returnTripSetup: "empty",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.vehicles[0]!.directions).toEqual(["outbound"]);
    expect(result.value.children[0]!.directions).toEqual(["outbound"]);
    expect(result.value.assignments).toHaveLength(1);
  });
});
