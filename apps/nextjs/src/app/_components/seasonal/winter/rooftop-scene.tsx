import type { CSSProperties } from "react";

import { cn } from "@flatsby/ui";

import { isChristmas } from "./christmas";
import styles from "./rooftop-scene.module.css";

// The skyline is drawn as 340-wide tiles, anchored right so the gap behind the cat lines up
const TILES = [0, 1, 2];

const HOUSE = "#0b1628";
const LIT = "#fbbf24";
const DARK = "#1b2a44";

const HOUSES =
  "M-4 96V58l33-28 33 28v38ZM58 96V50l84-10v56ZM128 18h12v28h-12ZM138 96V46l38-34 38 34v50ZM206 96V64l21-14 21 14v32ZM314 96V56l26-22v62Z";
const LIT_WINDOWS = [
  [12, 66, 11, 13],
  [34, 66, 11, 13],
  [72, 60, 10, 12],
  [150, 56, 12, 14],
  [221, 70, 12, 12],
  [326, 66, 11, 13],
] as const;
const MULLIONS =
  "M17.5 66v13M12 72.5h11M39.5 66v13M34 72.5h11M156 56v14M150 63h12M196 56v14M190 63h12M227 70v12M221 76h12M331.5 66v13M326 72.5h11";
const ROOF_SNOW =
  "M-6 59 29 27l35 32M56 51l88-11M134 48l42-38 42 38M202 66l25-18 25 18M310 58l30-25M126 18h16";
const ICICLES =
  "M142 51l2 7 2-7ZM151 51l1.5 5 1.5-5ZM160 51l2 8 2-8ZM190 51l1.5 6 1.5-6ZM199 51l2 7 2-7ZM208 51l1.5 5 1.5-5ZM210 67l1.5 5 1.5-5ZM240 67l1.5 6 1.5-6ZM318 61l1.5 6 1.5-6ZM327 61l2 7 2-7ZM336 61l1.5 5 1.5-5Z";
const WIRE = "M60 58Q100 76 140 47";
const GROUND = "M-2 82q32-7 72-2t80-1 80 2 112-3";
const BULB_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"];
const BULBS = Array.from({ length: 9 }, (_, i) => {
  const t = (i + 1) / 10;
  const u = 1 - t;
  return {
    cx: u * u * 60 + 2 * u * t * 100 + t * t * 140,
    cy: u * u * 58 + 2 * u * t * 76 + t * t * 47 + 2.5,
    color: BULB_COLORS[i % BULB_COLORS.length],
    delay: `${-((i * 0.45) % 1.8)}s`,
  };
});

const FAR =
  "M0 80V48h18v-8h16v12h18V36l10-8 10 8v14h20v-6h18v12h18V30h6v-8l3-16 3 16v8h6v24h22V42l14-10 14 10v16h18V46h22v-8h16v12h18V40l14-10 14 10v12h20v-8h22v36Z";
const FAR_SNOW =
  "M0 48h18M18 40h16M34 52h18M52 36l10-8 10 8M72 50h20M92 44h18M110 56h18M128 30h6M146 30h6M168 42l14-10 14 10M196 58h18M214 46h22M236 38h16M252 50h18M270 40l14-10 14 10M298 52h20M318 44h22";
const FAR_WINDOWS = [
  [8, 56],
  [40, 60],
  [60, 44],
  [98, 52],
  [180, 48],
  [222, 54],
  [242, 46],
  [284, 46],
  [326, 52],
] as const;

const STARS = [
  { left: "8%", top: 14 },
  { left: "21%", top: 40 },
  { left: "37%", top: 8 },
  { left: "52%", top: 30 },
  { left: "64%", top: 12 },
  { left: "78%", top: 44 },
  { left: "90%", top: 20 },
];

const FLAKES = Array.from({ length: 22 }, (_, i) => ({
  near: i % 3 === 0,
  style: {
    left: `${(i * 41 + 3) % 100}%`,
    "--sway": `${(i % 2 ? 1 : -1) * (6 + (i % 4) * 3)}px`,
    animationDuration: `${(i % 3 === 0 ? 5 : 8) + (i % 5) * 0.9}s`,
    animationDelay: `${-((i * 1.37) % 9)}s`,
  } satisfies CSSProperties & { "--sway": string },
}));

export function RooftopScene() {
  const christmas = isChristmas();

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0", styles.scene)}
    >
      {STARS.map(({ left, top }, index) => (
        <span
          key={left}
          className={cn("absolute size-0.5 rounded-full bg-white", styles.star)}
          style={{ left, top, animationDelay: `${-index * 0.6}s` }}
        />
      ))}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={cn("absolute top-5 right-1/3 size-6", styles.moon)}
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="#f2f6ff" />
      </svg>
      <Flakes near={false} />
      <div className="absolute right-0 bottom-0 flex flex-row-reverse">
        {TILES.map((tile) => (
          <svg
            key={tile}
            aria-hidden="true"
            viewBox="0 0 340 80"
            className={cn("h-20 w-85 shrink-0", tile % 2 && "-scale-x-100")}
          >
            <path d={FAR} fill="#36598c" />
            <path
              d={FAR_SNOW}
              stroke="#d3e1f2"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
            {FAR_WINDOWS.map(([x, y]) => (
              <rect
                key={x}
                x={x}
                y={y}
                width="2"
                height="3"
                fill="#fde68a"
                opacity="0.75"
              />
            ))}
          </svg>
        ))}
      </div>
      <div className="absolute right-0 bottom-0 flex flex-row-reverse">
        {TILES.map((tile) => (
          <svg
            key={tile}
            aria-hidden="true"
            viewBox="0 -20 340 116"
            className={cn("h-29 w-85 shrink-0", tile % 2 && "-scale-x-100")}
          >
            <path d={HOUSES} fill={HOUSE} />
            {LIT_WINDOWS.map(([x, y, width, height]) => (
              <rect
                key={x}
                x={x}
                y={y}
                width={width}
                height={height}
                rx="1"
                fill={LIT}
              />
            ))}
            <rect x="108" y="58" width="10" height="12" rx="1" fill={DARK} />
            <rect x="190" y="56" width="12" height="14" rx="1" fill={DARK} />
            <rect
              x="190"
              y="56"
              width="12"
              height="14"
              rx="1"
              fill={LIT}
              className={styles.flicker}
            />
            <circle cx="176" cy="34" r="5" fill={LIT} />
            <path d={MULLIONS} fill="none" stroke={HOUSE} strokeWidth="1.2" />
            <g
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={ROOF_SNOW} stroke="#9db6d6" transform="translate(0 2)" />
              <path d={ROOF_SNOW} stroke="#f4f8fd" />
            </g>
            <path d={ICICLES} fill="#e6eef8" />
            <rect x="168" y="62" width="16" height="22" rx="2" fill="#13233d" />
            {christmas && (
              <>
                <circle
                  cx="176"
                  cy="71"
                  r="4.2"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.4"
                />
                <circle cx="176" cy="75" r="1.3" fill="#ef4444" />
                <path d={WIRE} fill="none" stroke="#050b16" strokeWidth="1" />
                {BULBS.map(({ cx, cy, color, delay }) => (
                  <circle
                    key={cx}
                    cx={cx}
                    cy={cy}
                    r="2.2"
                    fill={color}
                    className={styles.bulb}
                    style={{ animationDelay: delay }}
                  />
                ))}
              </>
            )}
            {[0, -1.33, -2.66].map((delay) => (
              <circle
                key={delay}
                cx="134"
                cy="12"
                r="4"
                fill="#c9d6e6"
                className={styles.smoke}
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
            <path d={`${GROUND}V96H-2Z`} className="fill-background" />
            <path
              d={GROUND}
              fill="none"
              strokeWidth="1.5"
              className="stroke-border"
            />
          </svg>
        ))}
      </div>
      <Flakes near />
    </div>
  );
}

function Flakes({ near }: { near: boolean }) {
  return FLAKES.filter((flake) => flake.near === near).map(({ style }) => (
    <span
      key={style.left}
      className={cn(
        styles.flake,
        near ? "size-1 opacity-90" : "size-0.5 opacity-55",
      )}
      style={style}
    />
  ));
}
