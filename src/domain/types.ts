export type Direction = "outbound" | "inbound";

export type SeatType = "regular" | "booster" | "front-facing" | "rear-facing";

export type AllocationStatus = "unallocated" | "partially-allocated" | "fully-allocated";

export interface RoomSettings {
  label: string;
  staticInfo?: string;
  mapLink?: string;
  outboundEnabled: boolean;
  outboundLabel: string;
  outboundInfo?: string;
  inboundEnabled: boolean;
  inboundLabel: string;
  inboundInfo?: string;
}

export interface Room {
  code: string;
  settings: RoomSettings;
  createdAt: string;
  expiresAt: string;
  families: FamilyEntry[];
  assignments: Assignment[];
  updatedAt: string;
}

export interface FamilyEntry {
  id: string;
  displayLabel: string;
  children: ChildNeed[];
  seatOffers: SeatOffer[];
  notes: TripNotes;
  createdAt: string;
  updatedAt: string;
}

export interface TripNotes {
  outbound?: string;
  inbound?: string;
}

export interface ChildNeed {
  id: string;
  label: string;
  directions: Direction[];
  seatType: SeatType;
  note?: string;
}

export interface SeatOffer {
  id: string;
  label: string;
  directions: Direction[];
  seatType: SeatType;
  note?: string;
}

export interface Assignment {
  id: string;
  childId: string;
  seatId: string;
  direction: Direction;
  createdAt: string;
}

export interface AssignmentCandidate {
  childId: string;
  seatId: string;
  direction: Direction;
}

export interface ChildAllocation {
  child: ChildNeed;
  family: FamilyEntry;
  status: AllocationStatus;
  missingDirections: Direction[];
  assignments: Assignment[];
}

export interface SeatAvailability {
  seat: SeatOffer;
  family: FamilyEntry;
  direction: Direction;
  assignment?: Assignment;
}

export const ROOM_LIMITS = {
  families: 40,
  children: 100,
  seats: 30,
  assignments: 200,
} as const;

export const ROOM_TTL_DAYS = 30;
