import { describe, expect, it } from "vitest";
import { getChildAllocations, validateAssignment } from "./allocation";
import type { Room } from "./types";

const room: Room = {
  code: "ABC123",
  settings: {
    label: "Class trip",
    outboundEnabled: true,
    outboundLabel: "Morning",
    inboundEnabled: true,
    inboundLabel: "Afternoon",
  },
  createdAt: "2026-05-20T00:00:00.000Z",
  expiresAt: "2026-06-19T00:00:00.000Z",
  updatedAt: "2026-05-20T00:00:00.000Z",
  families: [
    {
      id: "family-1",
      displayLabel: "Family A",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      notes: {},
      children: [{ id: "child-1", label: "Kid A", directions: ["outbound", "inbound"], seatType: "booster" }],
      seatOffers: [{ id: "seat-1", label: "Seat A", directions: ["outbound"], seatType: "booster" }],
    },
    {
      id: "family-2",
      displayLabel: "Family B",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      notes: {},
      children: [],
      seatOffers: [{ id: "seat-2", label: "Seat B", directions: ["outbound"], seatType: "regular" }],
    },
  ],
  assignments: [],
};

describe("allocation rules", () => {
  it("allows compatible direction and seat type", () => {
    const result = validateAssignment(room, { childId: "child-1", seatId: "seat-1", direction: "outbound" });

    expect(result.ok).toBe(true);
  });

  it("blocks incompatible seat types", () => {
    const result = validateAssignment(room, { childId: "child-1", seatId: "seat-2", direction: "outbound" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INCOMPATIBLE_SEAT");
  });

  it("reports partially allocated children", () => {
    const allocations = getChildAllocations({
      ...room,
      assignments: [{ id: "a-1", childId: "child-1", seatId: "seat-1", direction: "outbound", createdAt: room.createdAt }],
    });

    expect(allocations[0]?.status).toBe("partially-allocated");
    expect(allocations[0]?.missingDirections).toEqual(["inbound"]);
  });
});
