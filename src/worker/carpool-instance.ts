import { DurableObject } from "cloudflare:workers";
import { RoomUseCases, type UseCaseClock } from "../application/use-cases";
import type { AssignmentRequest, CreateRoomRequest, FamilyRequest, UpdateSettingsRequest } from "../application/dto";
import { createCryptoId } from "../domain/id";
import type { Result } from "../domain/result";
import type { Room } from "../domain/types";
import { DurableObjectRoomRepository } from "../adapters/durable-object/room-repository";

export type CarpoolInstanceEnv = object;

class SystemClock implements UseCaseClock {
  now(): Date {
    return new Date();
  }
}

export class CarpoolInstance extends DurableObject<CarpoolInstanceEnv> {
  private readonly repository: DurableObjectRoomRepository;
  private readonly useCases: RoomUseCases;

  constructor(ctx: DurableObjectState, env: CarpoolInstanceEnv) {
    super(ctx, env);
    const roomCode = this.ctx.id.name ?? "UNKNOWN";
    this.repository = new DurableObjectRoomRepository(this.ctx.storage.sql, roomCode, (timestamp) =>
      this.ctx.storage.setAlarm(timestamp),
    );
    this.useCases = new RoomUseCases(this.repository, createCryptoId, new SystemClock());
    this.ctx.blockConcurrencyWhile(async () => {
      this.repository.initialize();
    });
  }

  async createRoom(request: CreateRoomRequest): Promise<Result<Room>> {
    return this.useCases.createRoom(request);
  }

  async getRoom(): Promise<Result<Room>> {
    return this.useCases.getRoom();
  }

  async updateSettings(request: UpdateSettingsRequest): Promise<Result<Room>> {
    return this.useCases.updateSettings(request);
  }

  async addFamily(request: FamilyRequest): Promise<Result<Room>> {
    return this.useCases.addFamily(request);
  }

  async updateFamily(familyId: string, request: FamilyRequest): Promise<Result<Room>> {
    return this.useCases.updateFamily(familyId, request);
  }

  async deleteFamily(familyId: string): Promise<Result<Room>> {
    return this.useCases.deleteFamily(familyId);
  }

  async assignSeat(request: AssignmentRequest): Promise<Result<Room>> {
    return this.useCases.assignSeat(request);
  }

  async deleteAssignment(assignmentId: string): Promise<Result<Room>> {
    return this.useCases.deleteAssignment(assignmentId);
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
