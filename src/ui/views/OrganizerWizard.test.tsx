import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { translations } from "../i18n";
import { OrganizerWizard } from "./OrganizerWizard";

describe("OrganizerWizard", () => {
  it("creates a room with the full editable event details", () => {
    const onSubmit = vi.fn();
    render(
      <OrganizerWizard
        t={translations.en}
        loading={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Event name"), {
      target: { value: "Birthday ride" },
    });
    fireEvent.change(screen.getByLabelText("Event date"), {
      target: { value: "2026-06-12" },
    });
    fireEvent.click(screen.getByLabelText("Home"));
    fireEvent.change(screen.getByLabelText("There Optional time"), {
      target: { value: "08:30" },
    });
    fireEvent.change(screen.getByLabelText("There Time refers to"), {
      target: { value: "arrival" },
    });
    fireEvent.change(screen.getByLabelText("Home Optional time"), {
      target: { value: "15:15" },
    });
    fireEvent.change(screen.getByLabelText("Home Time refers to"), {
      target: { value: "departure" },
    });
    fireEvent.change(screen.getByLabelText("Home Notes for this direction"), {
      target: { value: "Meet by the gate." },
    });
    fireEvent.change(screen.getByLabelText("Information everyone should see"), {
      target: { value: "Bring rain clothes." },
    });
    fireEvent.change(screen.getByLabelText("Google Maps link"), {
      target: { value: "https://maps.google.com/?q=Skansen" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create room" }));

    expect(onSubmit).toHaveBeenCalledWith({
      label: "Birthday ride",
      date: "2026-06-12",
      staticInfo: "Bring rain clothes.",
      mapLink: "https://maps.google.com/?q=Skansen",
      outbound: {
        enabled: true,
        time: "08:30",
        timeReference: "arrival",
        info: undefined,
      },
      inbound: {
        enabled: true,
        time: "15:15",
        timeReference: "departure",
        info: "Meet by the gate.",
      },
    });
  });
});
