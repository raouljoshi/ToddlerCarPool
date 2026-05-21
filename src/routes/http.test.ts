import { describe, expect, it, vi } from "vitest";
import { err, ok } from "../domain/result";
import type { Room } from "../domain/types";
import { handleRequest, type WorkerEnv } from "./http";

const room: Room = {
  code: "ABC123",
  settings: {
    label: "Room",
    outbound: { enabled: true },
    inbound: { enabled: true },
  },
  createdAt: "2026-05-20T00:00:00.000Z",
  expiresAt: "2026-06-19T00:00:00.000Z",
  updatedAt: "2026-05-20T00:00:00.000Z",
  vehicles: [],
  children: [],
  assignments: [],
};

describe("http routes", () => {
  it("routes room reads to the Durable Object stub", async () => {
    const getRoom = vi.fn(async () => ok(room));
    const env = {
      ROOM_INSTANCES: {
        getByName: vi.fn(() => ({ getRoom })),
      },
      ASSETS: { fetch: vi.fn() },
    } as unknown as WorkerEnv;

    const response = await handleRequest(new Request("https://example.com/api/rooms/abc-123"), env);
    const payload = (await response.json()) as { data: Room };

    expect(response.status).toBe(200);
    expect(payload.data.code).toBe("ABC123");
    expect(env.ROOM_INSTANCES.getByName).toHaveBeenCalledWith("ABC123");
  });

  it("falls back to static assets for non-api requests", async () => {
    const env = {
      ROOM_INSTANCES: { getByName: vi.fn() },
      ASSETS: { fetch: vi.fn(async () => new Response("asset")) },
    } as unknown as WorkerEnv;

    const response = await handleRequest(new Request("https://example.com/"), env);
    expect(await response.text()).toBe("asset");
  });

  it("maps VEHICLE_NOT_FOUND to 404", async () => {
    const deleteVehicle = vi.fn(async () => err("VEHICLE_NOT_FOUND", "missing"));
    const env = {
      ROOM_INSTANCES: { getByName: vi.fn(() => ({ deleteVehicle })) },
      ASSETS: { fetch: vi.fn() },
    } as unknown as WorkerEnv;
    const response = await handleRequest(
      new Request("https://example.com/api/rooms/abc/vehicles/xyz", { method: "DELETE" }),
      env,
    );
    expect(response.status).toBe(404);
  });

  it("maps INCOMPATIBLE_ACCESSORY to 409", async () => {
    const assignChild = vi.fn(async () => err("INCOMPATIBLE_ACCESSORY", "no booster"));
    const env = {
      ROOM_INSTANCES: { getByName: vi.fn(() => ({ assignChild })) },
      ASSETS: { fetch: vi.fn() },
    } as unknown as WorkerEnv;
    const response = await handleRequest(
      new Request("https://example.com/api/rooms/abc/assignments", {
        method: "POST",
        body: JSON.stringify({ childId: "c", vehicleId: "v", direction: "outbound" }),
        headers: { "content-type": "application/json" },
      }),
      env,
    );
    expect(response.status).toBe(409);
  });

  it("maps LIMIT_EXCEEDED to 413", async () => {
    const createVehicle = vi.fn(async () => err("LIMIT_EXCEEDED", "too many"));
    const env = {
      ROOM_INSTANCES: { getByName: vi.fn(() => ({ createVehicle })) },
      ASSETS: { fetch: vi.fn() },
    } as unknown as WorkerEnv;
    const response = await handleRequest(
      new Request("https://example.com/api/rooms/abc/vehicles", {
        method: "POST",
        body: JSON.stringify({ driverName: "x", seatCount: 1, directions: ["outbound"] }),
        headers: { "content-type": "application/json" },
      }),
      env,
    );
    expect(response.status).toBe(413);
  });
});
