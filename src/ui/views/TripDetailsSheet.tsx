import { useState } from "react";
import type { ReturnTripSetup, UpdateSettingsRequest } from "../../application/dto";
import type { Room } from "../../domain/types";
import type { Language, Translation } from "../i18n";

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
  const [staticInfo, setStaticInfo] = useState(room.settings.staticInfo ?? "");
  const [mapLink, setMapLink] = useState(room.settings.mapLink ?? "");
  const [outboundEnabled, setOutboundEnabled] = useState(room.settings.outbound.enabled);
  const [inboundEnabled, setInboundEnabled] = useState(room.settings.inbound.enabled);
  const [returnTripSetup, setReturnTripSetup] = useState<ReturnTripSetup>("mirror-seats");
  const expiryDate = new Date(room.expiresAt).toLocaleDateString(
    language === "sv" ? "sv-SE" : "en-US",
  );
  const returnTripWasAdded = !room.settings.inbound.enabled && inboundEnabled;

  function save() {
    onSubmit({
      label: label.trim(),
      staticInfo: staticInfo.trim() || undefined,
      mapLink: mapLink.trim() || undefined,
      outbound: {
        ...room.settings.outbound,
        enabled: outboundEnabled,
      },
      inbound: {
        ...room.settings.inbound,
        enabled: inboundEnabled,
      },
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

        <div>
          <p className="field-title">{t.tripDirections}</p>
          <div className="checkbox-row visual-choice-grid">
            <label>
              <input
                type="checkbox"
                checked={outboundEnabled}
                onChange={(event) => setOutboundEnabled(event.target.checked)}
              />
              <span className="dir-pill outbound">{t.outboundLabel}</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={inboundEnabled}
                onChange={(event) => setInboundEnabled(event.target.checked)}
              />
              <span className="dir-pill inbound">{t.inboundLabel}</span>
            </label>
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
          disabled={loading || label.trim().length === 0 || (!outboundEnabled && !inboundEnabled)}
        >
          {t.saveDetails}
        </button>
      </div>
    </section>
  );
}
