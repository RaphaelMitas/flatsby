import { Circle, G, Path, Rect, Svg } from "react-native-svg";

import { isChristmas } from "./christmas";

// The cat's own 229x255 frame, raised so the tip of the hat isn't clipped
const HEADROOM = 24;
const FUR = "#f8fafc";
const FUR_EDGE = "#cbd5e1";

export function SantaHat({ size }: { size: number }) {
  if (!isChristmas()) return null;

  return (
    <Svg
      pointerEvents="none"
      viewBox={`0 ${-HEADROOM} 229 255`}
      width={size}
      height={size}
      style={{ position: "absolute", left: 0, top: (-HEADROOM * size) / 255 }}
    >
      <G transform="translate(158 36) rotate(14)">
        <Path
          d="M-27 -5C-20 -48 18 -66 46 -48C50 -44 50 -38 46 -34C34 -42 26 -38 27 -5Z"
          fill="#dc2626"
        />
        <Path
          d="M6 -50C22 -58 36 -56 46 -48C50 -44 50 -38 46 -34C34 -42 26 -38 27 -5L16 -5C17 -24 14 -40 6 -50Z"
          fill="#b91c1c"
        />
        <Rect
          x={-31}
          y={-9}
          width={62}
          height={18}
          rx={9}
          fill={FUR}
          stroke={FUR_EDGE}
          strokeWidth={3}
        />
        <Circle
          cx={48}
          cy={-36}
          r={9}
          fill={FUR}
          stroke={FUR_EDGE}
          strokeWidth={3}
        />
      </G>
    </Svg>
  );
}
