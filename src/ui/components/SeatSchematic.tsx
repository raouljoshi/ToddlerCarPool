export type SeatDisplayState =
  | { kind: "empty" }
  | { kind: "reserved"; name: string }
  | { kind: "assigned"; name: string };

function computeRows(n: number): number[][] {
  if (n === 6) return [[0, 1, 2], [3, 4, 5]];
  if (n === 9) return [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
  const rows: number[][] = [];
  const front = n <= 4 ? 1 : 2;
  rows.push(Array.from({ length: Math.min(front, n) }, (_, i) => i));
  let idx = Math.min(front, n);
  while (idx < n) {
    const count = Math.min(3, n - idx);
    rows.push(Array.from({ length: count }, (_, i) => idx + i));
    idx += count;
  }
  return rows;
}

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
}

export function SeatSchematic({ seats, onTap, label }: SeatSchematicProps) {
  const rows = computeRows(seats.length);
  const interactive = Boolean(onTap);

  return (
    <div
      className="seat-schematic"
      role={interactive ? undefined : "img"}
      aria-label={label ?? `${seats.length} seats`}
    >
      {rows.map((row, ri) => (
        <div key={ri} className="seat-row">
          {row.map((si) => {
            const s = seats[si];
            const cls = [
              "seat",
              s.kind !== "empty" ? s.kind : "",
              interactive ? "tappable" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const label =
              s.kind !== "empty"
                ? `Seat ${si + 1}: ${s.name}`
                : `Seat ${si + 1}`;
            const abbr = s.kind !== "empty" ? initials(s.name) : "";
            return interactive ? (
              <button
                key={si}
                type="button"
                className={cls}
                onClick={() => onTap!(si)}
                aria-label={label}
                title={s.kind !== "empty" ? s.name : undefined}
              >
                {abbr}
                {s.kind !== "empty" && (
                  <span className="seat-label">{firstName(s.name)}</span>
                )}
              </button>
            ) : (
              <div
                key={si}
                className={cls}
                aria-label={label}
                title={s.kind !== "empty" ? s.name : undefined}
              >
                {abbr}
                {s.kind !== "empty" && (
                  <span className="seat-label">{firstName(s.name)}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
