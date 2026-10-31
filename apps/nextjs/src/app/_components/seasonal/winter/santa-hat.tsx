import { useIsChristmas } from "./christmas";

const FUR = "#f8fafc";
const FUR_EDGE = "#cbd5e1";

export function SantaHat() {
  if (!useIsChristmas()) return null;

  return (
    <g transform="translate(158 36) rotate(14)">
      <path
        d="M-27 -5C-20 -48 18 -66 46 -48C50 -44 50 -38 46 -34C34 -42 26 -38 27 -5Z"
        fill="#dc2626"
      />
      <path
        d="M6 -50C22 -58 36 -56 46 -48C50 -44 50 -38 46 -34C34 -42 26 -38 27 -5L16 -5C17 -24 14 -40 6 -50Z"
        fill="#b91c1c"
      />
      <rect
        x="-31"
        y="-9"
        width="62"
        height="18"
        rx="9"
        fill={FUR}
        stroke={FUR_EDGE}
        strokeWidth="3"
      />
      <circle
        cx="48"
        cy="-36"
        r="9"
        fill={FUR}
        stroke={FUR_EDGE}
        strokeWidth="3"
      />
    </g>
  );
}
