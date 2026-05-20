import { describe, expect, it, vi } from "vitest";
import { ok } from "../domain/result";
import type { Room } from "../domain/types";
import { handleRequest, type WorkerEnv } from "./http";

const room: Room = {
  code: "ABC123",
  settings: { label: "Room", outboundEnabled: true, outboundLabel: "Out", inboundEnabled: true, inboundLabel: "In" },
  createdAt: "2026-05-20T00:00:00.000Z",
  expiresAt: "2026-06-19T00:00:00.000Z",
  updatedAt: "2026-05-20T00:00:00.000Z",
  families: [],
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
});
