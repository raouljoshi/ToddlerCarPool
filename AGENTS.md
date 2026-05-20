# ToddlerCarPool Architecture Constitution

ToddlerCarPool is a mobile-first, bilingual carpool planning tool for parents. The product is intentionally small: no accounts, no contact fields, no legal safety advice, no drag-only workflows, and no long-lived data.

## Product Principles
- Parents coordinate through generated room codes or share links. Anyone with the room code can view and edit the room.
- Store display labels or nicknames only. Do not add account, password, phone, email, analytics identity, or contact-management features.
- Rooms expire from the live app 30 days after creation. Product copy may promise live-app deletion, but must not promise provider-backup erasure unless verified separately.
- All user-facing flows must work on mobile without drag and drop. Tap-to-assign is the primary allocation interaction.
- English and Swedish copy must be supported from the start through explicit copy keys and a persistent language toggle.
- The app coordinates stated capacity and requirements only. It must not claim to verify legal car-seat compliance.

## Layer Model
- `src/domain`: pure business entities, policies, and validation helpers.
- `src/application`: use cases, ports, typed results, stable error codes, and orchestration.
- `src/adapters`: infrastructure implementations, persistence mapping, and platform-specific adapter code.
- `src/routes`: Worker HTTP request/response mapping.
- `src/ui`: React presentation, local UI state, copy, and browser-only behavior.
- `src/worker`: Cloudflare Worker entrypoint, Durable Object composition, and runtime binding setup.

## Dependency Direction
- Inner layers must not import outer layers.
- `src/domain` imports no ToddlerCarPool runtime, React, Worker, Durable Object, storage, or browser APIs.
- `src/application` may import `src/domain` and internal application modules only.
- `src/adapters` may import `src/application` and `src/domain`; adapter code may use Cloudflare runtime APIs only inside adapter or worker-owned modules.
- `src/routes` may import `src/application`, `src/adapters`, and `src/domain` for DTO mapping, but must not contain business rules.
- `src/ui` must not import Cloudflare Worker, Durable Object, or adapter modules. UI calls HTTP APIs through browser-safe clients.
- `src/worker` composes routes and adapters. It may depend outward on Cloudflare runtime APIs.

## Cloudflare Architecture
- Host the React app with Cloudflare Workers Static Assets.
- Use one SQLite-backed Durable Object per room code as the source of truth.
- Durable Objects own room persistence, SQLite schema setup, expiry alarms, and live-data deletion.
- Use deterministic room routing from normalized room codes. Do not use one global Durable Object for all rooms.
- Use Worker/Durable Object bindings instead of Cloudflare REST calls from runtime code.
- Set a compatibility date of `2026-02-24` or later so Durable Object `deleteAll()` alarm behavior matches the retention design.

## Data And Privacy Rules
- Room-level data includes label, outbound/inbound labels, creation time, expiry time, families, children, seat offers, assignments, and optional pickup/dropoff text or map links.
- Optional notes and links are plain user input. Validate length and URL shape, but do not fetch, preview, enrich, geocode, or track links.
- Default v1 caps: 40 families, 100 children, 30 vehicles, and 200 assignments per room.
- User-provided strings must be bounded, trimmed, and rendered as text. Do not use user content as HTML.

## Result And Error Contracts
- Use cases return typed `Result` values instead of throwing for expected product failures.
- Stable error codes include: `ROOM_NOT_FOUND`, `ROOM_EXPIRED`, `VALIDATION_ERROR`, `FAMILY_NOT_FOUND`, `CHILD_NOT_FOUND`, `SEAT_NOT_FOUND`, `SEAT_ALREADY_ASSIGNED`, `INCOMPATIBLE_SEAT`, `DIRECTION_NOT_NEEDED_OR_OFFERED`, and `LIMIT_EXCEEDED`.
- Public API responses must not expose Cloudflare, SQLite, Durable Object, or framework-specific types.

## ADR And Exception Governance
- Add a lightweight ADR for any new infrastructure dependency, changed layer responsibility, cross-layer API, or intentional boundary exception.
- Boundary exceptions must name an owner, removal condition, and the smallest possible scope.
- Exceptions are temporary by default unless the ADR explains why the dependency still points inward.

## Feature Plan Requirements
Every feature plan must include:
1. Affected layers and dependency-direction check.
2. New or changed ports, adapters, routes, contracts, and UI surfaces.
3. Failure modes and rollback path.
4. Test impact by layer.
5. Performance and memory impact.
6. End-user perspective research and final mobile UX validation for UI-facing work.

## Required Checks
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- `corepack pnpm run check:architecture`
- `corepack pnpm run check:agents`

## Implementation Requirements
- No direct Durable Object, SQLite, or Cloudflare binding orchestration in React UI.
- No drag-only allocation feature. Any drag interaction must have a tap/click alternative.
- No contact fields, account management, or persistent user profiles in v1.
- Manual allocation with clear hard warnings is v1. Auto-allocation and suggested matching require a separate ADR.
- GitHub Actions deployment requires secrets to be configured by the repository owner.
