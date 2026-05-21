import { addRoomTtl } from "../../domain/time";
import type { Room, RoomSettings } from "../../domain/types";
import type { RoomRepository } from "../../application/ports";

interface RoomRow extends Record<string, SqlStorageValue> {
  data: string;
}

// v2 schema: row stored under id='room_v2' in the room_state table.
// Old v1 rows (id='room') are ignored — there is no production data per ADR-0002.
const ROW_ID = "room_v2";

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
      vehicles: [],
      children: [],
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
    const row = this.sql
      .exec<RoomRow>("SELECT data FROM room_state WHERE id = ?", ROW_ID)
      .toArray()[0];
    if (!row) return undefined;
    return JSON.parse(row.data) as Room;
  }

  private writeRoom(room: Room): void {
    this.sql.exec(
      `
        INSERT INTO room_state (id, data, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
      `,
      ROW_ID,
      JSON.stringify(room),
      room.updatedAt,
    );
  }
}
