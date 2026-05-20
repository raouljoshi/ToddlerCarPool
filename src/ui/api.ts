import type { AssignmentRequest, CreateRoomRequest, FamilyRequest, RoomDto, UpdateSettingsRequest } from "../application/dto";

interface ApiSuccess<T> {
  data: T;
}

interface ApiFailure {
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class ApiClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

export async function createRoom(request: CreateRoomRequest): Promise<RoomDto> {
  return send<RoomDto>("/api/rooms", { method: "POST", body: request });
}

export async function getRoom(code: string): Promise<RoomDto> {
  return send<RoomDto>(`/api/rooms/${encodeURIComponent(code)}`);
}

export async function updateSettings(code: string, request: UpdateSettingsRequest): Promise<RoomDto> {
  return send<RoomDto>(`/api/rooms/${encodeURIComponent(code)}/settings`, { method: "PUT", body: request });
}

export async function addFamily(code: string, request: FamilyRequest): Promise<RoomDto> {
  return send<RoomDto>(`/api/rooms/${encodeURIComponent(code)}/families`, { method: "POST", body: request });
}

export async function deleteFamily(code: string, familyId: string): Promise<RoomDto> {
  return send<RoomDto>(`/api/rooms/${encodeURIComponent(code)}/families/${encodeURIComponent(familyId)}`, {
    method: "DELETE",
  });
}

export async function assignSeat(code: string, request: AssignmentRequest): Promise<RoomDto> {
  return send<RoomDto>(`/api/rooms/${encodeURIComponent(code)}/assignments`, { method: "POST", body: request });
}

export async function deleteAssignment(code: string, assignmentId: string): Promise<RoomDto> {
  return send<RoomDto>(`/api/rooms/${encodeURIComponent(code)}/assignments/${encodeURIComponent(assignmentId)}`, {
    method: "DELETE",
  });
}

async function send<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(path, {
    method: init.method ?? "GET",
    headers: init.body ? { "content-type": "application/json" } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if ("error" in payload) {
    throw new ApiClientError(payload.error.code, payload.error.message, payload.error.field);
  }
  return payload.data;
}
