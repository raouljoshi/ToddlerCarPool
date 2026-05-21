import {
  enabledDirections,
  findChild,
  findVehicle,
  validateAssignment,
  validateRoomAssignments,
} from "../domain/allocation";
import { err, ok, type Result } from "../domain/result";
import { isExpired } from "../domain/time";
import type { Assignment, Child, Direction, Room, Vehicle } from "../domain/types";
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
    const room = roomResult.value;
    const settings = validateSettings({ ...room.settings, ...request });
    if (!settings.ok) return settings;
    const setupRoom = this.applyReturnTripSetup(
      {
        ...room,
        settings: settings.value,
        updatedAt: this.nowIso(),
      },
      room,
      request.returnTripSetup,
    );
    if (!setupRoom.ok) return setupRoom;
    const nextRoom = setupRoom.value;
    const integrity = validateRoomAssignments(nextRoom);
    if (!integrity.ok) return integrity;
    return ok(
      await this.repository.saveRoom(nextRoom),
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

    const nextRoom = {
      ...room,
      vehicles: room.vehicles.map((v) => (v.id === vehicleId ? updated : v)),
      updatedAt: now,
    };
    const integrity = validateRoomAssignments(nextRoom);
    if (!integrity.ok) return integrity;

    return ok(await this.repository.saveRoom(nextRoom));
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

    const nextRoom = {
      ...room,
      children: room.children.map((c) => (c.id === childId ? updated : c)),
      updatedAt: now,
    };
    const integrity = validateRoomAssignments(nextRoom);
    if (!integrity.ok) return integrity;

    return ok(await this.repository.saveRoom(nextRoom));
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

    const now = this.nowIso();
    const assignment: Assignment = {
      id: this.ids(),
      childId: candidate.value.childId,
      vehicleId: candidate.value.vehicleId,
      seatIndex: candidate.value.seatIndex,
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

  private applyReturnTripSetup(
    nextRoom: Room,
    previousRoom: Room,
    requestedSetup: UpdateSettingsRequest["returnTripSetup"],
  ): Result<Room> {
    const inboundWasAdded = !previousRoom.settings.inbound.enabled && nextRoom.settings.inbound.enabled;
    if (!inboundWasAdded) return ok(nextRoom);

    const setup = requestedSetup ?? "mirror-seats";
    if (setup === "empty") return ok(nextRoom);

    const addInbound = (directions: Direction[]) =>
      directions.includes("inbound") ? directions : [...directions, "inbound" as const];
    const vehicles = nextRoom.vehicles.map((vehicle) =>
      vehicle.directions.includes("outbound")
        ? { ...vehicle, directions: addInbound(vehicle.directions), updatedAt: nextRoom.updatedAt }
        : vehicle,
    );
    const children = nextRoom.children.map((child) =>
      child.directions.includes("outbound")
        ? { ...child, directions: addInbound(child.directions), updatedAt: nextRoom.updatedAt }
        : child,
    );

    if (setup === "same-participants") {
      return ok({ ...nextRoom, vehicles, children });
    }

    const outboundAssignments = nextRoom.assignments.filter((assignment) => assignment.direction === "outbound");
    const mirroredAssignments: Assignment[] = outboundAssignments.map((assignment) => ({
      ...assignment,
      id: this.ids(),
      direction: "inbound",
      createdAt: nextRoom.updatedAt,
    }));

    if (nextRoom.assignments.length + mirroredAssignments.length > ROOM_LIMITS.assignments) {
      return err("LIMIT_EXCEEDED", "This room has reached the assignment limit.");
    }

    return ok({
      ...nextRoom,
      vehicles,
      children,
      assignments: [...nextRoom.assignments, ...mirroredAssignments],
    });
  }
}
