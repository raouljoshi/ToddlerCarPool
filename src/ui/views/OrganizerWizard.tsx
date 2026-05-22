import { useState } from "react";
import type { CreateRoomRequest } from "../../application/dto";
import type { Translation } from "../i18n";

interface OrganizerWizardProps {
  t: Translation;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (request: CreateRoomRequest) => void;
}

/**
 * Minimal room creation: event name and date. Everything else is edited
 * later from the room's trip details.
 */
export function OrganizerWizard({ t, loading, onCancel, onSubmit }: OrganizerWizardProps) {
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");

  const canCreate = label.trim().length > 0;

  function handleSubmit() {
    if (!canCreate) return;
    onSubmit({
      label: label.trim(),
      date: date || undefined,
      outbound: { enabled: true },
      inbound: { enabled: false },
    });
  }

  return (
    <section className="panel create-room">
      <form
        className="wizard-step"
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading) handleSubmit();
        }}
      >
        <label>
          {t.eventName}
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            autoFocus
            placeholder="e.g. Sara's birthday party"
            maxLength={80}
          />
        </label>
        <label>
          {t.eventDate}
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <div className="wizard-actions single">
          <button type="submit" className="accent" disabled={!canCreate || loading}>
            {t.createRoom}
          </button>
        </div>
      </form>
      <button type="button" className="link-button" onClick={onCancel} disabled={loading}>
        {t.cancel}
      </button>
    </section>
  );
}
