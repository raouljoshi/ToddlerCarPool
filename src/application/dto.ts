import type { Direction, Room, RoomSettings, SeatType, TripNotes } from "../domain/types";

export type RoomDto = Room;

export interface CreateRoomRequest {
  label?: string;
  outboundLabel?: string;
  inboundLabel?: string;
}

export type UpdateSettingsRequest = Partial<RoomSettings>;

export interface FamilyRequest {
  displayLabel: string;
  children: Array<{
    label: string;
    directions: Direction[];
    seatType: SeatType;
    note?: string;
  }>;
  seatOffers: Array<{
    label: string;
    directions: Direction[];
    seatType: SeatType;
    note?: string;
  }>;
  notes?: TripNotes;
}

export interface AssignmentRequest {
  childId: string;
  seatId: string;
  direction: Direction;
}
