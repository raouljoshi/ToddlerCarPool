export type Direction = "outbound" | "inbound";

export type AccessoryType = "booster" | "rearFacing" | "frontFacing";

export type AllocationStatus = "unallocated" | "partially-allocated" | "fully-allocated";

export type TimeReference = "departure" | "arrival";

export interface DirectionMeta {
  enabled: boolean;
  time?: string;
  timeReference?: TimeReference;
  info?: string;
}

export interface RoomSettings {
  label: string;
  date?: string;
  staticInfo?: string;
  mapLink?: string;
  outbound: DirectionMeta;
  inbound: DirectionMeta;
}

export interface BorrowFlags {
  booster: boolean;
  rearFacing: boolean;
  frontFacing: boolean;
}

export interface Vehicle {
  id: string;
  driverName: string;
  seatCount: number;
  directions: Direction[];
  lendsBooster: boolean;
  lendsRearFacing: boolean;
  lendsFrontFacing: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Child {
  id: string;
  name: string;
  directions: Direction[];
  borrows: BorrowFlags;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  childId: string;
  vehicleId: string;
  seatIndex: number;
  direction: Direction;
  createdAt: string;
}

export interface Room {
  code: string;
  settings: RoomSettings;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
  vehicles: Vehicle[];
  children: Child[];
  assignments: Assignment[];
}

export interface ChildAllocation {
  child: Child;
  status: AllocationStatus;
  missingDirections: Direction[];
  assignments: Assignment[];
}

export type SeatSlotState =
  | { kind: "empty" }
  | { kind: "assigned"; childId: string; assignmentId: string };

export interface SeatSlot {
  index: number;
  state: SeatSlotState;
}

export const ROOM_LIMITS = {
  vehicles: 30,
  children: 100,
  assignments: 200,
  seatsPerVehicle: 5,
} as const;

export const ROOM_TTL_DAYS = 30;

export const ACCESSORY_TYPES: AccessoryType[] = ["booster", "rearFacing", "frontFacing"];
export const DIRECTIONS: Direction[] = ["outbound", "inbound"];

export const EMPTY_BORROWS: BorrowFlags = {
  booster: false,
  rearFacing: false,
  frontFacing: false,
};
