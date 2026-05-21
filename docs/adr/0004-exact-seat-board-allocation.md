# ADR 0004: Exact-Seat Board Allocation

## Status
Accepted

## Context

ADR-0003 introduced a filtered candidate allocator: parents pick a child, see compatible drivers, then tap a driver to confirm. That reduced compatibility work, but the next UX direction is a visual carpool board where parents place a waiting child into a specific visible seat.

The flight-seat-map interaction depends on the tapped seat being real. If the UI lets a parent tap seat 3 but the server assigns the next available seat, the board feels untrustworthy and the child can appear somewhere other than the place the parent chose.

ToddlerCarPool still must remain small:

- no accounts, roles, or organizer privileges
- no auto-allocation
- no drag-only workflow
- no legal safety/compliance claims
- no new infrastructure dependency

## Decision

Change assignment from "choose a compatible vehicle" to "choose a compatible exact seat." `AssignChildRequest` now includes `seatIndex`.

The domain assignment candidate becomes:

```ts
{
  childId: string;
  vehicleId: string;
  direction: Direction;
  seatIndex: number;
}
```

`validateAssignment` must reject:

- unknown child
- unknown vehicle
- direction mismatch
- child already seated for the direction
- invalid seat index (`SEAT_NOT_FOUND`)
- already occupied seat (`SEAT_ALREADY_ASSIGNED`)
- exhausted/missing accessory capacity (`INCOMPATIBLE_ACCESSORY`)
- room assignment limit (`LIMIT_EXCEEDED`)

The current candidate filtering remains useful as a coarse compatibility helper for existing UI and future board highlighting, but it no longer defines the final interaction. Final assignment is manual and exact: the parent taps a seat, and the server validates that exact seat before creating the `Assignment`.

## Consequences

**Positive**

- Supports the visual carpool board interaction directly.
- Keeps assignment manual and transparent.
- Makes seat conflicts precise and easy to explain inline.
- Preserves the current storage shape because `Assignment` already stores `seatIndex`.

**Negative / accepted**

- Public API payload changes for assignment creation.
- Existing allocation UI must pass an explicit first-free seat until the board UI replaces it.
- Tests must cover invalid and occupied exact seats separately.

## Relationship To ADR-0003

This ADR narrows ADR-0003. Filtering remains a domain helper, but the user-facing assignment interaction is no longer "pick a driver from candidates." It becomes "tap child, then tap an exact compatible seat." There is still no automatic allocation, ranking, or optimization.

## Owner / Removal Condition

Owner: ToddlerCarPool maintainers.

Removal condition: a future ADR replaces the board-first exact-seat allocation model with another manual interaction model.

