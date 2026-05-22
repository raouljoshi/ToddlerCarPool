import {
  TIME_REFERENCES,
  parseTimeReference,
  type Direction,
} from "../../domain/types";
import type { Translation } from "../i18n";
import type { DirectionTimingDraft } from "./directionTiming";

export function DirectionTimingEditor({
  t,
  direction,
  label,
  enabled,
  meta,
  onMetaChange,
}: {
  t: Translation;
  direction: Direction;
  label: string;
  enabled: boolean;
  meta: DirectionTimingDraft;
  onMetaChange: (meta: DirectionTimingDraft) => void;
}) {
  const disabled = !enabled;
  const timeLabel = `${label} ${t.tripTimeOptional}`;
  const referenceLabel = `${label} ${t.timeReference}`;
  const infoLabel = `${label} ${t.directionInfo}`;

  return (
    <section className={`direction-timing-card ${direction}${disabled ? " disabled" : ""}`}>
      <h3>{label}</h3>
      <div className="direction-timing-grid">
        <label>
          {timeLabel}
          <input
            type="time"
            value={meta.time}
            onChange={(event) => onMetaChange({ ...meta, time: event.target.value })}
            disabled={disabled}
          />
        </label>
        <label>
          {referenceLabel}
          <select
            value={meta.timeReference}
            onChange={(event) => onMetaChange({
              ...meta,
              timeReference: parseTimeReference(event.target.value),
            })}
            disabled={disabled}
          >
            {TIME_REFERENCES.map((reference) => (
              <option key={reference} value={reference}>
                {reference === "departure" ? t.timeReferenceDeparture : t.timeReferenceArrival}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        {infoLabel}
        <textarea
          value={meta.info}
          onChange={(event) => onMetaChange({ ...meta, info: event.target.value })}
          rows={2}
          maxLength={500}
          disabled={disabled}
        />
      </label>
    </section>
  );
}
