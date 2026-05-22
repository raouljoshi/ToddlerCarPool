# Visual Carpool Board Redesign Execution Playbook

## Goal

Redesign ToddlerCarPool around a visual, mobile-first carpool board. The primary mental model should be: parents place children who are waiting for a seat into specific seats in cars.

The redesign is inspired by the stronger object-first interaction model in the local `piggybank` project. Piggybank feels friendlier because the main state is a visible object that changes directly. ToddlerCarPool should achieve the same kind of clarity with cars, seats, waiting children, and direction-specific boards.

## Product Decisions

- The room home screen becomes a visual carpool board.
- The board shows one trip direction at a time.
- User-facing trip labels are `There` and `Home` in English, `Dit` and `Hem` in Swedish. Domain names stay `outbound` and `inbound`.
- Assignment flow is tap child, then tap exact seat.
- The backend assignment contract must accept `seatIndex`; the tapped seat must be the assigned seat.
- All seats remain visible when a child is selected. Compatible empty seats are active, incompatible empty seats are subdued with a reason on tap, and occupied seats show rider names.
- Reserved riders are occupied seats from the start.
- Adding cars, children, room details, and seat actions happens through bottom sheets over the board.
- The add-car flow uses a visual seat layout picker, not a plain number-first input.
- The waiting children queue is a clear tray labeled `Waiting for a seat`, with child-name tokens and a small people/waiting icon.
- On mobile, waiting children live in a sticky bottom tray. On wider screens, the tray can become a side or upper panel.
- Cars stack vertically on mobile and become a responsive grid on wider screens.
- The room remains fully co-editable by anyone with the room code. No organizer/admin privileges.
- Shared links prefill the room code but still require tapping `Enter room`.
- Room code copy must be honest: anyone with the code can view and edit.
- Joining an existing room lands on the board after the code gate.
- Room creation is short: event name and trip directions only.
- Optional notes, map link, times, expiry, and share actions live in a `Trip details` sheet.
- Room code stays visible as a compact board header pill.
- New cars and children default to all currently enabled room directions.
- If a return trip is added later, show an explicit initialization sheet:
  - recommended: use same cars, children, and seats
  - use same cars and children, but leave seats open
  - start Home trip empty
- No preview is needed for return-trip mirroring.
- After assigning in one direction, if the same seat is available for the other enabled direction, show a bottom sheet shortcut to use the same seat there.
- Do not auto-select the next waiting child after assignment.
- No assignment undo toast. The correction flow is tap occupied seat, then move the rider back to waiting.
- Occupied-seat interactions focus on seating only. Removing a child from the room is available from the waiting child sheet, not directly from a seat.
- Reassignment starts by moving a child back to waiting, then assigning them again.
- Board shows waiting count and quieter capacity summary per direction.
- Failed assignments should use inline board feedback where possible.
- Poll room state while the board is open, but pause polling while an unsaved sheet/form is open.
- Successful create/add/assign actions simply update the board. No success toast unless something fails.
- Add small purposeful motion for selected child state, compatible seat highlights, seat placement, sheets, and feedback. Respect `prefers-reduced-motion`.
- Keep icons local lightweight components for now; do not add an icon package unless a future ADR justifies it.
- Keep the warm visual base, but introduce clearer semantic direction and seat-state colors.

## Non-Goals

- Accounts, admins, roles, or permissions.
- Contact fields, phone numbers, email addresses, or persistent profiles.
- Legal car-seat compliance claims.
- Auto-allocation, ranked suggestions, or optimization.
- Drag-only workflows.
- Long-lived audit history.
- Map previews, geocoding, link enrichment, or fetched metadata.
- Analytics or tracking identity.
- Mascot character. Use warm car/seat imagery instead.

## Affected Layers

### `src/domain`

- Add exact-seat validation for assignment candidates.
- Preserve pure business logic with no React, Worker, Durable Object, browser, or storage APIs.
- Add helper(s) for seat compatibility and incompatibility reasons so the UI and server share one source of truth.
- Adjust edit validation rules so safe edits can happen while assigned, while dangerous edits are blocked.

### `src/application`

- Update `AssignChildRequest` handling to require or accept `seatIndex`.
- Add use-case support for exact-seat assignment.
- Add return-trip mirroring use case if the implementation needs multi-entity updates beyond simple settings changes.
- Keep expected product failures as typed `Result` values.

### `src/adapters`

- Persistence likely remains compatible because `Assignment` already stores `seatIndex`.
- No direct UI dependency.
- No new Cloudflare REST usage.

### `src/routes`

- Public API contract changes for assignment payloads.
- Error responses must remain framework/cloud-provider neutral.

### `src/ui`

- Replace overview/list allocation with board-first UI.
- Add bottom sheets for create/edit and details flows.
- Add local icon components.
- Add board state for selected child, selected direction, open sheets, inline failures, and polling pause/resume.
- Preserve bilingual copy through explicit copy keys.

### `src/worker`

- Likely no structural changes beyond delegating new/changed use cases.

## Dependency Direction Check

- Domain imports no outer layers.
- Application imports domain/application modules only.
- UI calls browser-safe API clients only.
- Worker composes routes/adapters/use cases.
- Any intentional boundary exception requires an ADR, owner, removal condition, and smallest possible scope.

## ADR Requirements

Add a lightweight ADR before implementation begins:

- Exact-seat assignment contract.
- Board-first tap child -> tap seat allocation model.
- How it supersedes or narrows ADR-0003's filtered candidate interaction.
- Why this is still manual allocation, not auto-allocation.
- Safe edit rules for assigned cars/children.
- Return-trip mirroring behavior if implemented as a cross-layer use case.

No ADR is needed for local hand-authored icons unless a new dependency is introduced.

## Main Mobile Wireframes

### Join / Create

```text
ToddlerCarPool                    EN/SV

        [friendly car/seat visual]

Room code
[ ABC12345                         ]
[ Enter room                       ]

Anyone with this code can view and edit.

Create a new room
```

### Quick Room Creation

```text
Create a room

What are we planning?
[ Birthday party                   ]

Trips
[ There ] [ Home ]

[ Create room                      ]
```

### Empty Board

```text
Birthday party              Code ABC123
[ There ] [ Home ]

No cars yet
Add your car to create the first seats.

[ Add your car                    ]
[ Add a child instead             ]

Waiting for a seat
No children yet
```

### Active Board

```text
Birthday party              Code ABC123
[ There 3 ] [ Home all seated ]
3 waiting        5 open seats

Maria
[ Leo ][ empty ][ empty ]
[ Alma ][ empty ][ empty ]
Booster available

Jonas
[ empty ][ empty ][ empty ]

Waiting for a seat
[ Sam ][ Noor ][ Eli ]
```

### Selected Child

```text
Birthday party              Code ABC123
[ There ] [ Home ]

Sam selected      Needs booster

Maria
[ Leo ][ + ][ + ]
[ Alma ][ disabled: no booster ]

Jonas
[ + ][ + ][ + ]

Waiting for a seat
[ Sam selected ]        Cancel
```

### Occupied Seat Sheet

```text
Leo
There trip with Maria
Seat 1

[ Move back to waiting            ]
[ Edit child                      ]
[ Cancel                          ]
```

### Add Car Sheet

```text
Add your car

Driver name
[ Maria                           ]

Passenger seats
[-] 3 [+]

[ seat ][ seat ][ seat ]
Tap a seat to reserve it.

Trips
[ There selected ] [ Home selected ]

Extras you can lend
[ Booster ] [ Rear-facing ] [ Front-facing ]

[ Add car                         ]
```

### Add Child Sheet

```text
Add a child

Child name
[ Sam                             ]

Trips needed
[ There selected ] [ Home selected ]

Needs to borrow
[ Booster ] [ Rear-facing ] [ Front-facing ]

[ Add to waiting                  ]
```

### Trip Details Sheet

```text
Trip details

Event name
[ Birthday party                  ]

Trips
[ There ] [ Home ]

Times, notes, map link
[ optional fields...              ]

Room code ABC123
[ Copy code ] [ Copy link ]

Removed from app on May 20, 2026
```

### Return Trip Added

```text
Home trip added

How should Home start?

[ Use same cars, children, and seats ]
[ Use same cars and children only    ]
[ Start Home trip empty              ]
```

## Implementation Stages

### Stage 1: ADR And Exact-Seat Backend Contract

- Add ADR for exact-seat board allocation.
- Update `AssignChildRequest` with `seatIndex`.
- Add domain validation for `seatIndex` range and occupancy.
- Preserve existing UI by passing the first free seat until the board is built.
- Add domain/application/route tests.
- Run required checks for touched layers.

### Stage 2: Board Skeleton

- Add board route/view behind the current room overview surface or replace overview in one focused pass.
- Add direction switcher with waiting/open counts.
- Add car seat-map cards.
- Add waiting tray.
- Add compact code/share header.
- Add local icon components.
- Validate empty room, car-only, child-only, and active board states in the in-app browser.

### Stage 3: Bottom Sheet Forms

- Convert add/edit car to bottom sheet with visual seat picker.
- Convert add/edit child to bottom sheet with visual chips.
- Add trip details/share sheet.
- Keep sheets mobile-first and accessible.
- Pause polling while sheets have unsaved edits.

### Stage 4: Seat Assignment Interaction

- Implement tap child -> tap exact seat.
- Highlight compatible seats and show subdued incompatible seats.
- Add inline incompatibility reasons.
- Add occupied-seat sheet with move-back-to-waiting.
- Add same-seat-for-other-direction bottom sheet shortcut.
- Remove old candidate-list allocation UI.

### Stage 5: Return Trip Mirroring And Safer Edits

- Add explicit return-trip initialization options.
- Implement mirroring for cars/children/seats.
- Allow safe edits while assigned.
- Block only edits that invalidate existing assignments.
- Update copy so destructive actions explain visible outcomes.

### Stage 6: Polish, Copy, And Validation

- English and Swedish copy pass.
- Motion pass with reduced-motion support.
- Narrow viewport stress pass at 360 x 740.
- Primary mobile pass at 390 x 844.
- Full required checks.
- Fix visual rough edges found in browser validation.

## Iterative Browser Methodology

Every UI stage must use this loop:

1. Build the thinnest useful vertical slice.
2. Start the local dev server.
3. Open the app in the in-app browser.
4. Validate the main mobile viewport at 390 x 844.
5. Stress-check at 360 x 740, especially Swedish copy.
6. Capture or inspect these states:
   - join/create screen
   - empty board
   - car added
   - child waiting tray
   - child selected with compatible and incompatible seats
   - occupied-seat sheet
   - add car sheet
   - add child sheet
   - trip details/share sheet
   - return-trip mirror sheet
7. Refine before moving to the next slice.

Do not wait until the end to discover mobile layout or interaction problems.

## Failure Modes And Rollback

- Seat was taken between refresh and tap: refresh room, mark seat occupied, keep child selected, show inline feedback.
- Accessory became unavailable: keep child selected and show the specific reason.
- Room expired/not found: use global error state.
- Poll result arrives while editing: pause polling during unsaved sheet edits, then reconcile after close.
- Return-trip mirroring creates wrong seats: users can move riders back to waiting from occupied seats.
- Swedish strings overflow: fix layout/copy during the narrow viewport pass.
- Backend exact-seat contract breaks current UI: Stage 1 keeps compatibility by having current UI pass an explicit first free seat.

Rollback path:

- Stage 1 can keep old UI behavior while the API contract changes.
- Board UI stages should land incrementally so a failing stage can be reverted without undoing domain/API support.
- Avoid deleting old allocation components until the board assignment flow is browser-validated.

## Test Impact

- Domain tests:
  - exact-seat success
  - invalid seat index
  - occupied seat conflict
  - incompatible accessory reason
  - direction mismatch
  - safe edit and blocked edit rules

- Application tests:
  - assign child to requested seat
  - mirror return trip options
  - vehicle deletion moves riders back to waiting
  - child deletion only from waiting flow if enforced at use-case level

- Route tests:
  - assignment payload includes `seatIndex`
  - error mapping for `SEAT_NOT_FOUND`, `SEAT_ALREADY_ASSIGNED`, and incompatibility

- UI tests:
  - join link prefill requires Enter room
  - direction switcher counts
  - waiting tray selection
  - compatible/incompatible seat states
  - bottom sheet open/close flows
  - English/Swedish toggle preserves explicit keys

## Performance And Memory Impact

- Room data remains small under existing caps: 30 vehicles, 100 children, 200 assignments.
- Board computations should be derived from the current room object in memory.
- Polling every 10-15 seconds while the board is open is acceptable; pause while editing.
- Avoid heavy animation libraries and new visual dependencies.
- Use local CSS/SVG and small React components for icons and seat visuals.

## End-User Perspective Research

Use these scenarios during design review and browser validation:

- Parent in a hurry opens a shared link and enters the prefilled code.
- Parent adds their own car and reserves seats for their own children.
- Parent adds only a child and waits for another parent's car.
- Parent selects a child, sees compatible seats, and chooses a seat.
- Parent tries a seat that cannot support a needed booster.
- Parent moves a seated child back to waiting to change cars.
- Parent adds Home trip later and chooses mirrored seats.
- Parent sees another parent's changes after polling.
- Swedish-language parent uses the app on a narrow phone.

## Required Checks

Run before considering implementation complete:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm run check:architecture
corepack pnpm run check:agents
```

For Cloudflare-facing changes, also consider:

```bash
corepack pnpm wrangler deploy --dry-run
```

