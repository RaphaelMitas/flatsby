import type { ReceiptBox, StageTag } from "./receipt-scan";

const WIDTH = 300;
const HEIGHT = 420;
const INK = "#374151";
const TEXT = "#d1d5db";
const FAINT = "#e5e7eb";

type Bar = [x: number, y: number, width: number, height: number, fill: string];

const STORE: Bar = [24, 30, 110, 16, INK];
const DATE: Bar = [206, 44, 70, 8, INK];
const TOTAL: Bar = [216, 336, 60, 12, INK];

const ROWS = [130, 110, 150, 95, 120].flatMap((width, i): Bar[] => [
  [24, 184 + i * 20, width, 6, TEXT],
  [236, 184 + i * 20, 40, 6, TEXT],
]);

const BARS: Bar[] = [
  STORE,
  [24, 54, 90, 6, TEXT],
  [24, 64, 70, 6, TEXT],
  [190, 30, 86, 6, TEXT],
  DATE,
  [24, 96, 80, 6, TEXT],
  [24, 106, 100, 6, TEXT],
  [24, 116, 60, 6, TEXT],
  [24, 146, 120, 10, INK],
  [24, 172, 252, 1.5, TEXT],
  ...ROWS,
  [24, 288, 252, 1.5, TEXT],
  [150, 302, 60, 6, TEXT],
  [236, 302, 40, 6, TEXT],
  [150, 316, 50, 6, TEXT],
  [242, 316, 34, 6, TEXT],
  [150, 338, 56, 8, INK],
  TOTAL,
  [24, 388, 252, 5, FAINT],
  [60, 398, 180, 5, FAINT],
];

const box = ([x, y, width, height]: Bar): ReceiptBox => ({
  x: x / WIDTH,
  y: y / HEIGHT,
  width: width / WIDTH,
  height: height / HEIGHT,
});

// A PDF has no photo to show, so the reading stage shows this drawn invoice instead
export const receiptDocument = {
  width: WIDTH,
  height: HEIGHT,
  svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect width="${WIDTH}" height="${HEIGHT}" fill="#fff"/>${BARS.map(
    ([x, y, width, height, fill]) =>
      `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${Math.min(height / 2, 3)}" fill="${fill}"/>`,
  ).join("")}</svg>`,
  marks: {
    store: box(STORE),
    date: box(DATE),
    amount: box(TOTAL),
  } satisfies Record<StageTag, ReceiptBox>,
};
