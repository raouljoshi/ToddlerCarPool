import type {
  AssignChildRequest,
  CreateChildRequest,
  CreateRoomRequest,
  CreateVehicleRequest,
  UpdateChildRequest,
  UpdateSettingsRequest,
  UpdateVehicleRequest,
} from "../application/dto";
import type { AppError, Result } from "../domain/result";
import { normalizeRoomCode } from "../domain/validation";
import type { CarpoolInstance } from "../worker/carpool-instance";

export interface WorkerEnv {
  ROOM_INSTANCES: DurableObjectNamespace<CarpoolInstance>;
  ASSETS: Fetcher;
}

type RoomStub = DurableObjectStub<CarpoolInstance>;

interface RouteMatch {
  code: string;
  id?: string;
}

export async function handleRequest(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) {
    return env.ASSETS.fetch(request);
  }

  try {
    if (request.method === "POST" && url.pathname === "/api/rooms") {
      const code = createRoomCode();
      const stub = getRoomStub(env, code);
      return toJson(await stub.createRoom(await readJson<CreateRoomRequest>(request)), 201);
    }

    const roomMatch = matchPath(url.pathname, /^\/api\/rooms\/([a-zA-Z0-9-]+)$/);
    if (roomMatch && request.method === "GET") {
      return toJson(await getRoomStub(env, roomMatch.code).getRoom());
    }

    const settingsMatch = matchPath(url.pathname, /^\/api\/rooms\/([a-zA-Z0-9-]+)\/settings$/);
    if (settingsMatch && request.method === "PUT") {
      return toJson(
        await getRoomStub(env, settingsMatch.code).updateSettings(
          await readJson<UpdateSettingsRequest>(request),
        ),
      );
    }

    const vehiclesMatch = matchPath(url.pathname, /^\/api\/rooms\/([a-zA-Z0-9-]+)\/vehicles$/);
    if (vehiclesMatch && request.method === "POST") {
      return toJson(
        await getRoomStub(env, vehiclesMatch.code).createVehicle(
          await readJson<CreateVehicleRequest>(request),
        ),
        201,
      );
    }

    const vehicleMatch = matchPath(
      url.pathname,
      /^\/api\/rooms\/([a-zA-Z0-9-]+)\/vehicles\/([a-zA-Z0-9-]+)$/,
    );
    if (vehicleMatch && request.method === "PUT" && vehicleMatch.id) {
      return toJson(
        await getRoomStub(env, vehicleMatch.code).updateVehicle(
          vehicleMatch.id,
          await readJson<UpdateVehicleRequest>(request),
        ),
      );
    }
    if (vehicleMatch && request.method === "DELETE" && vehicleMatch.id) {
      return toJson(await getRoomStub(env, vehicleMatch.code).deleteVehicle(vehicleMatch.id));
    }

    const childrenMatch = matchPath(url.pathname, /^\/api\/rooms\/([a-zA-Z0-9-]+)\/children$/);
    if (childrenMatch && request.method === "POST") {
      return toJson(
        await getRoomStub(env, childrenMatch.code).createChild(
          await readJson<CreateChildRequest>(request),
        ),
        201,
      );
    }

    const childMatch = matchPath(
      url.pathname,
      /^\/api\/rooms\/([a-zA-Z0-9-]+)\/children\/([a-zA-Z0-9-]+)$/,
    );
    if (childMatch && request.method === "PUT" && childMatch.id) {
      return toJson(
        await getRoomStub(env, childMatch.code).updateChild(
          childMatch.id,
          await readJson<UpdateChildRequest>(request),
        ),
      );
    }
    if (childMatch && request.method === "DELETE" && childMatch.id) {
      return toJson(await getRoomStub(env, childMatch.code).deleteChild(childMatch.id));
    }

    const assignmentsMatch = matchPath(
      url.pathname,
      /^\/api\/rooms\/([a-zA-Z0-9-]+)\/assignments$/,
    );
    if (assignmentsMatch && request.method === "POST") {
      return toJson(
        await getRoomStub(env, assignmentsMatch.code).assignChild(
          await readJson<AssignChildRequest>(request),
        ),
        201,
      );
    }

    const assignmentMatch = matchPath(
      url.pathname,
      /^\/api\/rooms\/([a-zA-Z0-9-]+)\/assignments\/([a-zA-Z0-9-]+)$/,
    );
    if (assignmentMatch && request.method === "DELETE" && assignmentMatch.id) {
      return toJson(
        await getRoomStub(env, assignmentMatch.code).unassignChild(assignmentMatch.id),
      );
    }

    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: "Route not found." } },
      { status: 404 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return Response.json({ error: { code: "VALIDATION_ERROR", message } }, { status: 400 });
  }
}

function getRoomStub(env: WorkerEnv, rawCode = ""): RoomStub {
  const code = normalizeRoomCode(rawCode);
  return env.ROOM_INSTANCES.getByName(code);
}

function createRoomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 8)
    .toUpperCase();
}

async function readJson<T extends object>(request: Request): Promise<T> {
  if (request.headers.get("content-length") === "0") return {} as T;
  return (await request.json().catch(() => ({}))) as T;
}

function matchPath(pathname: string, pattern: RegExp): RouteMatch | undefined {
  const match = pattern.exec(pathname);
  if (!match) return undefined;
  return {
    code: normalizeRoomCode(match[1] ?? ""),
    id: match[2],
  };
}

function toJson<T>(result: Result<T>, successStatus = 200): Response {
  if (result.ok) return Response.json({ data: result.value }, { status: successStatus });
  return Response.json({ error: result.error }, { status: statusForError(result.error) });
}

function statusForError(error: AppError): number {
  switch (error.code) {
    case "ROOM_NOT_FOUND":
    case "VEHICLE_NOT_FOUND":
    case "CHILD_NOT_FOUND":
    case "SEAT_NOT_FOUND":
      return 404;
    case "ROOM_EXPIRED":
      return 410;
    case "SEAT_ALREADY_ASSIGNED":
    case "INCOMPATIBLE_ACCESSORY":
    case "DIRECTION_NOT_NEEDED_OR_OFFERED":
    case "VEHICLE_HAS_ASSIGNMENTS":
    case "CHILD_HAS_ASSIGNMENTS":
      return 409;
    case "LIMIT_EXCEEDED":
      return 413;
    default:
      return 400;
  }
}
