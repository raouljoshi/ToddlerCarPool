import { useState } from "react";
import type { CreateRoomRequest } from "../../application/dto";
import { DIRECTIONS, type Direction, type DirectionMeta } from "../../domain/types";
import type { Translation } from "../i18n";
import { DirectionTimingEditor } from "./DirectionTimingEditor";
import { directionLabel, timingDraft, type DirectionTimingDraft } from "./directionTiming";

interface OrganizerWizardProps {
  t: Translation;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (request: CreateRoomRequest) => void;
}

type DirectionRecord<T> = Record<Direction, T>;

export function OrganizerWizard({ t, loading, onCancel, onSubmit }: OrganizerWizardProps) {
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [staticInfo, setStaticInfo] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [enabledDraft, setEnabledDraft] = useState<DirectionRecord<boolean>>({
    outbound: true,
    inbound: false,
  });
  const [timing, setTiming] = useState<DirectionRecord<DirectionTimingDraft>>({
    outbound: timingDraft({ enabled: true }, "outbound"),
    inbound: timingDraft({ enabled: false }, "inbound"),
  });

  const canCreate = label.trim().length > 0 && DIRECTIONS.some((direction) => enabledDraft[direction]);

  function updateEnabled(direction: Direction, enabled: boolean) {
    setEnabledDraft((current) => ({ ...current, [direction]: enabled }));
  }

  function updateTiming(direction: Direction, next: DirectionTimingDraft) {
    setTiming((current) => ({ ...current, [direction]: next }));
  }

  function settingsForDirection(direction: Direction): DirectionMeta {
    const draft = timing[direction];
    return {
      enabled: enabledDraft[direction],
      time: draft.time || undefined,
      timeReference: draft.time ? draft.timeReference : undefined,
      info: draft.info?.trim() || undefined,
    };
  }

  function handleSubmit() {
    if (!canCreate) return;
    onSubmit({
      label: label.trim(),
      date: date || undefined,
      staticInfo: staticInfo.trim() || undefined,
      mapLink: mapLink.trim() || undefined,
      outbound: settingsForDirection("outbound"),
      inbound: settingsForDirection("inbound"),
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

        <div>
          <p className="field-title">{t.tripDirections}</p>
          <div className="checkbox-row visual-choice-grid">
            {DIRECTIONS.map((direction) => (
              <label key={direction}>
                <input
                  type="checkbox"
                  checked={enabledDraft[direction]}
                  onChange={(event) => updateEnabled(direction, event.target.checked)}
                />
                <span className={`dir-pill ${direction}`}>{directionLabel(t, direction)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="trip-timing-panel">
          <p className="field-title">{t.tripTimingTitle}</p>
          {DIRECTIONS.filter((direction) => enabledDraft[direction]).map((direction) => (
            <DirectionTimingEditor
              key={direction}
              t={t}
              direction={direction}
              label={directionLabel(t, direction)}
              enabled={enabledDraft[direction]}
              meta={timing[direction]}
              onMetaChange={(next) => updateTiming(direction, next)}
            />
          ))}
        </div>

        <label>
          {t.eventInfo}
          <textarea
            value={staticInfo}
            onChange={(event) => setStaticInfo(event.target.value)}
            rows={3}
            maxLength={500}
          />
        </label>

        <label>
          {t.mapLink}
          <input
            value={mapLink}
            onChange={(event) => setMapLink(event.target.value)}
            inputMode="url"
            placeholder="https://maps.google.com/..."
            maxLength={500}
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
