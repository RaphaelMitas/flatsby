import type { SharedValue } from "react-native-reanimated";
import { useEffect, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Circle, G, Path, Rect, Svg } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "expo-router";

import { useThemeColors } from "~/lib/utils";
import { isChristmas } from "./christmas";

export const SKY = "#08142b";
const GRADIENT = [SKY, "#12284d", "#2b4f84", "#5b82b8"] as const;
const LOOP_MS = 12000;
// Enough sky above the scene that an iOS overscroll never runs out of it
const OVERSCROLL = 1000;

const TILE_WIDTH = 340;
// Squashed from the drawing so the roofs stay clear of the greeting
const SQUASH = 80 / 96;

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
const FLICKER_WINDOW = { x: 190, y: 56, width: 12, height: 14, rx: 1 };
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
    color: BULB_COLORS[i % BULB_COLORS.length] ?? "#ef4444",
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
] as const;

const FLAKES = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 41 + 3) % 100}%` as const,
  near: i % 3 === 0,
  speed: 1 + (i % 3),
  phase: (i * 0.37) % 1,
  sway: 4 + (i % 4) * 2,
}));
const FAR_FLAKES = FLAKES.filter((flake) => !flake.near);
const NEAR_FLAKES = FLAKES.filter((flake) => flake.near);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

type Clock = SharedValue<number>;

export function RooftopScene() {
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const clock = useSharedValue(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!isFocused || reduceMotion) return;
    clock.value = withRepeat(
      withTiming(clock.value + 1, { duration: LOOP_MS, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(clock);
  }, [isFocused, reduceMotion, clock]);

  return (
    <View pointerEvents="none" className="absolute inset-0">
      <View
        className="absolute inset-x-0"
        style={{ bottom: "100%", height: OVERSCROLL, backgroundColor: SKY }}
      />
      <View
        className="absolute inset-0 overflow-hidden"
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        <LinearGradient
          colors={GRADIENT}
          style={{ position: "absolute", inset: 0 }}
        />
        {STARS.map((star, index) => (
          <Star key={star.left} clock={clock} index={index} {...star} />
        ))}
        <Moon />
        {FAR_FLAKES.map((flake) => (
          <Flake key={flake.left} clock={clock} height={height} {...flake} />
        ))}
        <Skyline clock={clock} />
        {NEAR_FLAKES.map((flake) => (
          <Flake key={flake.left} clock={clock} height={height} {...flake} />
        ))}
      </View>
    </View>
  );
}

function Star({
  clock,
  index,
  left,
  top,
}: (typeof STARS)[number] & { clock: Clock; index: number }) {
  const style = useAnimatedStyle(() => {
    const wave = Math.sin(2 * Math.PI * (clock.value * 5 + index / 2));
    return { opacity: 0.6 + 0.35 * wave };
  });

  return (
    <Animated.View
      style={[{ left, top }, style]}
      className="absolute size-0.5 rounded-full bg-white"
    />
  );
}

function Moon() {
  return (
    <View
      className="absolute top-20 right-8 rounded-full"
      style={{ boxShadow: "0 0 16px #cfe0ff55" }}
    >
      <Svg viewBox="0 0 24 24" width={24} height={24}>
        <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="#f2f6ff" />
      </Svg>
    </View>
  );
}

function Flake({
  clock,
  height,
  left,
  near,
  speed,
  phase,
  sway,
}: (typeof FLAKES)[number] & { clock: Clock; height: number }) {
  const size = near ? 4 : 2;
  const style = useAnimatedStyle(() => {
    const fall = (clock.value * speed + phase) % 1;
    const drift = Math.sin(2 * Math.PI * (clock.value * speed * 2 + phase));
    return {
      transform: [
        { translateY: fall * (height + size) - size },
        { translateX: drift * sway },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        { left, width: size, height: size, opacity: near ? 0.9 : 0.55 },
        style,
      ]}
      className="absolute top-0 rounded-full bg-white"
    />
  );
}

function Skyline({ clock }: { clock: Clock }) {
  const { getColor } = useThemeColors();
  const { width } = useWindowDimensions();
  const christmas = isChristmas();
  const tiles = Array.from(
    { length: Math.ceil(width / TILE_WIDTH) },
    (_, tile) => tile,
  );

  return (
    // Anchored right so the gap behind the cat lines up
    <View className="absolute right-0 bottom-0 flex-row-reverse">
      {tiles.map((tile) => (
        <Svg
          key={tile}
          viewBox="0 -20 340 116"
          width={TILE_WIDTH}
          height={116 * SQUASH}
          preserveAspectRatio="none"
          style={tile % 2 ? { transform: [{ scaleX: -1 }] } : undefined}
        >
          <G transform="translate(0 16)">
            <Path d={FAR} fill="#36598c" />
            <Path
              d={FAR_SNOW}
              stroke="#d3e1f2"
              strokeWidth={2.4}
              strokeLinecap="round"
              fill="none"
            />
            {FAR_WINDOWS.map(([x, y]) => (
              <Rect
                key={x}
                x={x}
                y={y}
                width={2}
                height={3}
                fill="#fde68a"
                opacity={0.75}
              />
            ))}
          </G>
          <Path d={HOUSES} fill={HOUSE} />
          {LIT_WINDOWS.map(([x, y, width, height]) => (
            <Rect
              key={x}
              x={x}
              y={y}
              width={width}
              height={height}
              rx={1}
              fill={LIT}
            />
          ))}
          <Rect x={108} y={58} width={10} height={12} rx={1} fill={DARK} />
          <Circle cx={176} cy={34} r={5} fill={LIT} />
          {/* Only the tile always on screen animates, the rest stay still to spare the UI thread */}
          {tile === 0 ? (
            <FlickerWindow clock={clock} />
          ) : (
            <Rect {...FLICKER_WINDOW} fill={LIT} />
          )}
          <Path d={MULLIONS} fill="none" stroke={HOUSE} strokeWidth={1.2} />
          <G
            fill="none"
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d={ROOF_SNOW} stroke="#9db6d6" transform="translate(0 2)" />
            <Path d={ROOF_SNOW} stroke="#f4f8fd" />
          </G>
          <Path d={ICICLES} fill="#e6eef8" />
          <Rect x={168} y={62} width={16} height={22} rx={2} fill="#13233d" />
          {christmas && (
            <>
              <Circle
                cx={176}
                cy={71}
                r={4.2}
                fill="none"
                stroke="#16a34a"
                strokeWidth={2.4}
              />
              <Circle cx={176} cy={75} r={1.3} fill="#ef4444" />
              <Path d={WIRE} fill="none" stroke="#050b16" strokeWidth={1} />
              {BULBS.map((bulb, index) =>
                tile === 0 ? (
                  <Bulb key={bulb.cx} clock={clock} index={index} {...bulb} />
                ) : (
                  <Circle
                    key={bulb.cx}
                    cx={bulb.cx}
                    cy={bulb.cy}
                    r={2.2}
                    fill={bulb.color}
                  />
                ),
              )}
            </>
          )}
          {tile === 0 &&
            [0, 1, 2].map((puff) => (
              <Smoke key={puff} clock={clock} phase={puff / 3} />
            ))}
          <Path d={`${GROUND}V96H-2Z`} fill={getColor("background")} />
          <Path
            d={GROUND}
            fill="none"
            stroke={getColor("border")}
            strokeWidth={1.5}
          />
        </Svg>
      ))}
    </View>
  );
}

function FlickerWindow({ clock }: { clock: Clock }) {
  const animatedProps = useAnimatedProps(() => {
    const t = clock.value % 1;
    return { opacity: t > 0.62 && t < 0.8 ? 0 : 1 };
  });

  return (
    <>
      <Rect {...FLICKER_WINDOW} fill={DARK} />
      <AnimatedRect
        {...FLICKER_WINDOW}
        fill={LIT}
        animatedProps={animatedProps}
      />
    </>
  );
}

function Bulb({
  clock,
  index,
  cx,
  cy,
  color,
}: (typeof BULBS)[number] & { clock: Clock; index: number }) {
  const animatedProps = useAnimatedProps(() => {
    const wave = Math.sin(2 * Math.PI * (clock.value * 7 + index * 0.27));
    return { opacity: 0.65 + 0.35 * wave };
  });

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={2.2}
      fill={color}
      animatedProps={animatedProps}
    />
  );
}

function Smoke({ clock, phase }: { clock: Clock; phase: number }) {
  const animatedProps = useAnimatedProps(() => {
    const rise = (clock.value * 3 + phase) % 1;
    return {
      cx: 134 + rise * 10,
      cy: 12 - rise * 26,
      r: 2 + rise * 5,
      opacity: rise < 0.15 ? (rise / 0.15) * 0.55 : 0.55 * ((1 - rise) / 0.85),
    };
  });

  return <AnimatedCircle fill="#c9d6e6" animatedProps={animatedProps} />;
}
