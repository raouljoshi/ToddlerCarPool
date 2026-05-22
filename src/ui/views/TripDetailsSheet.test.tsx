import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Room } from "../../domain/types";
import { translations } from "../i18n";
import { TripDetailsSheet } from "./TripDetailsSheet";

const now = "2026-05-20T00:00:00.000Z";

function buildRoom(): Room {
  return {
    code: "ABC12345",
    settings: {
      label: "Picnic",
      date: "2026-06-12",
      staticInfo: "Bring rain clothes.",
      mapLink: "https://maps.google.com/?q=Skansen",
      outbound: {
        enabled: true,
        time: "08:30",
        timeReference: "arrival",
        info: "Meet near the north entrance.",
      },
      inbound: {
        enabled: true,
        time: "15:15",
        timeReference: "departure",
        info: "Leave from the main gate.",
      },
    },
    createdAt: now,
    updatedAt: now,
    expiresAt: "2026-06-19T00:00:00.000Z",
    vehicles: [],
    children: [],
    assignments: [],
  };
}

describe("TripDetailsSheet", () => {
  it("edits saved trip timing, references, and direction notes", () => {
    const onSubmit = vi.fn();
    render(
      <TripDetailsSheet
        t={translations.en}
        language="en"
        room={buildRoom()}
        loading={false}
        onCancel={vi.fn()}
        onCopyCode={vi.fn()}
        onCopyLink={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText("There Optional time")).toHaveValue("08:30");
    expect(screen.getByLabelText("There Time refers to")).toHaveValue("arrival");
    expect(screen.getByLabelText("There Notes for this direction")).toHaveValue(
      "Meet near the north entrance.",
    );
    expect(screen.getByLabelText("Home Optional time")).toHaveValue("15:15");
    expect(screen.getByLabelText("Home Time refers to")).toHaveValue("departure");

    fireEvent.change(screen.getByLabelText("There Optional time"), {
      target: { value: "08:45" },
    });
    fireEvent.change(screen.getByLabelText("There Time refers to"), {
      target: { value: "departure" },
    });
    fireEvent.change(screen.getByLabelText("Home Notes for this direction"), {
      target: { value: "Gather by the bus stop." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        outbound: expect.objectContaining({
          enabled: true,
          time: "08:45",
          timeReference: "departure",
          info: "Meet near the north entrance.",
        }),
        inbound: expect.objectContaining({
          enabled: true,
          time: "15:15",
          timeReference: "departure",
          info: "Gather by the bus stop.",
        }),
      }),
    );
  });
});
