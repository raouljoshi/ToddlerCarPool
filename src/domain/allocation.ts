import type {
  AccessoryType,
  Assignment,
  BorrowFlags,
  Child,
  ChildAllocation,
  Direction,
  Room,
  SeatSlot,
  Vehicle,
} from "./types";
import { ACCESSORY_TYPES, DIRECTIONS, ROOM_LIMITS } from "./types";
import { err, ok, type Result } from "./result";

export interface AssignmentCandidate {
  childId: string;
  vehicleId: string;
  direction: Direction;
}

export function findChild(room: Room, childId: string): Child | undefined {
  return room.children.find((c) => c.id === childId);
}

export function findVehicle(room: Room, vehicleId: string): Vehicle | undefined {
  return room.vehicles.find((v) => v.id === vehicleId);
}

export function assignmentsForVehicleDirection(
  room: Room,
  vehicleId: string,
  direction: Direction,
): Assignment[] {
  return room.assignments.filter(
    (a) => a.vehicleId === vehicleId && a.direction === direction,
  );
}

export function takenSeatIndexes(
  room: Room,
  vehicleId: string,
  direction: Direction,
): Set<number> {
  return new Set(
    assignmentsForVehicleDirection(room, vehicleId, direction).map((a) => a.seatIndex),
  );
}

export function nextFreeSeatIndex(
  room: Room,
  vehicle: Vehicle,
  direction: Direction,
): number | undefined {
  const taken = takenSeatIndexes(room, vehicle.id, direction);
  for (let i = 0; i < vehicle.seatCount; i++) {
    if (!taken.has(i)) return i;
  }
  return undefined;
}

export function getVehicleSeatMap(
  room: Room,
  vehicleId: string,
  direction: Direction,
): SeatSlot[] {
  const vehicle = findVehicle(room, vehicleId);
  if (!vehicle) return [];
  const assignments = assignmentsForVehicleDirection(room, vehicleId, direction);
  const byIndex = new Map(assignments.map((a) => [a.seatIndex, a]));
  const slots: SeatSlot[] = [];
  for (let i = 0; i < vehicle.seatCount; i++) {
    const a = byIndex.get(i);
    slots.push({
      index: i,
      state: a ? { kind: "assigned", childId: a.childId, assignmentId: a.id } : { kind: "empty" },
    });
  }
  return slots;
}

function vehicleLends(vehicle: Vehicle, type: AccessoryType): boolean {
  if (type === "booster") return vehicle.lendsBooster;
  if (type === "rearFacing") return vehicle.lendsRearFacing;
  return vehicle.lendsFrontFacing;
}

function borrowsType(flags: BorrowFlags, type: AccessoryType): boolean {
  if (type === "booster") return flags.booster;
  if (type === "rearFacing") return flags.rearFacing;
  return flags.frontFacing;
}

export function accessoryRemaining(
  room: Room,
  vehicle: Vehicle,
  direction: Direction,
  type: AccessoryType,
): number {
  if (!vehicleLends(vehicle, type)) return 0;
  const offered = 1;
  const assignments = assignmentsForVehicleDirection(room, vehicle.id, direction);
  const used = assignments.reduce((sum, a) => {
    const child = findChild(room, a.childId);
    if (!child) return sum;
    return sum + (borrowsType(child.borrows, type) ? 1 : 0);
  }, 0);
  return Math.max(0, offered - used);
}

export function vehicleCanHostChild(
  room: Room,
  vehicle: Vehicle,
  child: Child,
  direction: Direction,
): boolean {
  if (!vehicle.directions.includes(direction)) return false;
  if (!child.directions.includes(direction)) return false;
  const taken = takenSeatIndexes(room, vehicle.id, direction);
  if (taken.size >= vehicle.seatCount) return false;
  if (room.assignments.some((a) => a.childId === child.id && a.direction === direction)) {
    return false;
  }
  for (const type of ACCESSORY_TYPES) {
    if (!borrowsType(child.borrows, type)) continue;
    if (accessoryRemaining(room, vehicle, direction, type) <= 0) return false;
  }
  return true;
}

export function getCandidateVehicles(
  room: Room,
  childId: string,
  direction: Direction,
): Vehicle[] {
  const child = findChild(room, childId);
  if (!child) return [];
  return room.vehicles
    .filter((v) => vehicleCanHostChild(room, v, child, direction))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function validateAssignment(room: Room, candidate: AssignmentCandidate): Result<AssignmentCandidate> {
  if (room.assignments.length >= ROOM_LIMITS.assignments) {
    return err("LIMIT_EXCEEDED", "This room has reached the assignment limit.");
  }
  const child = findChild(room, candidate.childId);
  if (!child) return err("CHILD_NOT_FOUND", "Child was not found.");
  const vehicle = findVehicle(room, candidate.vehicleId);
  if (!vehicle) return err("VEHICLE_NOT_FOUND", "Vehicle was not found.");

  if (!vehicle.directions.includes(candidate.direction) || !child.directions.includes(candidate.direction)) {
    return err("DIRECTION_NOT_NEEDED_OR_OFFERED", "The child and vehicle must both include this direction.");
  }

  if (room.assignments.some((a) => a.childId === child.id && a.direction === candidate.direction)) {
    return err("SEAT_ALREADY_ASSIGNED", "This child already has a ride for that direction.");
  }

  if (nextFreeSeatIndex(room, vehicle, candidate.direction) === undefined) {
    return err("SEAT_ALREADY_ASSIGNED", "This vehicle has no free seat for that direction.");
  }

  for (const type of ACCESSORY_TYPES) {
    if (!borrowsType(child.borrows, type)) continue;
    if (accessoryRemaining(room, vehicle, candidate.direction, type) <= 0) {
      return err("INCOMPATIBLE_ACCESSORY", `Vehicle has no available ${type} for this direction.`);
    }
  }

  return ok(candidate);
}

export function getChildAllocations(room: Room): ChildAllocation[] {
  return room.children.map((child) => {
    const assignments = room.assignments.filter((a) => a.childId === child.id);
    const missingDirections = child.directions.filter(
      (d) => !assignments.some((a) => a.direction === d),
    );
    const status =
      missingDirections.length === 0 && child.directions.length > 0
        ? "fully-allocated"
        : assignments.length > 0
          ? "partially-allocated"
          : "unallocated";
    return { child, status, missingDirections, assignments };
  });
}

export function getUnallocatedChildren(room: Room): Child[] {
  const allocations = getChildAllocations(room);
  return allocations
    .filter((a) => a.status !== "fully-allocated")
    .map((a) => a.child);
}

export function vehicleAssignmentCount(room: Room, vehicleId: string): number {
  return room.assignments.filter((a) => a.vehicleId === vehicleId).length;
}

export function childAssignmentCount(room: Room, childId: string): number {
  return room.assignments.filter((a) => a.childId === childId).length;
}

export function enabledDirections(room: Room): Direction[] {
  return DIRECTIONS.filter((d) =>
    d === "outbound" ? room.settings.outbound.enabled : room.settings.inbound.enabled,
  );
}
