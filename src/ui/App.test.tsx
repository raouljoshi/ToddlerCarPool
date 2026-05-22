import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders landing with EN/SV toggle and join input", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<App />);

    expect(screen.getByText("ToddlerCarPool")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ToddlerCarPool" })).toBeInTheDocument();
    expect(screen.getByText(/Plan rides to parties, preschool events, and playdates/i)).toBeInTheDocument();
    expect(screen.getByText(/Use nicknames only/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SV" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /room code|rumskod/i })).toBeInTheDocument();
  });
});
