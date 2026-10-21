// Finds where an element crop (Maestro `takeScreenshot` with `cropOn`) sits in
// the full capture of the same screen, so templates can lift exactly that row
// or tile whatever the language or layout. Returns [x, y, w, h] in capture px.
function pixels(img) {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

export function locate(capture, crop) {
  const W = capture.naturalWidth;
  const w = crop.naturalWidth;
  const h = crop.naturalHeight;
  const big = pixels(capture);
  const small = pixels(crop);
  const samples = [];
  for (const fy of [0.15, 0.35, 0.5, 0.65, 0.85]) {
    for (let i = 0; i < 48; i++) {
      samples.push([Math.floor(((i + 0.5) / 48) * w), Math.floor(fy * h)]);
    }
  }
  let best = { error: Infinity, x: 0, y: 0 };
  for (let y = 0; y <= capture.naturalHeight - h; y++) {
    for (let x = 0; x <= W - w; x++) {
      let error = 0;
      for (const [sx, sy] of samples) {
        const a = ((y + sy) * W + x + sx) * 4;
        const b = (sy * w + sx) * 4;
        error +=
          Math.abs(big[a] - small[b]) +
          Math.abs(big[a + 1] - small[b + 1]) +
          Math.abs(big[a + 2] - small[b + 2]);
        if (error >= best.error) break;
      }
      if (error < best.error) best = { error, x, y };
    }
  }
  return [best.x, best.y, w, h];
}

// Several crops lifted as one block (e.g. two consecutive list rows).
export function union(boxes) {
  const x = Math.min(...boxes.map((b) => b[0]));
  const y = Math.min(...boxes.map((b) => b[1]));
  const right = Math.max(...boxes.map((b) => b[0] + b[2]));
  const bottom = Math.max(...boxes.map((b) => b[1] + b[3]));
  return [x, y, right - x, bottom - y];
}

// Narrows a full-width tile to its centred content.
export function trimX([x, y, w, h], fraction = 0) {
  return [x + w * fraction, y, w * (1 - 2 * fraction), h];
}
