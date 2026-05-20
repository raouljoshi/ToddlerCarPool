import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders bilingual entry controls", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<App />);

    expect(screen.getByRole("heading", { name: "ToddlerCarPool" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Event name" })).toBeInTheDocument();
  });
});
