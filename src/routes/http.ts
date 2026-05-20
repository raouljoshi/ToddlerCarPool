import type { AssignmentRequest, CreateRoomRequest, FamilyRequest, UpdateSettingsRequest } from "../application/dto";
import type { AppError, Result } from "../domain/result";
import { normalizeRoomCode } from "../domain/validation";
import type { CarpoolInstance } from "../worker/carpool-instance";

export interface WorkerEnv {
  ROOM_INSTANCES: DurableObjectNamespace<CarpoolInstance>;
  ASSETS: Fetcher;
}

interface RouteMatch {
  code?: string;
  familyId?: string;
  assignmentId?: string;
}

type RoomStub = DurableObjectStub<CarpoolInstance>;

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

    const roomsMatch = matchPath(url.pathname, /^\/api\/rooms\/([a-zA-Z0-9-]+)$/);
    if (roomsMatch && request.method === "GET") {
      return toJson(await getRoomStub(env, roomsMatch.code).getRoom());
    }

    if (roomsMatch && request.method === "PUT") {
      return toJson(await getRoomStub(env, roomsMatch.code).updateSettings(await readJson<UpdateSettingsRequest>(request)));
    }

    const settingsMatch = matchPath(url.pathname, /^\/api\/rooms\/([a-zA-Z0-9-]+)\/settings$/);
    if (settingsMatch && request.method === "PUT") {
      return toJson(await getRoomStub(env, settingsMatch.code).updateSettings(await readJson<UpdateSettingsRequest>(request)));
    }

    const familiesMatch = matchPath(url.pathname, /^\/api\/rooms\/([a-zA-Z0-9-]+)\/families$/);
    if (familiesMatch && request.method === "POST") {
      return toJson(await getRoomStub(env, familiesMatch.code).addFamily(await readJson<FamilyRequest>(request)), 201);
    }

    const familyMatch = matchPath(url.pathname, /^\/api\/rooms\/([a-zA-Z0-9-]+)\/families\/([a-zA-Z0-9-]+)$/);
    if (familyMatch && request.method === "PUT" && familyMatch.familyId) {
      return toJson(
        await getRoomStub(env, familyMatch.code).updateFamily(familyMatch.familyId, await readJson<FamilyRequest>(request)),
      );
    }
    if (familyMatch && request.method === "DELETE" && familyMatch.familyId) {
      return toJson(await getRoomStub(env, familyMatch.code).deleteFamily(familyMatch.familyId));
    }

    const assignmentsMatch = matchPath(url.pathname, /^\/api\/rooms\/([a-zA-Z0-9-]+)\/assignments$/);
    if (assignmentsMatch && request.method === "POST") {
      return toJson(await getRoomStub(env, assignmentsMatch.code).assignSeat(await readJson<AssignmentRequest>(request)), 201);
    }

    const assignmentMatch = matchPath(url.pathname, /^\/api\/rooms\/([a-zA-Z0-9-]+)\/assignments\/([a-zA-Z0-9-]+)$/);
    if (assignmentMatch && request.method === "DELETE" && assignmentMatch.assignmentId) {
      return toJson(await getRoomStub(env, assignmentMatch.code).deleteAssignment(assignmentMatch.assignmentId));
    }

    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Route not found." } }, { status: 404 });
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
    familyId: match[2],
    assignmentId: match[2],
  };
}

function toJson<T>(result: Result<T>, successStatus = 200): Response {
  if (result.ok) return Response.json({ data: result.value }, { status: successStatus });
  return Response.json({ error: result.error }, { status: statusForError(result.error) });
}

function statusForError(error: AppError): number {
  switch (error.code) {
    case "ROOM_NOT_FOUND":
      return 404;
    case "ROOM_EXPIRED":
      return 410;
    case "FAMILY_NOT_FOUND":
    case "CHILD_NOT_FOUND":
    case "SEAT_NOT_FOUND":
      return 404;
    case "SEAT_ALREADY_ASSIGNED":
    case "INCOMPATIBLE_SEAT":
    case "DIRECTION_NOT_NEEDED_OR_OFFERED":
      return 409;
    case "LIMIT_EXCEEDED":
      return 413;
    default:
      return 400;
  }
}
