import { addRoomTtl } from "../../domain/time";
import type { Room, RoomSettings } from "../../domain/types";
import type { RoomRepository } from "../../application/ports";

interface RoomRow extends Record<string, SqlStorageValue> {
  data: string;
}

export class DurableObjectRoomRepository implements RoomRepository {
  constructor(
    private readonly sql: DurableObjectStorage["sql"],
    private readonly roomCode: string,
    private readonly setAlarm: (timestamp: number) => Promise<void>,
  ) {}

  initialize(): void {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS room_state (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  async createRoom(settings: RoomSettings, now: Date): Promise<Room> {
    const existing = this.readRoom();
    if (existing) return existing;

    const expiresAt = addRoomTtl(now);
    const room: Room = {
      code: this.roomCode,
      settings,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      updatedAt: now.toISOString(),
      families: [],
      assignments: [],
    };
    this.writeRoom(room);
    await this.setAlarm(expiresAt.getTime());
    return room;
  }

  async getRoom(): Promise<Room | undefined> {
    return this.readRoom();
  }

  async saveRoom(room: Room): Promise<Room> {
    this.writeRoom(room);
    return room;
  }

  async deleteRoom(): Promise<void> {
    await Promise.resolve();
  }

  private readRoom(): Room | undefined {
    const row = this.sql.exec<RoomRow>("SELECT data FROM room_state WHERE id = 'room'").toArray()[0];
    if (!row) return undefined;
    return JSON.parse(row.data) as Room;
  }

  private writeRoom(room: Room): void {
    this.sql.exec(
      `
        INSERT INTO room_state (id, data, updated_at)
        VALUES ('room', ?, ?)
        ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
      `,
      JSON.stringify(room),
      room.updatedAt,
    );
  }
}
