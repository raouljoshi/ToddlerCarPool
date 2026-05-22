import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Room } from "../../domain/types";
import { translations } from "../i18n";
import { BoardView } from "./BoardView";

const now = "2026-05-20T00:00:00.000Z";

function buildRoom(): Room {
  return {
    code: "ABC12345",
    settings: {
      label: "Seat test",
      outbound: { enabled: true },
      inbound: { enabled: true },
    },
    createdAt: now,
    updatedAt: now,
    expiresAt: "2026-06-19T00:00:00.000Z",
    vehicles: [
      {
        id: "vehicle-maria",
        driverName: "Maria",
        seatCount: 3,
        directions: ["outbound", "inbound"],
        lendsBooster: false,
        lendsRearFacing: false,
        lendsFrontFacing: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "vehicle-jonas",
        driverName: "Jonas",
        seatCount: 3,
        directions: ["outbound", "inbound"],
        lendsBooster: true,
        lendsRearFacing: false,
        lendsFrontFacing: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    children: [
      {
        id: "child-leo",
        name: "Leo",
        directions: ["outbound", "inbound"],
        borrows: { booster: false, rearFacing: false, frontFacing: false },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "child-sam",
        name: "Sam",
        directions: ["outbound"],
        borrows: { booster: true, rearFacing: false, frontFacing: false },
        createdAt: now,
        updatedAt: now,
      },
    ],
    assignments: [
      {
        id: "assignment-leo",
        childId: "child-leo",
        vehicleId: "vehicle-maria",
        direction: "outbound",
        seatIndex: 0,
        createdAt: now,
      },
      {
        id: "assignment-leo-home",
        childId: "child-leo",
        vehicleId: "vehicle-maria",
        direction: "inbound",
        seatIndex: 0,
        createdAt: now,
      },
    ],
  };
}

function renderBoard(overrides: Partial<ComponentProps<typeof BoardView>> = {}) {
  const props: ComponentProps<typeof BoardView> = {
    t: translations.en,
    language: "en",
    room: buildRoom(),
    justCreated: false,
    loading: false,
    onCopyLink: vi.fn(),
    onOpenDetails: vi.fn(),
    onAddVehicle: vi.fn(),
    onAddChild: vi.fn(),
    onEditVehicle: vi.fn(),
    onEditChild: vi.fn(),
    onDeleteVehicle: vi.fn(),
    onDeleteChild: vi.fn(),
    onUnassign: vi.fn(),
    onAssign: vi.fn(),
    ...overrides,
  };
  render(<BoardView {...props} />);
  return props;
}

describe("BoardView", () => {
  it("labels trip times with arrival and departure verbs", () => {
    const room = buildRoom();
    room.settings = {
      ...room.settings,
      outbound: {
        enabled: true,
        time: "08:30",
        timeReference: "arrival",
        info: "Use the north gate.",
      },
      inbound: { enabled: true, time: "15:15", timeReference: "departure" },
    };

    renderBoard({ room });

    expect(screen.getByText("Arrive There 08:30")).toBeInTheDocument();
    expect(screen.getByText("Leave Home 15:15")).toBeInTheDocument();
    expect(screen.getByText("Use the north gate.")).toBeInTheDocument();
  });

  it("labels trip times in Swedish", () => {
    const room = buildRoom();
    room.settings = {
      ...room.settings,
      outbound: { enabled: true, time: "08:30", timeReference: "arrival" },
      inbound: { enabled: true, time: "15:15", timeReference: "departure" },
    };

    renderBoard({ t: translations.sv, language: "sv", room });

    expect(screen.getByText("Framme Dit 08:30")).toBeInTheDocument();
    expect(screen.getByText("Avresa Hem 15:15")).toBeInTheDocument();
  });

  it("selects a waiting child and assigns the exact tapped compatible seat", () => {
    const onAssign = vi.fn();
    renderBoard({ onAssign });

    fireEvent.click(screen.getByRole("button", { name: "Sam" }));

    expect(screen.getByText("Tap a green seat.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seat 2: That seat does not work for this child." })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Seat 2: available" }));

    expect(onAssign).toHaveBeenCalledWith({
      childId: "child-sam",
      vehicleId: "vehicle-jonas",
      direction: "outbound",
      seatIndex: 1,
    });
  });

  it("opens occupied seat actions and moves that rider back to waiting", () => {
    const onUnassign = vi.fn();
    renderBoard({ onUnassign });

    fireEvent.click(screen.getByRole("button", { name: "Seat 1: Leo" }));
    expect(screen.getByText("Leo's seat")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Move to queue" }));
    expect(onUnassign).toHaveBeenCalledWith("assignment-leo");
  });
});
