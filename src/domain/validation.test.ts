import { describe, expect, it } from "vitest";
import { validateSettings } from "./validation";

describe("validateSettings date", () => {
  it("keeps a well-formed ISO date", () => {
    const result = validateSettings({ label: "Trip", date: "2026-05-22" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.date).toBe("2026-05-22");
  });

  it("drops a malformed date", () => {
    const result = validateSettings({ label: "Trip", date: "22/05/2026" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.date).toBeUndefined();
  });

  it("rejects an impossible month", () => {
    const result = validateSettings({ label: "Trip", date: "2026-13-01" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.date).toBeUndefined();
  });

  it("leaves date undefined when omitted", () => {
    const result = validateSettings({ label: "Trip" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.date).toBeUndefined();
  });
});
