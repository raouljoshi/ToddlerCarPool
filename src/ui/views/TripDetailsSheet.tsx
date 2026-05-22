import { useState } from "react";
import type { ReturnTripSetup, UpdateSettingsRequest } from "../../application/dto";
import { DIRECTIONS, type Direction, type DirectionMeta, type Room } from "../../domain/types";
import type { Language, Translation } from "../i18n";
import { DirectionTimingEditor } from "./DirectionTimingEditor";
import { directionLabel, timingDraft, type DirectionTimingDraft } from "./directionTiming";

interface TripDetailsSheetProps {
  t: Translation;
  language: Language;
  room: Room;
  loading: boolean;
  onCancel: () => void;
  onCopyCode: () => void;
  onCopyLink: () => void;
  onSubmit: (request: UpdateSettingsRequest) => void;
}

type DirectionRecord<T> = Record<Direction, T>;

export function TripDetailsSheet({
  t,
  language,
  room,
  loading,
  onCancel,
  onCopyCode,
  onCopyLink,
  onSubmit,
}: TripDetailsSheetProps) {
  const [label, setLabel] = useState(room.settings.label);
  const [date, setDate] = useState(room.settings.date ?? "");
  const [staticInfo, setStaticInfo] = useState(room.settings.staticInfo ?? "");
  const [mapLink, setMapLink] = useState(room.settings.mapLink ?? "");
  const [enabledDraft, setEnabledDraft] = useState<DirectionRecord<boolean>>({
    outbound: room.settings.outbound.enabled,
    inbound: room.settings.inbound.enabled,
  });
  const [timing, setTiming] = useState<DirectionRecord<DirectionTimingDraft>>({
    outbound: timingDraft(room.settings.outbound, "outbound"),
    inbound: timingDraft(room.settings.inbound, "inbound"),
  });
  const [returnTripSetup, setReturnTripSetup] = useState<ReturnTripSetup>("mirror-seats");
  const expiryDate = new Date(room.expiresAt).toLocaleDateString(
    language === "sv" ? "sv-SE" : "en-US",
  );
  const returnTripWasAdded = !room.settings.inbound.enabled && enabledDraft.inbound;

  function updateEnabled(direction: Direction, enabled: boolean) {
    setEnabledDraft((current) => ({ ...current, [direction]: enabled }));
  }

  function updateTiming(direction: Direction, next: DirectionTimingDraft) {
    setTiming((current) => ({ ...current, [direction]: next }));
  }

  function settingsForDirection(direction: Direction): DirectionMeta {
    const draft = timing[direction];
    return {
      ...room.settings[direction],
      enabled: enabledDraft[direction],
      time: draft.time || undefined,
      timeReference: draft.time ? draft.timeReference : undefined,
      info: draft.info?.trim() || undefined,
    };
  }

  function save() {
    onSubmit({
      label: label.trim(),
      date: date || undefined,
      staticInfo: staticInfo.trim() || undefined,
      mapLink: mapLink.trim() || undefined,
      outbound: settingsForDirection("outbound"),
      inbound: settingsForDirection("inbound"),
      returnTripSetup: returnTripWasAdded ? returnTripSetup : undefined,
    });
  }

  return (
    <section className="panel wizard trip-details-sheet">
      <h2>{t.tripDetailsTitle}</h2>

      <div className="details-code-card">
        <span className="room-code-pill">{t.codeLabel} {room.code}</span>
        <p className="muted">{t.roomCodeEditNote}</p>
        <div className="row">
          <button type="button" className="secondary" onClick={onCopyCode}>
            {t.copyCode}
          </button>
          <button type="button" className="secondary" onClick={onCopyLink}>
            {t.copyLink}
          </button>
        </div>
      </div>

      <div className="wizard-step">
        <label>
          {t.eventName}
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
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

        {returnTripWasAdded && (
          <div className="return-setup-panel">
            <div>
              <strong>{t.returnTripAddedTitle}</strong>
              <p className="muted">{t.returnTripAddedBody}</p>
            </div>
            <div className="return-setup-options">
              <label>
                <input
                  type="radio"
                  name="return-trip-setup"
                  checked={returnTripSetup === "mirror-seats"}
                  onChange={() => setReturnTripSetup("mirror-seats")}
                />
                {t.returnSetupMirrorSeats}
              </label>
              <label>
                <input
                  type="radio"
                  name="return-trip-setup"
                  checked={returnTripSetup === "same-participants"}
                  onChange={() => setReturnTripSetup("same-participants")}
                />
                {t.returnSetupSameParticipants}
              </label>
              <label>
                <input
                  type="radio"
                  name="return-trip-setup"
                  checked={returnTripSetup === "empty"}
                  onChange={() => setReturnTripSetup("empty")}
                />
                {t.returnSetupEmpty}
              </label>
            </div>
          </div>
        )}

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
      </div>

      <p className="muted">
        {t.expires} <strong>{expiryDate}</strong>
      </p>

      <div className="wizard-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          {t.cancel}
        </button>
        <button
          type="button"
          className="accent"
          onClick={save}
          disabled={loading || label.trim().length === 0 || !DIRECTIONS.some((direction) => enabledDraft[direction])}
        >
          {t.saveDetails}
        </button>
      </div>
    </section>
  );
}
