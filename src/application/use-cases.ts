import {
  childAssignmentCount,
  enabledDirections,
  findChild,
  findVehicle,
  nextFreeSeatIndex,
  validateAssignment,
  vehicleAssignmentCount,
} from "../domain/allocation";
import { err, ok, type Result } from "../domain/result";
import { isExpired } from "../domain/time";
import type { Assignment, Child, Room, Vehicle } from "../domain/types";
import { EMPTY_BORROWS, ROOM_LIMITS } from "../domain/types";
import {
  validateChildInput,
  validateChildUpdate,
  validateSettings,
  validateVehicleInput,
  validateVehicleUpdate,
} from "../domain/validation";
import type { IdFactory } from "../domain/id";
import type {
  AssignChildRequest,
  CreateChildRequest,
  CreateRoomRequest,
  CreateVehicleRequest,
  UpdateChildRequest,
  UpdateSettingsRequest,
  UpdateVehicleRequest,
} from "./dto";
import type { RoomRepository } from "./ports";

export interface UseCaseClock {
  now(): Date;
}

export class RoomUseCases {
  constructor(
    private readonly repository: RoomRepository,
    private readonly ids: IdFactory,
    private readonly clock: UseCaseClock,
  ) {}

  async createRoom(request: CreateRoomRequest): Promise<Result<Room>> {
    const settings = validateSettings(request);
    if (!settings.ok) return settings;
    return ok(await this.repository.createRoom(settings.value, this.clock.now()));
  }

  async getRoom(): Promise<Result<Room>> {
    const room = await this.repository.getRoom("", this.clock.now());
    if (!room) return err("ROOM_NOT_FOUND", "Room was not found.");
    if (isExpired(room.expiresAt, this.clock.now())) {
      return err("ROOM_EXPIRED", "This room has expired.");
    }
    return ok(room);
  }

  async updateSettings(request: UpdateSettingsRequest): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    const settings = validateSettings({ ...roomResult.value.settings, ...request });
    if (!settings.ok) return settings;
    return ok(
      await this.repository.saveRoom({
        ...roomResult.value,
        settings: settings.value,
        updatedAt: this.nowIso(),
      }),
    );
  }

  async createVehicle(request: CreateVehicleRequest): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    const room = roomResult.value;

    const input = validateVehicleInput(
      {
        driverName: request.driverName,
        seatCount: request.seatCount,
        directions: request.directions ?? [],
        lendsBooster: Boolean(request.lendsBooster),
        lendsRearFacing: Boolean(request.lendsRearFacing),
        lendsFrontFacing: Boolean(request.lendsFrontFacing),
        reservedRiders: request.reservedRiders ?? [],
      },
      enabledDirections(room),
      room.vehicles,
    );
    if (!input.ok) return input;

    const totalChildrenAfter = room.children.length + input.value.reservedRiders.length;
    if (totalChildrenAfter > ROOM_LIMITS.children) {
      return err("LIMIT_EXCEEDED", "This room has reached the child limit.");
    }
    const totalAssignmentsAfter =
      room.assignments.length + input.value.reservedRiders.length * input.value.directions.length;
    if (totalAssignmentsAfter > ROOM_LIMITS.assignments) {
      return err("LIMIT_EXCEEDED", "This room has reached the assignment limit.");
    }

    const now = this.nowIso();
    const vehicle: Vehicle = {
      id: this.ids(),
      driverName: input.value.driverName,
      seatCount: input.value.seatCount,
      directions: input.value.directions,
      lendsBooster: input.value.lendsBooster,
      lendsRearFacing: input.value.lendsRearFacing,
      lendsFrontFacing: input.value.lendsFrontFacing,
      createdAt: now,
      updatedAt: now,
    };

    const newChildren: Child[] = [];
    const newAssignments: Assignment[] = [];
    for (const rider of input.value.reservedRiders) {
      const child: Child = {
        id: this.ids(),
        name: rider.name,
        directions: input.value.directions,
        borrows: { ...EMPTY_BORROWS },
        createdAt: now,
        updatedAt: now,
      };
      newChildren.push(child);
      for (const direction of input.value.directions) {
        newAssignments.push({
          id: this.ids(),
          childId: child.id,
          vehicleId: vehicle.id,
          seatIndex: rider.seatIndex,
          direction,
          createdAt: now,
        });
      }
    }

    return ok(
      await this.repository.saveRoom({
        ...room,
        vehicles: [...room.vehicles, vehicle],
        children: [...room.children, ...newChildren],
        assignments: [...room.assignments, ...newAssignments],
        updatedAt: now,
      }),
    );
  }

  async updateVehicle(vehicleId: string, request: UpdateVehicleRequest): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    const room = roomResult.value;
    const existing = findVehicle(room, vehicleId);
    if (!existing) return err("VEHICLE_NOT_FOUND", "Vehicle was not found.");

    if (vehicleAssignmentCount(room, vehicleId) > 0) {
      return err(
        "VEHICLE_HAS_ASSIGNMENTS",
        "Move all riders out of this vehicle before editing.",
      );
    }

    const input = validateVehicleUpdate(request, existing, enabledDirections(room));
    if (!input.ok) return input;

    const now = this.nowIso();
    const updated: Vehicle = {
      ...existing,
      driverName: input.value.driverName,
      directions: input.value.directions,
      lendsBooster: input.value.lendsBooster,
      lendsRearFacing: input.value.lendsRearFacing,
      lendsFrontFacing: input.value.lendsFrontFacing,
      updatedAt: now,
    };

    return ok(
      await this.repository.saveRoom({
        ...room,
        vehicles: room.vehicles.map((v) => (v.id === vehicleId ? updated : v)),
        updatedAt: now,
      }),
    );
  }

  async deleteVehicle(vehicleId: string): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    const room = roomResult.value;
    if (!findVehicle(room, vehicleId)) {
      return err("VEHICLE_NOT_FOUND", "Vehicle was not found.");
    }
    const now = this.nowIso();
    return ok(
      await this.repository.saveRoom({
        ...room,
        vehicles: room.vehicles.filter((v) => v.id !== vehicleId),
        assignments: room.assignments.filter((a) => a.vehicleId !== vehicleId),
        updatedAt: now,
      }),
    );
  }

  async createChild(request: CreateChildRequest): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    const room = roomResult.value;

    const input = validateChildInput(
      {
        name: request.name,
        directions: request.directions ?? [],
        borrows: request.borrows ?? {},
      },
      enabledDirections(room),
      room.children,
    );
    if (!input.ok) return input;

    const now = this.nowIso();
    const child: Child = {
      id: this.ids(),
      name: input.value.name,
      directions: input.value.directions,
      borrows: input.value.borrows,
      createdAt: now,
      updatedAt: now,
    };

    return ok(
      await this.repository.saveRoom({
        ...room,
        children: [...room.children, child],
        updatedAt: now,
      }),
    );
  }

  async updateChild(childId: string, request: UpdateChildRequest): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    const room = roomResult.value;
    const existing = findChild(room, childId);
    if (!existing) return err("CHILD_NOT_FOUND", "Child was not found.");

    if (childAssignmentCount(room, childId) > 0) {
      return err(
        "CHILD_HAS_ASSIGNMENTS",
        "Move this child back to the queue before editing.",
      );
    }

    const input = validateChildUpdate(request, existing, enabledDirections(room));
    if (!input.ok) return input;

    const now = this.nowIso();
    const updated: Child = {
      ...existing,
      name: input.value.name,
      directions: input.value.directions,
      borrows: input.value.borrows,
      updatedAt: now,
    };

    return ok(
      await this.repository.saveRoom({
        ...room,
        children: room.children.map((c) => (c.id === childId ? updated : c)),
        updatedAt: now,
      }),
    );
  }

  async deleteChild(childId: string): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    const room = roomResult.value;
    if (!findChild(room, childId)) {
      return err("CHILD_NOT_FOUND", "Child was not found.");
    }
    const now = this.nowIso();
    return ok(
      await this.repository.saveRoom({
        ...room,
        children: room.children.filter((c) => c.id !== childId),
        assignments: room.assignments.filter((a) => a.childId !== childId),
        updatedAt: now,
      }),
    );
  }

  async assignChild(request: AssignChildRequest): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    const room = roomResult.value;

    const candidate = validateAssignment(room, request);
    if (!candidate.ok) return candidate;

    const vehicle = findVehicle(room, request.vehicleId)!;
    const seatIndex = nextFreeSeatIndex(room, vehicle, request.direction);
    if (seatIndex === undefined) {
      return err("SEAT_ALREADY_ASSIGNED", "This vehicle has no free seat for that direction.");
    }

    const now = this.nowIso();
    const assignment: Assignment = {
      id: this.ids(),
      childId: candidate.value.childId,
      vehicleId: candidate.value.vehicleId,
      seatIndex,
      direction: candidate.value.direction,
      createdAt: now,
    };

    return ok(
      await this.repository.saveRoom({
        ...room,
        assignments: [...room.assignments, assignment],
        updatedAt: now,
      }),
    );
  }

  async unassignChild(assignmentId: string): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    const room = roomResult.value;
    return ok(
      await this.repository.saveRoom({
        ...room,
        assignments: room.assignments.filter((a) => a.id !== assignmentId),
        updatedAt: this.nowIso(),
      }),
    );
  }

  private nowIso(): string {
    return this.clock.now().toISOString();
  }
}
