# ADR 0002: V2 Data Model — Vehicle / Child / Assignment

## Status
Accepted

## Context
The v1 data model is family-centric: a `FamilyEntry` owns a list of `ChildNeed`s and a list of `SeatOffer`s. Allocation hard-matches `child.seatType === seat.seatType`. This model conflates two real-world distinctions:

1. A **vehicle** (the car + driver + a fixed seat count) is one entity.
2. A **child** (someone who needs a ride) is another entity, and may or may not belong to the driver's own family.

It also assumes every seat has a permanently-installed seat-type (regular / booster / front-facing / rear-facing), which is not how families coordinate in practice: families bring spare boosters and lend them across cars on a per-trip basis.

The UX consequences in v1:
- Adding "a family" forces the user to think in terms of an artificial grouping, even when a parent only wants to add a vehicle, or only a queue child.
- Seat-type compatibility is too coarse — it blocks otherwise valid allocations where the child or another parent could supply the missing accessory.
- Reserved-seat status (driver's own kids riding in their own car) has no first-class representation; it must be done post-hoc through manual allocation.

## Decision
Replace the v1 data model with a v2 model whose top-level entities are `Vehicle`, `Child`, `Assignment`, and a settings sub-record `DirectionMeta` per direction. Drop `FamilyEntry`, `SeatOffer`, and `ChildNeed` entirely.

### v2 domain types (src/domain/types.ts)

```ts
export type Direction = "outbound" | "inbound";
export type AccessoryType = "booster" | "rearFacing" | "frontFacing";
export type AllocationStatus = "unallocated" | "partially-allocated" | "fully-allocated";
export type TimeReference = "departure" | "arrival";

export interface DirectionMeta {
  enabled: boolean;
  time?: string;              // "HH:MM" 24h
  timeReference?: TimeReference;
  info?: string;
}

export interface RoomSettings {
  label: string;
  staticInfo?: string;
  mapLink?: string;
  outbound: DirectionMeta;
  inbound: DirectionMeta;
}

export interface Vehicle {
  id: string;
  driverName: string;
  seatCount: number;          // 1..9
  directions: Direction[];    // subset of room.settings enabled directions
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
  borrows: { booster: boolean; rearFacing: boolean; frontFacing: boolean };
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  childId: string;
  vehicleId: string;
  seatIndex: number;          // 0..seatCount-1
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

export const ROOM_LIMITS = {
  vehicles: 30,
  children: 100,
  assignments: 200,
  seatsPerVehicle: 9,
} as const;
```

### Reserved-seat representation
When the Add-Vehicle wizard (A) saves a vehicle with N seats and some seats reserved with a name label, the use case:
1. Creates the `Vehicle` row.
2. For each reserved seat, creates a `Child` row (with `directions = vehicle.directions`, `borrows = {}`).
3. For each (reserved Child × every direction the Vehicle serves), creates an `Assignment`.

This keeps the model uniform: every rider is a `Child` and every seat occupancy is an `Assignment`. Deleting a vehicle deletes the vehicle's Assignments but **preserves** the Child entities — they fall back into the queue.

### New error codes (additions to AGENTS.md §Result And Error Contracts)
- `VEHICLE_NOT_FOUND`
- `INCOMPATIBLE_ACCESSORY` — emitted by the allocator when the chosen vehicle cannot supply a borrow accessory the child requested (see ADR-0003).
- `VEHICLE_HAS_ASSIGNMENTS` — emitted by `updateVehicle` / certain `deleteVehicle` paths when the operation would orphan data (e.g., shrinking seat count below the highest assigned index, or editing a field while assignments exist).
- `CHILD_HAS_ASSIGNMENTS` — emitted by `updateChild` when the child still has any assignment (edit allowed only while in queue).

Existing codes preserved: `ROOM_NOT_FOUND`, `ROOM_EXPIRED`, `VALIDATION_ERROR`, `CHILD_NOT_FOUND`, `SEAT_ALREADY_ASSIGNED`, `DIRECTION_NOT_NEEDED_OR_OFFERED`, `LIMIT_EXCEEDED`. `SEAT_NOT_FOUND` is repurposed (now means invalid `seatIndex`).

### Limit changes
- `vehicles: 30` (was `seats: 30` in v1).
- `seatsPerVehicle: 9` (new).
- `children: 100` (unchanged).
- `assignments: 200` (unchanged).
- v1 `families: 40` is dropped (no family concept).

### Migration
None. There is no production deployment. Rooms expire 30 days after creation. The Durable Object SQL schema is recreated from scratch (`DROP TABLE … CREATE TABLE …` in the repository's `setupSchema()` path). The new Durable Objects are deterministically named by room code, so old rooms route to fresh-schema instances on first request.

## Consequences

**Positive**
- One uniform "rider" concept (`Child`) — no special-case for driver's own kids.
- Allocator math becomes a simpler per-direction per-vehicle decrement.
- Bilingual labels simplified — no per-family display label to translate.
- The Add affordance becomes a binary choice (vehicle vs child), matching parents' mental model.
- Seat-type compatibility moves out of the seat itself and into a per-vehicle accessory pool (ADR-0003), which matches real-world coordination.

**Negative / accepted costs**
- All v1 routes, use cases, and tests must be rewritten. Mitigated by the no-production-data rule.
- New error codes expand the surface area of the public API. Documented in this ADR.
- Schema rewrite means any in-memory v1 Durable Objects in dev environments will lose data on first v2 boot. Acceptable for a no-users state.

**Owner / removal condition**
This ADR is permanent. It supersedes the v1 model entirely. Future model changes must add a new ADR; do not amend this one.
