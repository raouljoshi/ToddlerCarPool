import type { Room, RoomSettings } from "../domain/types";

export interface RoomRepository {
  createRoom(settings: RoomSettings, now: Date): Promise<Room>;
  getRoom(code: string, now: Date): Promise<Room | undefined>;
  saveRoom(room: Room): Promise<Room>;
  deleteRoom(): Promise<void>;
}
