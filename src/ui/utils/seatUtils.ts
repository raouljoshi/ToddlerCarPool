import type { SeatSlot } from "../../domain/types";
import type { SeatDisplayState } from "../components/SeatSchematic";

export function slotsToDisplayStates(
  slots: SeatSlot[],
  childNameById: Map<string, string>,
): SeatDisplayState[] {
  return slots.map((slot) => {
    if (slot.state.kind === "empty") return { kind: "empty" };
    const name = childNameById.get(slot.state.childId) ?? "?";
    return { kind: "assigned", name };
  });
}
