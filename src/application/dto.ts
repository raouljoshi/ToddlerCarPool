import type { BorrowFlags, Direction, Room, RoomSettings } from "../domain/types";

export type RoomDto = Room;

export type CreateRoomRequest = Partial<RoomSettings>;

export type ReturnTripSetup = "mirror-seats" | "same-participants" | "empty";

export type UpdateSettingsRequest = Partial<RoomSettings> & {
  returnTripSetup?: ReturnTripSetup;
};

export interface ReservedRiderRequest {
  seatIndex: number;
  name: string;
}

export interface CreateVehicleRequest {
  driverName: string;
  seatCount: number;
  directions: Direction[];
  lendsBooster?: boolean;
  lendsRearFacing?: boolean;
  lendsFrontFacing?: boolean;
  reservedRiders?: ReservedRiderRequest[];
}

export interface UpdateVehicleRequest {
  driverName?: string;
  directions?: Direction[];
  lendsBooster?: boolean;
  lendsRearFacing?: boolean;
  lendsFrontFacing?: boolean;
}

export interface CreateChildRequest {
  name: string;
  directions: Direction[];
  borrows?: Partial<BorrowFlags>;
}

export interface UpdateChildRequest {
  name?: string;
  directions?: Direction[];
  borrows?: Partial<BorrowFlags>;
}

export interface AssignChildRequest {
  childId: string;
  vehicleId: string;
  direction: Direction;
  seatIndex: number;
}
