import { describe, expect, it } from "vitest";
import {
  accessoryRemaining,
  getCandidateVehicles,
  getChildAllocations,
  getVehicleSeatMap,
  nextFreeSeatIndex,
  validateAssignment,
  vehicleCanHostChild,
} from "./allocation";
import type { Assignment, Child, Room, Vehicle } from "./types";

const baseTime = "2026-05-20T00:00:00.000Z";

function buildRoom(overrides: Partial<Room> = {}): Room {
  return {
    code: "ABC123",
    settings: {
      label: "Class trip",
      outbound: { enabled: true, time: "08:00", timeReference: "arrival" },
      inbound: { enabled: true, time: "15:00", timeReference: "departure" },
    },
    createdAt: baseTime,
    expiresAt: "2026-06-19T00:00:00.000Z",
    updatedAt: baseTime,
    vehicles: [],
    children: [],
    assignments: [],
    ...overrides,
  };
}

function vehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "v-1",
    driverName: "Anders",
    seatCount: 3,
    directions: ["outbound", "inbound"],
    lendsBooster: false,
    lendsRearFacing: false,
    lendsFrontFacing: false,
    createdAt: baseTime,
    updatedAt: baseTime,
    ...overrides,
  };
}

function child(overrides: Partial<Child> = {}): Child {
  return {
    id: "c-1",
    name: "Anna",
    directions: ["outbound", "inbound"],
    borrows: { booster: false, rearFacing: false, frontFacing: false },
    createdAt: baseTime,
    updatedAt: baseTime,
    ...overrides,
  };
}

function assignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: "a-1",
    childId: "c-1",
    vehicleId: "v-1",
    seatIndex: 0,
    direction: "outbound",
    createdAt: baseTime,
    ...overrides,
  };
}

describe("getCandidateVehicles — hard filter", () => {
  it("returns vehicle serving the direction with free seats", () => {
    const room = buildRoom({
      vehicles: [vehicle()],
      children: [child()],
    });
    const candidates = getCandidateVehicles(room, "c-1", "outbound");
    expect(candidates.map((v) => v.id)).toEqual(["v-1"]);
  });

  it("excludes vehicle not serving the direction", () => {
    const room = buildRoom({
      vehicles: [vehicle({ directions: ["inbound"] })],
      children: [child()],
    });
    expect(getCandidateVehicles(room, "c-1", "outbound")).toEqual([]);
  });

  it("excludes vehicle with all seats taken for the direction", () => {
    const room = buildRoom({
      vehicles: [vehicle({ seatCount: 1 })],
      children: [child(), child({ id: "c-2", name: "Ben" })],
      assignments: [assignment({ childId: "c-2", seatIndex: 0, direction: "outbound" })],
    });
    expect(getCandidateVehicles(room, "c-1", "outbound")).toEqual([]);
  });

  it("excludes child already assigned for that direction", () => {
    const room = buildRoom({
      vehicles: [vehicle({ seatCount: 3 })],
      children: [child()],
      assignments: [assignment({ direction: "outbound" })],
    });
    expect(getCandidateVehicles(room, "c-1", "outbound")).toEqual([]);
  });

  it("filters out vehicles that don't lend a booster the child borrows", () => {
    const room = buildRoom({
      vehicles: [
        vehicle({ id: "no-booster", lendsBooster: false }),
        vehicle({ id: "has-booster", lendsBooster: true, createdAt: "2026-05-20T01:00:00.000Z" }),
      ],
      children: [child({ borrows: { booster: true, rearFacing: false, frontFacing: false } })],
    });
    const ids = getCandidateVehicles(room, "c-1", "outbound").map((v) => v.id);
    expect(ids).toEqual(["has-booster"]);
  });

  it("decrements accessory capacity per direction", () => {
    const lender = vehicle({ id: "lender", lendsBooster: true });
    const claimedChild = child({
      id: "claimed",
      borrows: { booster: true, rearFacing: false, frontFacing: false },
    });
    const queueChild = child({
      id: "queue",
      borrows: { booster: true, rearFacing: false, frontFacing: false },
    });
    const room = buildRoom({
      vehicles: [lender],
      children: [claimedChild, queueChild],
      assignments: [
        assignment({ id: "a-booster", childId: "claimed", vehicleId: "lender", direction: "outbound", seatIndex: 0 }),
      ],
    });
    expect(accessoryRemaining(room, lender, "outbound", "booster")).toBe(0);
    expect(getCandidateVehicles(room, "queue", "outbound")).toEqual([]);
  });

  it("sorts candidates by createdAt ascending", () => {
    const room = buildRoom({
      vehicles: [
        vehicle({ id: "later", createdAt: "2026-05-20T02:00:00.000Z" }),
        vehicle({ id: "earlier", createdAt: "2026-05-20T01:00:00.000Z" }),
      ],
      children: [child()],
    });
    expect(getCandidateVehicles(room, "c-1", "outbound").map((v) => v.id)).toEqual([
      "earlier",
      "later",
    ]);
  });
});

describe("validateAssignment", () => {
  it("rejects unknown child", () => {
    const room = buildRoom({ vehicles: [vehicle()] });
    const result = validateAssignment(room, { childId: "missing", vehicleId: "v-1", direction: "outbound", seatIndex: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CHILD_NOT_FOUND");
  });

  it("rejects unknown vehicle", () => {
    const room = buildRoom({ children: [child()] });
    const result = validateAssignment(room, { childId: "c-1", vehicleId: "missing", direction: "outbound", seatIndex: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VEHICLE_NOT_FOUND");
  });

  it("rejects direction mismatch", () => {
    const room = buildRoom({
      vehicles: [vehicle({ directions: ["inbound"] })],
      children: [child()],
    });
    const result = validateAssignment(room, { childId: "c-1", vehicleId: "v-1", direction: "outbound", seatIndex: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("DIRECTION_NOT_NEEDED_OR_OFFERED");
  });

  it("rejects child already assigned for that direction", () => {
    const room = buildRoom({
      vehicles: [vehicle()],
      children: [child()],
      assignments: [assignment({ direction: "outbound" })],
    });
    const result = validateAssignment(room, { childId: "c-1", vehicleId: "v-1", direction: "outbound", seatIndex: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SEAT_ALREADY_ASSIGNED");
  });

  it("rejects when no booster remains on direction", () => {
    const room = buildRoom({
      vehicles: [vehicle({ lendsBooster: true })],
      children: [
        child({ id: "claimed", borrows: { booster: true, rearFacing: false, frontFacing: false } }),
        child({ id: "queue", borrows: { booster: true, rearFacing: false, frontFacing: false } }),
      ],
      assignments: [
        assignment({ id: "a-1", childId: "claimed", seatIndex: 0, direction: "outbound" }),
      ],
    });
    const result = validateAssignment(room, { childId: "queue", vehicleId: "v-1", direction: "outbound", seatIndex: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INCOMPATIBLE_ACCESSORY");
  });

  it("accepts a compatible candidate", () => {
    const room = buildRoom({ vehicles: [vehicle()], children: [child()] });
    const result = validateAssignment(room, { childId: "c-1", vehicleId: "v-1", direction: "outbound", seatIndex: 0 });
    expect(result.ok).toBe(true);
  });

  it("rejects an out-of-range exact seat", () => {
    const room = buildRoom({ vehicles: [vehicle({ seatCount: 2 })], children: [child()] });
    const result = validateAssignment(room, { childId: "c-1", vehicleId: "v-1", direction: "outbound", seatIndex: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SEAT_NOT_FOUND");
  });

  it("rejects an occupied exact seat", () => {
    const room = buildRoom({
      vehicles: [vehicle({ seatCount: 2 })],
      children: [child(), child({ id: "c-2", name: "Ben" })],
      assignments: [assignment({ childId: "c-2", direction: "outbound", seatIndex: 0 })],
    });
    const result = validateAssignment(room, { childId: "c-1", vehicleId: "v-1", direction: "outbound", seatIndex: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SEAT_ALREADY_ASSIGNED");
  });
});

describe("getChildAllocations & seat map", () => {
  it("reports unallocated / partial / full", () => {
    const room = buildRoom({
      vehicles: [vehicle()],
      children: [child()],
      assignments: [assignment({ direction: "outbound" })],
    });
    const allocations = getChildAllocations(room);
    expect(allocations[0]?.status).toBe("partially-allocated");
    expect(allocations[0]?.missingDirections).toEqual(["inbound"]);
  });

  it("reports fully allocated when all directions covered", () => {
    const room = buildRoom({
      vehicles: [vehicle()],
      children: [child()],
      assignments: [
        assignment({ id: "a-out", direction: "outbound", seatIndex: 0 }),
        assignment({ id: "a-in", direction: "inbound", seatIndex: 0 }),
      ],
    });
    expect(getChildAllocations(room)[0]?.status).toBe("fully-allocated");
  });

  it("getVehicleSeatMap returns N slots with state", () => {
    const room = buildRoom({
      vehicles: [vehicle({ seatCount: 3 })],
      children: [child()],
      assignments: [assignment({ direction: "outbound", seatIndex: 1 })],
    });
    const slots = getVehicleSeatMap(room, "v-1", "outbound");
    expect(slots).toHaveLength(3);
    expect(slots[0]?.state.kind).toBe("empty");
    expect(slots[1]?.state.kind).toBe("assigned");
    expect(slots[2]?.state.kind).toBe("empty");
  });

  it("nextFreeSeatIndex picks the lowest-index empty seat", () => {
    const room = buildRoom({
      vehicles: [vehicle({ seatCount: 3 })],
      assignments: [assignment({ direction: "outbound", seatIndex: 0 })],
    });
    expect(nextFreeSeatIndex(room, room.vehicles[0]!, "outbound")).toBe(1);
  });
});

describe("vehicleCanHostChild edge cases", () => {
  it("respects child borrow flags", () => {
    const v = vehicle({ lendsBooster: false });
    const c = child({ borrows: { booster: true, rearFacing: false, frontFacing: false } });
    expect(vehicleCanHostChild(buildRoom({ vehicles: [v], children: [c] }), v, c, "outbound")).toBe(false);
  });

  it("returns false when child does not need that direction", () => {
    const v = vehicle();
    const c = child({ directions: ["inbound"] });
    expect(vehicleCanHostChild(buildRoom({ vehicles: [v], children: [c] }), v, c, "outbound")).toBe(false);
  });
});
