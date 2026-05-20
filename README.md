# ToddlerCarPool

ToddlerCarPool is a mobile-first, bilingual carpool planning tool for parents coordinating one-off rides for toddlers and children. It is designed for low-friction coordination without accounts, contact fields, or long-lived data.

The app is intentionally modest: create a short-lived planning room, share a generated room code or link, let each family enter what they need or can offer, and then manually assign children to compatible seats with clear warnings.

## Product Goal

Parents often need to coordinate rides when not every family has a car, children need different seat types, and available seats must be matched transparently against demand. ToddlerCarPool exists to make that planning visible and calm:

- Who needs a ride?
- Who can offer seats?
- Which directions are being planned?
- Which seat types are compatible?
- Which children are still unplaced?
- Who is riding with whom?

The app does not replace parent communication channels. It deliberately avoids phone numbers, email addresses, accounts, legal safety advice, and identity management. Parents should coordinate personal contact details outside the app.

## Current UX Direction

The product is wizard-first and mobile-first.

### Organizer Flow

The landing page lets an organizer create a room through a step-by-step setup wizard:

1. **Event**
   - Event name
   - Static information everyone should see
   - Optional Google Maps link

2. **Trips**
   - Enable outbound and/or inbound
   - Configure outbound/inbound labels
   - Add direction-specific details

3. **Share**
   - Review the setup
   - Create the room
   - Receive a generated code and shareable link

Rooms expire from the live app 30 days after creation.

### Parent Flow

Parents join a room by code or shared link. Inside the room, they see three primary areas:

- **Overview**: event details, map link, and trip information.
- **Plan my family**: a family wizard where one family enters ride needs and offered seats.
- **Current plan**: visual planning overview with needs, compatible seats, assignments, and unassigned children.

### Family Wizard

The family wizard is one family at a time:

1. Family display label
2. Children needing rides
3. Offered seats
4. Review and save

Display labels should be nicknames or simple family labels. The app should nudge users away from entering sensitive details.

### Allocation Workflow

Allocation is tap-first, not drag-first:

1. Choose a child ride need.
2. See compatible open seats.
3. Assign the child to a seat.
4. Unassign if needed.

Hard constraints include direction and seat type. Auto-matching and drag/drop canvas planning are intentionally out of scope for the current MVP.

## Architecture

The app follows a small Clean Architecture-inspired structure with inward dependency direction. See [AGENTS.md](./AGENTS.md) for binding rules.

```text
src/domain        Pure entities, policies, validation, allocation rules
src/application   Use cases, ports, DTOs, typed results
src/adapters      Infrastructure implementations and persistence mapping
src/routes        Worker HTTP request/response routing
src/worker        Cloudflare Worker entrypoint and Durable Object composition
src/ui            React UI, browser API client, i18n, styling
```

Important boundary rules:

- `src/domain` must not import application, adapter, UI, Worker, or Cloudflare runtime code.
- `src/application` may import domain, but not adapters or Worker code.
- `src/ui` must not import adapters, Worker code, Durable Objects, or Cloudflare bindings.
- `src/worker` composes runtime dependencies.

## Runtime Stack

- React + Vite + TypeScript
- Cloudflare Workers Static Assets
- One SQLite-backed Durable Object per room code
- Wrangler for local development and deployment
- pnpm + Vitest + ESLint

Cloudflare runtime design:

- `POST /api/rooms` creates a room and a deterministic Durable Object instance.
- `GET /api/rooms/:code` loads room state.
- Room mutations return the latest full room state.
- Each room Durable Object sets an alarm for 30 days after creation.
- On alarm, live app data is deleted from Durable Object storage.

The product copy should say data is deleted from the live app after 30 days. Do not claim verified provider-backup erasure unless that has been separately confirmed.

## Data Model

Primary concepts:

- **Room**: one short-lived event/planning instance.
- **RoomSettings**: event label, static info, map link, enabled directions, labels, and details.
- **FamilyEntry**: one family’s display label, children, offered seats, and optional trip notes.
- **ChildNeed**: a child label, needed directions, seat type, and optional note.
- **SeatOffer**: a seat label, available directions, seat type, and optional note.
- **Assignment**: one child assigned to one seat for one direction.

Supported seat types:

- `regular`
- `booster`
- `front-facing`
- `rear-facing`

Supported directions:

- `outbound`
- `inbound`

Default MVP caps:

- 40 families
- 100 children
- 30 offered seats
- 200 assignments

## API Surface

Current intended API routes:

```text
POST   /api/rooms
GET    /api/rooms/:code
PUT    /api/rooms/:code/settings
POST   /api/rooms/:code/families
PUT    /api/rooms/:code/families/:familyId
DELETE /api/rooms/:code/families/:familyId
POST   /api/rooms/:code/assignments
DELETE /api/rooms/:code/assignments/:assignmentId
```

Expected product error codes include:

- `ROOM_NOT_FOUND`
- `ROOM_EXPIRED`
- `VALIDATION_ERROR`
- `FAMILY_NOT_FOUND`
- `CHILD_NOT_FOUND`
- `SEAT_NOT_FOUND`
- `SEAT_ALREADY_ASSIGNED`
- `INCOMPATIBLE_SEAT`
- `DIRECTION_NOT_NEEDED_OR_OFFERED`
- `LIMIT_EXCEEDED`

Use typed `Result` values for expected product failures.

## Privacy And Safety Principles

ToddlerCarPool should remain privacy-minimizing:

- No accounts.
- No passwords.
- No contact fields.
- No phone numbers or email-specific workflows.
- No persistent profiles.
- No analytics identifiers.
- No contact management.
- No fetching, previewing, geocoding, or enriching user-provided map links.

The app coordinates stated needs and capacity. It does not verify whether a seat is legally or physically appropriate for a child. Copy should encourage parents to confirm details outside the app.

## Bilingual Support

The UI supports English and Swedish through `src/ui/i18n.ts`.

Rules for future agents:

- Add all visible copy to the translation dictionary.
- Keep copy short enough for mobile buttons and cards.
- Verify both EN and SV on narrow mobile screens.
- Prefer simple direct wording over explanatory paragraphs in the app.

## Local Development

Install dependencies:

```bash
corepack pnpm install
```

Run the Vite UI only:

```bash
corepack pnpm dev
```

Run the Cloudflare Worker locally:

```bash
corepack pnpm worker:dev
```

The Worker serves the built app assets and API at:

```text
http://localhost:8787
```

Build before Worker asset validation:

```bash
corepack pnpm build
```

## Verification Commands

Run these before handing off meaningful changes:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm run check:architecture
corepack pnpm run check:agents
corepack pnpm wrangler deploy --dry-run
```

For UX-facing changes, also validate in the in-app browser:

- Mobile viewport first.
- Organizer room creation wizard.
- Join by room code.
- Family planning wizard.
- Assignment and unassignment.
- EN/SV toggle.
- Long labels and notes.

## Deployment

Manual deployment:

```bash
corepack pnpm deploy
```

GitHub Actions deployment is configured in `.github/workflows/deploy.yml`, but repository secrets must be configured first:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

If Wrangler is authenticated locally but multiple Cloudflare accounts are available, do not guess the deployment target. Ask the repository owner which account should receive the Worker.

## Current Implementation Notes

The current MVP includes:

- ToddlerCarPool-specific root governance in `AGENTS.md`.
- Cloudflare Worker + Durable Object runtime.
- Room creation and loading.
- Room-level event/trip configuration.
- Family planning wizard.
- Tap-to-assign planning overview.
- English/Swedish language toggle.
- Unit and UI tests.
- Architecture and AGENTS coverage scripts.

Known future improvements:

- Add stronger route-level validation for malformed request bodies.
- Add editing for existing family entries.
- Add clearer empty-state illustrations or lightweight visual aids.
- Add more comprehensive Worker/Durable Object integration tests.
- Add real deployment target selection and first production deploy.
- Improve clipboard fallback for environments without clipboard permissions.

## Guidance For Future Agents

When advancing this project:

1. Read `AGENTS.md` before editing.
2. Preserve the small layered architecture.
3. Keep mobile UX quiet and step-wise.
4. Do not introduce accounts, contacts, or long-lived personal data.
5. Keep allocation manual and transparent unless a new ADR explicitly changes that.
6. Validate changes with commands and in-app browser walkthroughs.
7. Prefer incremental UX improvements over adding complex planning engines.

