interface HeroCarsProps {
  filled?: number;
  capacity?: number;
}

/**
 * Cars-filling-up hero illustration.
 *
 * Picture-book style SVG of three small cars in a row. `filled` of `capacity`
 * seats are tinted with the active accent color; the remainder are dashed
 * outlines. Default is decorative (3 of 9 visible seats filled).
 */
export function HeroCars({ filled = 3, capacity = 9 }: HeroCarsProps) {
  const slots = Array.from({ length: capacity }, (_, i) => i < filled);
  // Three cars, 3 seats each.
  const cars: boolean[][] = [
    slots.slice(0, 3),
    slots.slice(3, 6),
    slots.slice(6, 9),
  ];

  return (
    <svg
      className="hero-cars"
      viewBox="0 0 420 180"
      role="img"
      aria-label="Three cars with seats filling up"
      xmlns="http://www.w3.org/2000/svg"
    >
      {cars.map((carSeats, carIndex) => (
        <g key={carIndex} transform={`translate(${carIndex * 140 + 10}, 30)`}>
          <Car seats={carSeats} />
        </g>
      ))}
    </svg>
  );
}

function Car({ seats }: { seats: boolean[] }) {
  return (
    <g>
      {/* Wheels */}
      <circle cx="22" cy="108" r="10" fill="#1f2a3a" />
      <circle cx="22" cy="108" r="4" fill="#fbf7f0" />
      <circle cx="98" cy="108" r="10" fill="#1f2a3a" />
      <circle cx="98" cy="108" r="4" fill="#fbf7f0" />

      {/* Body */}
      <path
        d="M4 95 L4 70 Q4 60 14 60 L34 40 Q40 32 48 32 L74 32 Q82 32 88 38 L108 60 L116 60 Q120 60 120 64 L120 92 Q120 100 112 100 L112 102 L100 102 L100 100 L20 100 L20 102 L8 102 L8 100 Q4 100 4 95 Z"
        fill="#fbf7f0"
        stroke="#1f2a3a"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Roof shadow */}
      <path
        d="M36 40 Q42 36 48 36 L74 36 Q80 36 84 40 L84 58 L36 58 Z"
        fill="#ede3d2"
        opacity="0.7"
      />

      {/* Seats inside (visible through window) */}
      {seats.map((on, i) => (
        <circle
          key={i}
          cx={44 + i * 18}
          cy={48}
          r={6}
          fill={on ? "#d4a848" : "#fbf7f0"}
          stroke={on ? "#1f2a3a" : "#d4c9b3"}
          strokeWidth={on ? "1.5" : "1.5"}
          strokeDasharray={on ? undefined : "2 2"}
        />
      ))}

      {/* Headlight */}
      <circle cx="113" cy="80" r="3" fill="#d4a848" />
    </g>
  );
}
