import type { Direction } from "../../domain/types";

export type SeatDisplayState =
  | { kind: "empty" }
  | { kind: "available"; name?: string }
  | { kind: "unavailable"; reason: string }
  | { kind: "reserved"; name: string }
  | { kind: "assigned"; name: string };

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

interface SeatSchematicProps {
  seats: SeatDisplayState[];
  onTap?: (index: number) => void;
  label?: string;
  /** "outbound" points the car right; "inbound" mirrors it. */
  direction?: Direction;
}

/**
 * Full-width side-profile car holding up to five seats in a single row.
 */
export function SeatSchematic({
  seats,
  onTap,
  label,
  direction = "outbound",
}: SeatSchematicProps) {
  const interactive = Boolean(onTap);

  return (
    <div
      className={`seat-car ${direction}`}
      role={interactive ? undefined : "img"}
      aria-label={label ?? `${seats.length} seats`}
    >
      <span className="seat-car-wheel rear" aria-hidden="true" />
      <span className="seat-car-wheel front" aria-hidden="true" />
      <div className="seat-car-body">
        <span className="seat-car-window" aria-hidden="true" />
        <div className="seat-row">
          {seats.map((s, si) => {
            const cls = [
              "seat",
              s.kind !== "empty" ? s.kind : "",
              interactive ? "tappable" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const seatLabel =
              s.kind === "assigned" || s.kind === "reserved"
                ? `Seat ${si + 1}: ${s.name}`
                : s.kind === "available"
                  ? `Seat ${si + 1}: available`
                  : s.kind === "unavailable"
                    ? `Seat ${si + 1}: ${s.reason}`
                    : `Seat ${si + 1}`;
            const abbr =
              s.kind === "assigned" || s.kind === "reserved"
                ? initials(s.name)
                : s.kind === "available"
                  ? "+"
                  : s.kind === "unavailable"
                    ? "!"
                    : "";
            const title =
              s.kind === "assigned" || s.kind === "reserved"
                ? s.name
                : s.kind === "unavailable"
                  ? s.reason
                  : undefined;
            const named = s.kind === "assigned" || s.kind === "reserved";
            return interactive ? (
              <button
                key={si}
                type="button"
                className={cls}
                onClick={() => onTap!(si)}
                aria-label={seatLabel}
                title={title}
              >
                <span className="seat-mark">{abbr}</span>
                {named && <span className="seat-label">{firstName(s.name)}</span>}
              </button>
            ) : (
              <div key={si} className={cls} aria-label={seatLabel} title={title}>
                <span className="seat-mark">{abbr}</span>
                {named && <span className="seat-label">{firstName(s.name)}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
