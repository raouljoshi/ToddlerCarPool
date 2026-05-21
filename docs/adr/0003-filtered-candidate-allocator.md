# ADR 0003: Filtered-Candidate Allocator (Suggested Matching)

## Status
Accepted

## Context
AGENTS.md §Implementation Requirements says:

> Manual allocation with clear hard warnings is v1. Auto-allocation and suggested matching require a separate ADR.

The v2 UX (see ADR-0002) replaces the v1 two-panel "Choose a child / Choose a compatible seat" interaction with a single-step "Pick a child from the queue → see a filtered list of candidate drivers → tap one to confirm" flow.

Although the parent still makes the final choice, the candidate list is computed by the system from a hard-filter rule. That is "suggested matching" under AGENTS.md's language and therefore requires this ADR.

## Decision
Add a domain-pure allocator function `getCandidateVehicles(room, childId, direction): Vehicle[]` that returns the subset of vehicles for which:

1. The vehicle serves `direction` (`direction ∈ vehicle.directions`).
2. The vehicle has at least one free seat for `direction` (count of assignments where `vehicleId = vehicle.id ∧ direction = direction` is less than `vehicle.seatCount`).
3. For every accessory type `A` in `child.borrows` that is true:
   - The vehicle offers `A` (`vehicle.lendsA === true`); AND
   - The remaining `A` capacity on `direction` is > 0, where remaining = `1 − count(otherAssignedChildren on this direction who also have borrows.A = true)`.

If any of (1), (2), or (3) fails for a vehicle, it is excluded from the candidate list.

The parent then picks one candidate. The use case `assignChild({ childId, vehicleId, direction })` re-runs the filter on the server (the room may have changed) and either creates the `Assignment` or returns a typed error:

- `VEHICLE_NOT_FOUND` — vehicle was deleted between candidate-list fetch and assign click.
- `DIRECTION_NOT_NEEDED_OR_OFFERED` — direction mismatch (race condition or stale UI state).
- `SEAT_ALREADY_ASSIGNED` — no free seat for direction.
- `INCOMPATIBLE_ACCESSORY` — accessory capacity exhausted or vehicle does not offer the requested accessory.

The "use same driver for the other direction" UI shortcut is a thin wrapper that calls `assignChild` once per direction with the same `vehicleId`. Each call goes through the same filter on the server, so an inconsistent state (e.g., the other direction's seat got taken in the meantime) returns a typed error and the UI surfaces it.

### Scope boundaries
- The allocator is **filtering**, not **ranking**. The candidate list is returned in a stable order (vehicles sorted by `createdAt`), not by any "best match" heuristic.
- There is **no automatic allocation**. The system never creates assignments without a parent's explicit tap.
- Cross-vehicle accessory pooling is **NOT** supported. A child can only be allocated to a vehicle whose own A5 offer includes every accessory the child borrows. If no single vehicle satisfies, the child stays in the queue with a "No compatible driver" empty state.
- An **Insights / swap-recommendation panel** that proposes child-swaps to unblock impossible allocations is acknowledged as a desirable follow-up but is **out of scope for v2** and will require its own ADR.

## Consequences

**Positive**
- Parents stop seeing incompatible candidates. The cognitive load of cross-referencing seat types and accessories drops to near zero.
- The same filter function powers (a) the candidate list, (b) the server-side guard in `assignChild`, and (c) the room-overview's "queue children with no compatible driver" indicator. One source of truth.
- The function is domain-pure, no Cloudflare or React imports, fully unit-testable.

**Negative / accepted**
- Filtering hides incompatible drivers. A parent looking for a specific driver who is filtered out may not understand why. Mitigated by: (a) showing the filter criteria in the queue-child header ("Anna · outbound · needs booster"); (b) the "no compatible driver" empty state explains the constraint.
- A child needing a borrow accessory that no current vehicle offers becomes "stuck" with no candidates. This is intentional — it surfaces the constraint to parents so they can either add a lending vehicle or have the child bring their own. The future Insights panel will help here but is not v2.

**Owner / removal condition**
This ADR governs the v2 allocator. Any auto-allocation, ranking heuristic, or cross-vehicle pooling requires a new ADR that supersedes the relevant section.
