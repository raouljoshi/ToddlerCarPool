import type {
  AssignChildRequest,
  CreateChildRequest,
  CreateRoomRequest,
  CreateVehicleRequest,
  RoomDto,
  UpdateChildRequest,
  UpdateSettingsRequest,
  UpdateVehicleRequest,
} from "../application/dto";

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
  return send<RoomDto>(`/api/rooms/${encodeURIComponent(code)}/settings`, {
    method: "PUT",
    body: request,
  });
}

export async function createVehicle(code: string, request: CreateVehicleRequest): Promise<RoomDto> {
  return send<RoomDto>(`/api/rooms/${encodeURIComponent(code)}/vehicles`, {
    method: "POST",
    body: request,
  });
}

export async function updateVehicle(
  code: string,
  vehicleId: string,
  request: UpdateVehicleRequest,
): Promise<RoomDto> {
  return send<RoomDto>(
    `/api/rooms/${encodeURIComponent(code)}/vehicles/${encodeURIComponent(vehicleId)}`,
    { method: "PUT", body: request },
  );
}

export async function deleteVehicle(code: string, vehicleId: string): Promise<RoomDto> {
  return send<RoomDto>(
    `/api/rooms/${encodeURIComponent(code)}/vehicles/${encodeURIComponent(vehicleId)}`,
    { method: "DELETE" },
  );
}

export async function createChild(code: string, request: CreateChildRequest): Promise<RoomDto> {
  return send<RoomDto>(`/api/rooms/${encodeURIComponent(code)}/children`, {
    method: "POST",
    body: request,
  });
}

export async function updateChild(
  code: string,
  childId: string,
  request: UpdateChildRequest,
): Promise<RoomDto> {
  return send<RoomDto>(
    `/api/rooms/${encodeURIComponent(code)}/children/${encodeURIComponent(childId)}`,
    { method: "PUT", body: request },
  );
}

export async function deleteChild(code: string, childId: string): Promise<RoomDto> {
  return send<RoomDto>(
    `/api/rooms/${encodeURIComponent(code)}/children/${encodeURIComponent(childId)}`,
    { method: "DELETE" },
  );
}

export async function assignChild(code: string, request: AssignChildRequest): Promise<RoomDto> {
  return send<RoomDto>(`/api/rooms/${encodeURIComponent(code)}/assignments`, {
    method: "POST",
    body: request,
  });
}

export async function unassignChild(code: string, assignmentId: string): Promise<RoomDto> {
  return send<RoomDto>(
    `/api/rooms/${encodeURIComponent(code)}/assignments/${encodeURIComponent(assignmentId)}`,
    { method: "DELETE" },
  );
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
