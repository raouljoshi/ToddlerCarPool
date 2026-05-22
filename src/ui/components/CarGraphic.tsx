import type { Direction } from "../../domain/types";

interface CarGraphicProps {
  /** "outbound" faces right (there); "inbound" faces left (home). */
  direction?: Direction;
  /** Visible seats; true = filled. Defaults to three dashed-outline seats. */
  seats?: boolean[];
  className?: string;
}

/**
 * Picture-book side-profile car — the app's visual signature.
 * Shared by the landing hero and the There/Home toggle.
 */
export function CarGraphic({
  direction = "outbound",
  seats = [false, false, false],
  className,
}: CarGraphicProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 124 124"
      role="img"
      aria-label="Car"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        transform={
          direction === "inbound" ? "translate(124,0) scale(-1,1)" : undefined
        }
      >
        <circle cx="22" cy="108" r="11" fill="#1f2a3a" />
        <circle cx="22" cy="108" r="4.5" fill="#fbf7f0" />
        <circle cx="98" cy="108" r="11" fill="#1f2a3a" />
        <circle cx="98" cy="108" r="4.5" fill="#fbf7f0" />

        <path
          d="M4 95 L4 70 Q4 60 14 60 L34 40 Q40 32 48 32 L74 32 Q82 32 88 38 L108 60 L116 60 Q120 60 120 64 L120 92 Q120 100 112 100 L112 102 L100 102 L100 100 L20 100 L20 102 L8 102 L8 100 Q4 100 4 95 Z"
          fill="#fbf7f0"
          stroke="#1f2a3a"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        <path
          d="M36 40 Q42 36 48 36 L74 36 Q80 36 84 40 L84 58 L36 58 Z"
          fill="#ede3d2"
          opacity="0.7"
        />

        {seats.slice(0, 3).map((on, i) => (
          <circle
            key={i}
            cx={44 + i * 18}
            cy={48}
            r={6.5}
            fill={on ? "#d4a848" : "#fbf7f0"}
            stroke={on ? "#1f2a3a" : "#d4c9b3"}
            strokeWidth="1.6"
            strokeDasharray={on ? undefined : "2.4 2.4"}
          />
        ))}

        <circle cx="113" cy="80" r="3.4" fill="#d4a848" />
      </g>
    </svg>
  );
}
