import type { AssignmentCandidate, ChildAllocation, FamilyEntry, Room, SeatAvailability } from "./types";
import { ROOM_LIMITS } from "./types";
import { err, ok, type Result } from "./result";

export function findFamilyByChild(room: Room, childId: string): FamilyEntry | undefined {
  return room.families.find((family) => family.children.some((child) => child.id === childId));
}

export function findFamilyBySeat(room: Room, seatId: string): FamilyEntry | undefined {
  return room.families.find((family) => family.seatOffers.some((seat) => seat.id === seatId));
}

export function validateAssignment(room: Room, candidate: AssignmentCandidate): Result<AssignmentCandidate> {
  if (room.assignments.length >= ROOM_LIMITS.assignments) {
    return err("LIMIT_EXCEEDED", "This room has reached the assignment limit.");
  }

  const childFamily = findFamilyByChild(room, candidate.childId);
  const seatFamily = findFamilyBySeat(room, candidate.seatId);
  const child = childFamily?.children.find((item) => item.id === candidate.childId);
  const seat = seatFamily?.seatOffers.find((item) => item.id === candidate.seatId);

  if (!child) return err("CHILD_NOT_FOUND", "Child need was not found.");
  if (!seat) return err("SEAT_NOT_FOUND", "Offered seat was not found.");

  if (!child.directions.includes(candidate.direction) || !seat.directions.includes(candidate.direction)) {
    return err("DIRECTION_NOT_NEEDED_OR_OFFERED", "The child and seat must both include this direction.");
  }

  if (child.seatType !== seat.seatType) {
    return err("INCOMPATIBLE_SEAT", "The offered seat type does not match the child requirement.");
  }

  const seatAlreadyAssigned = room.assignments.some(
    (assignment) => assignment.seatId === candidate.seatId && assignment.direction === candidate.direction,
  );
  if (seatAlreadyAssigned) return err("SEAT_ALREADY_ASSIGNED", "This seat is already assigned for that direction.");

  const childAlreadyAssigned = room.assignments.some(
    (assignment) => assignment.childId === candidate.childId && assignment.direction === candidate.direction,
  );
  if (childAlreadyAssigned) return err("SEAT_ALREADY_ASSIGNED", "This child already has a ride for that direction.");

  return ok(candidate);
}

export function getChildAllocations(room: Room): ChildAllocation[] {
  return room.families.flatMap((family) =>
    family.children.map((child) => {
      const assignments = room.assignments.filter((assignment) => assignment.childId === child.id);
      const missingDirections = child.directions.filter(
        (direction) => !assignments.some((assignment) => assignment.direction === direction),
      );
      const status =
        missingDirections.length === 0
          ? "fully-allocated"
          : assignments.length > 0
            ? "partially-allocated"
            : "unallocated";

      return {
        child,
        family,
        status,
        missingDirections,
        assignments,
      };
    }),
  );
}

export function getSeatAvailability(room: Room): SeatAvailability[] {
  return room.families.flatMap((family) =>
    family.seatOffers.flatMap((seat) =>
      seat.directions.map((direction) => ({
        family,
        seat,
        direction,
        assignment: room.assignments.find(
          (assignment) => assignment.seatId === seat.id && assignment.direction === direction,
        ),
      })),
    ),
  );
}
