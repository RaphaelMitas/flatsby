export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function place(className, styles, parent = document.body) {
  const el = document.createElement("div");
  el.className = className;
  Object.assign(el.style, styles);
  parent.appendChild(el);
  return el;
}

// The icon's cat spans x 0.30-0.70 with its ears at y 0.27; it is drawn from a
// 1% wider box and cut off at y `cut` by whatever it peeks over. Returns the
// visible height.
export function placeCat({ size, cut, centerX, bottom }) {
  const visible = (cut - 0.27) * size;
  place("cat", {
    left: `${centerX - size * 0.21}px`,
    top: `${bottom - visible}px`,
    width: `${size * 0.42}px`,
    height: `${visible}px`,
    backgroundSize: `${size}px ${size}px`,
    backgroundPosition: `${-size * 0.29}px ${-size * 0.27}px`,
  });
  return visible;
}

function pixels(img) {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

// Where a Maestro `cropOn` capture sits in the full screenshot of the same
// screen, as [x, y, w, h] in capture pixels.
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
  // The crop is cut from a second screenshot of the same settled screen, so a
  // real match is near pixel-exact; anything else means the screen changed.
  if (best.error > samples.length * 3 * 0.1) {
    throw new Error(`${crop.src} does not match its capture`);
  }
  return [best.x, best.y, w, h];
}

export function union(boxes) {
  const x = Math.min(...boxes.map((b) => b[0]));
  const y = Math.min(...boxes.map((b) => b[1]));
  const right = Math.max(...boxes.map((b) => b[0] + b[2]));
  const bottom = Math.max(...boxes.map((b) => b[1] + b[3]));
  return [x, y, right - x, bottom - y];
}

export function trimX([x, y, w, h], fractionPerSide = 0) {
  return [x + w * fractionPerSide, y, w * (1 - 2 * fractionPerSide), h];
}
