import { validateAssignment } from "../domain/allocation";
import { err, ok, type Result } from "../domain/result";
import { isExpired } from "../domain/time";
import type { Assignment, FamilyEntry, Room } from "../domain/types";
import { validateFamilyInput, validateFamilyUpdateInput, validateSettings } from "../domain/validation";
import type { IdFactory } from "../domain/id";
import type { AssignmentRequest, CreateRoomRequest, FamilyRequest, UpdateSettingsRequest } from "./dto";
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
    if (isExpired(room.expiresAt, this.clock.now())) return err("ROOM_EXPIRED", "This room has expired.");
    return ok(room);
  }

  async updateSettings(request: UpdateSettingsRequest): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    const settings = validateSettings({ ...roomResult.value.settings, ...request });
    if (!settings.ok) return settings;
    return ok(await this.repository.saveRoom({ ...roomResult.value, settings: settings.value, updatedAt: this.nowIso() }));
  }

  async addFamily(request: FamilyRequest): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    const input = validateFamilyInput(request, roomResult.value.families);
    if (!input.ok) return input;

    const now = this.nowIso();
    const family: FamilyEntry = {
      id: this.ids(),
      displayLabel: input.value.displayLabel,
      children: input.value.children.map((child) => ({ ...child, id: this.ids() })),
      seatOffers: input.value.seatOffers.map((seat) => ({ ...seat, id: this.ids() })),
      notes: input.value.notes ?? {},
      createdAt: now,
      updatedAt: now,
    };

    return ok(
      await this.repository.saveRoom({
        ...roomResult.value,
        families: [...roomResult.value.families, family],
        updatedAt: now,
      }),
    );
  }

  async updateFamily(familyId: string, request: FamilyRequest): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    const existingFamily = roomResult.value.families.find((family) => family.id === familyId);
    if (!existingFamily) return err("FAMILY_NOT_FOUND", "Family was not found.");

    const input = validateFamilyUpdateInput(request, roomResult.value.families, familyId);
    if (!input.ok) return input;

    const children = input.value.children.map((child) => ({
      ...child,
      id: existingFamily.children.find((existing) => existing.label === child.label)?.id ?? this.ids(),
    }));
    const seatOffers = input.value.seatOffers.map((seat) => ({
      ...seat,
      id: existingFamily.seatOffers.find((existing) => existing.label === seat.label)?.id ?? this.ids(),
    }));

    const validChildIds = new Set(children.map((child) => child.id));
    const validSeatIds = new Set(seatOffers.map((seat) => seat.id));
    const updatedFamily: FamilyEntry = {
      ...existingFamily,
      displayLabel: input.value.displayLabel,
      children,
      seatOffers,
      notes: input.value.notes ?? {},
      updatedAt: this.nowIso(),
    };

    const updatedRoom: Room = {
      ...roomResult.value,
      families: roomResult.value.families.map((family) => (family.id === familyId ? updatedFamily : family)),
      assignments: roomResult.value.assignments.filter(
        (assignment) => validChildIds.has(assignment.childId) && validSeatIds.has(assignment.seatId),
      ),
      updatedAt: this.nowIso(),
    };

    return ok(await this.repository.saveRoom(updatedRoom));
  }

  async deleteFamily(familyId: string): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    if (!roomResult.value.families.some((family) => family.id === familyId)) {
      return err("FAMILY_NOT_FOUND", "Family was not found.");
    }

    const family = roomResult.value.families.find((item) => item.id === familyId);
    const childIds = new Set(family?.children.map((child) => child.id) ?? []);
    const seatIds = new Set(family?.seatOffers.map((seat) => seat.id) ?? []);

    return ok(
      await this.repository.saveRoom({
        ...roomResult.value,
        families: roomResult.value.families.filter((item) => item.id !== familyId),
        assignments: roomResult.value.assignments.filter(
          (assignment) => !childIds.has(assignment.childId) && !seatIds.has(assignment.seatId),
        ),
        updatedAt: this.nowIso(),
      }),
    );
  }

  async assignSeat(request: AssignmentRequest): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    const candidate = validateAssignment(roomResult.value, request);
    if (!candidate.ok) return candidate;

    const assignment: Assignment = {
      id: this.ids(),
      ...candidate.value,
      createdAt: this.nowIso(),
    };

    return ok(
      await this.repository.saveRoom({
        ...roomResult.value,
        assignments: [...roomResult.value.assignments, assignment],
        updatedAt: this.nowIso(),
      }),
    );
  }

  async deleteAssignment(assignmentId: string): Promise<Result<Room>> {
    const roomResult = await this.getRoom();
    if (!roomResult.ok) return roomResult;
    return ok(
      await this.repository.saveRoom({
        ...roomResult.value,
        assignments: roomResult.value.assignments.filter((assignment) => assignment.id !== assignmentId),
        updatedAt: this.nowIso(),
      }),
    );
  }

  private nowIso(): string {
    return this.clock.now().toISOString();
  }
}
