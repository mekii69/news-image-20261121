// News front page for Saturday 21 November 2026, drawn procedurally.
// Node 22, standard library only. Deterministic: the same bytes every run.
// Writes entry.png to MAKEFUN_OUTPUT_DIR (default /output).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------- canvas ----------

const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3);

type RGB = [number, number, number];

const PAPER: RGB = [245, 240, 230];
const INK: RGB = [26, 26, 26];
const NAVY: RGB = [18, 40, 75];
const GOLD: RGB = [201, 162, 39];
const GOLD_LIGHT: RGB = [217, 180, 65];
const RED: RGB = [179, 38, 30];
const BLUE: RGB = [46, 111, 183];
const BLUE_LIGHT: RGB = [126, 171, 219];
const GREEN: RGB = [63, 140, 84];
const TEAL: RGB = [31, 122, 109];
const ORANGE: RGB = [224, 123, 57];
const YELLOW: RGB = [240, 196, 66];
const SLATE: RGB = [58, 66, 76];
const GRAY: RGB = [150, 148, 140];
const WHITE: RGB = [255, 255, 255];
const CARD: RGB = [255, 255, 255];
const BORDER: RGB = [207, 200, 184];
const STEEL: RGB = [96, 104, 112];

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
      i += 3;
    }
  }
}

function hline(x0: number, x1: number, y: number, c: RGB): void {
  if (x1 < x0) [x0, x1] = [x1, x0];
  rect(x0, y, x1 - x0 + 1, 1, c);
}

function vline(x: number, y0: number, y1: number, c: RGB): void {
  if (y1 < y0) [y0, y1] = [y1, y0];
  rect(x, y0, 1, y1 - y0 + 1, c);
}

function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPx(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function thickLine(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const half = Math.floor(t / 2);
  for (let ox = -half; ox <= half; ox++) {
    for (let oy = -half; oy <= half; oy++) {
      line(x0 + ox, y0 + oy, x1 + ox, y1 + oy, c);
    }
  }
}

function circle(cx: number, cy: number, r: number, c: RGB): void {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    hline(cx - dx, cx + dx, cy + dy, c);
  }
}

function ring(cx: number, cy: number, rOuter: number, rInner: number, c: RGB): void {
  for (let dy = -rOuter; dy <= rOuter; dy++) {
    const dxO = Math.floor(Math.sqrt(rOuter * rOuter - dy * dy));
    const dxI = dy >= -rInner && dy <= rInner ? Math.floor(Math.sqrt(rInner * rInner - dy * dy)) : -1;
    if (dxI < 0) {
      hline(cx - dxO, cx + dxO, cy + dy, c);
    } else {
      hline(cx - dxO, cx - dxI - 1, cy + dy, c);
      hline(cx + dxI + 1, cx + dxO, cy + dy, c);
    }
  }
}

function ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let dy = -ry; dy <= ry; dy++) {
    const dx = Math.floor((rx * Math.sqrt(ry * ry - dy * dy)) / ry);
    hline(cx - dx, cx + dx, cy + dy, c);
  }
}

function ellipseOutline(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  let prevX = cx + rx;
  let prevY = cy;
  for (let deg = 4; deg <= 360; deg += 4) {
    const t = (deg * Math.PI) / 180;
    const x = Math.round(cx + rx * Math.cos(t));
    const y = Math.round(cy + ry * Math.sin(t));
    line(prevX, prevY, x, y, c);
    prevX = x;
    prevY = y;
  }
}

function poly(pts: Array<[number, number]>, c: RGB): void {
  let minY = H;
  let maxY = 0;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      hline(Math.ceil(xs[k]), Math.floor(xs[k + 1]), y, c);
    }
  }
}

// ---------- 5x7 bitmap font (own construction) ----------
// Each glyph is 7 rows of 5 bits, most significant bit = leftmost pixel.

const GLYPHS: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  '0': [14, 17, 19, 21, 25, 17, 14],
  '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [31, 2, 4, 2, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2],
  '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14],
  '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 12, 12],
  ',': [0, 0, 0, 0, 12, 4, 8],
  ':': [0, 12, 12, 0, 12, 12, 0],
  "'": [4, 4, 8, 0, 0, 0, 0],
  '-': [0, 0, 0, 14, 0, 0, 0],
  '%': [25, 26, 2, 4, 8, 11, 19],
  '•': [0, 0, 14, 14, 14, 0, 0],
};

function textWidth(s: string, scale: number): number {
  if (s.length === 0) return 0;
  return s.length * 6 * scale - scale;
}

function drawText(s: string, x: number, y: number, scale: number, c: RGB, align: 'left' | 'center' | 'right' = 'left'): void {
  let x0 = x;
  const w = textWidth(s, scale);
  if (align === 'center') x0 = x - Math.floor(w / 2);
  if (align === 'right') x0 = x - w;
  for (let ci = 0; ci < s.length; ci++) {
    const glyph = GLYPHS[s[ci].toUpperCase()] ?? GLYPHS[' '];
    const cx = x0 + ci * 6 * scale;
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if ((bits >> (4 - col)) & 1) {
          rect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
  }
}

// ---------- PNG encoding ----------

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function encodePng(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    Buffer.from(buf.subarray(y * W * 3, (y + 1) * W * 3)).copy(raw, y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- picture ----------

function card(x: number, y: number, w: number, h: number, accent: RGB): void {
  rect(x, y, w, h, CARD);
  rect(x, y, w, 3, BORDER);
  rect(x, y + h - 3, w, 3, BORDER);
  rect(x, y, 3, h, BORDER);
  rect(x + w - 3, y, 3, h, BORDER);
  rect(x, y, w, 8, accent);
}

// Lead pictogram: globe with a thermometer beside it.
function drawGlobe(cx: number, cy: number, r: number): void {
  circle(cx, cy, r, BLUE);
  // Land blobs, hand-placed inside the circle.
  poly(
    [
      [cx - 62, cy - 48],
      [cx - 30, cy - 66],
      [cx - 8, cy - 44],
      [cx - 26, cy - 18],
      [cx - 58, cy - 22],
    ],
    GREEN,
  );
  poly(
    [
      [cx + 12, cy - 30],
      [cx + 44, cy - 52],
      [cx + 62, cy - 22],
      [cx + 40, cy + 2],
      [cx + 14, cy - 6],
    ],
    GREEN,
  );
  poly(
    [
      [cx - 40, cy + 34],
      [cx - 6, cy + 26],
      [cx + 10, cy + 52],
      [cx - 16, cy + 66],
      [cx - 44, cy + 58],
    ],
    GREEN,
  );
  // Latitude chords.
  for (const dy of [-52, 52]) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    hline(cx - half, cx + half, cy + dy, BLUE_LIGHT);
    hline(cx - half, cx + half, cy + dy + 1, BLUE_LIGHT);
  }
  // Meridian ellipse.
  ellipseOutline(cx, cy, 44, r - 4, BLUE_LIGHT);
  ring(cx, cy, r, r - 5, NAVY);
}

function drawThermometer(x: number, y: number, h: number): void {
  const w = 26;
  const bulbR = 24;
  const tubeX = x + Math.floor((w - 12) / 2);
  rect(x, y, w, h - bulbR, WHITE);
  rect(x, y, 3, h - bulbR, SLATE);
  rect(x + w - 3, y, 3, h - bulbR, SLATE);
  rect(x, y, w, 3, SLATE);
  circle(x + Math.floor(w / 2), y + h - bulbR, bulbR, WHITE);
  ring(x + Math.floor(w / 2), y + h - bulbR, bulbR, bulbR - 3, SLATE);
  // Mercury: fills the lower 62% of the tube and the bulb.
  const tubeBottom = y + h - bulbR;
  const fillTop = y + Math.floor((h - bulbR) * 0.38);
  rect(tubeX, fillTop, 12, tubeBottom - fillTop, RED);
  circle(x + Math.floor(w / 2), y + h - bulbR, bulbR - 6, RED);
  // Tick marks.
  for (let i = 0; i < 4; i++) {
    const ty = y + 14 + i * 34;
    hline(x + w, x + w + 10, ty, SLATE);
  }
}

// Panel pictogram: factory with flame and smoke.
function drawFactory(x: number, y: number, s: number): void {
  const baseY = y + 108;
  rect(x + 8, baseY - 62, 96, 62, SLATE);
  poly(
    [
      [x + 8, baseY - 62],
      [x + 32, baseY - 84],
      [x + 56, baseY - 62],
      [x + 80, baseY - 84],
      [x + 104, baseY - 62],
    ],
    SLATE,
  );
  rect(x + 86, baseY - 96, 14, 34, SLATE);
  for (let i = 0; i < 3; i++) {
    rect(x + 20 + i * 28, baseY - 44, 16, 16, GOLD_LIGHT);
  }
  // Flame above the roof.
  poly(
    [
      [x + 30, baseY - 84],
      [x + 42, baseY - 116],
      [x + 52, baseY - 96],
      [x + 64, baseY - 122],
      [x + 74, baseY - 92],
      [x + 82, baseY - 108],
      [x + 88, baseY - 84],
    ],
    ORANGE,
  );
  poly(
    [
      [x + 46, baseY - 84],
      [x + 54, baseY - 104],
      [x + 62, baseY - 88],
      [x + 68, baseY - 100],
      [x + 70, baseY - 84],
    ],
    YELLOW,
  );
  // Smoke.
  circle(x + 96, baseY - 112, 9, GRAY);
  circle(x + 106, baseY - 128, 12, GRAY);
  circle(x + 118, baseY - 146, 8, GRAY);
}

// Panel pictogram: handcuffs.
function drawCuffs(cx: number, cy: number): void {
  const r = 34;
  const gap = 46;
  ring(cx - gap, cy, r, r - 11, STEEL);
  ring(cx + gap, cy, r, r - 11, STEEL);
  thickLine(cx - gap + 18, cy - 22, cx + gap - 18, cy - 22, 7, STEEL);
}

// Panel pictogram: falling chart.
function drawChart(x: number, y: number): void {
  const w = 128;
  const h = 108;
  for (let i = 1; i <= 3; i++) {
    hline(x, x + w, y + Math.floor((h * i) / 4), BORDER);
  }
  vline(x, y, y + h, SLATE);
  hline(x, x + w, y + h, SLATE);
  const pts: Array<[number, number]> = [
    [x + 6, y + 18],
    [x + 36, y + 34],
    [x + 62, y + 30],
    [x + 92, y + 62],
    [x + 122, y + 92],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    thickLine(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 6, RED);
  }
  poly(
    [
      [pts[4][0], pts[4][1]],
      [pts[4][0] - 16, pts[4][1] - 4],
      [pts[4][0] - 6, pts[4][1] - 16],
    ],
    RED,
  );
  // Candles.
  rect(x + 20, y + 52, 12, 22, RED);
  rect(x + 52, y + 66, 12, 20, RED);
  rect(x + 84, y + 80, 12, 18, RED);
}

// Panel pictogram: mosquito under a prohibition ring.
function drawMosquito(cx: number, cy: number): void {
  // Wings.
  ellipse(cx - 30, cy - 26, 26, 12, BLUE_LIGHT);
  ellipse(cx + 30, cy - 26, 26, 12, BLUE_LIGHT);
  // Legs.
  for (const [lx, ly] of [
    [-14, 14],
    [0, 18],
    [14, 14],
    [-14, -14],
    [0, -18],
    [14, -14],
  ] as Array<[number, number]>) {
    line(cx + lx, cy + Math.sign(ly) * 6, cx + lx * 2, cy + ly * 2, INK);
  }
  // Body and head.
  ellipse(cx, cy, 30, 13, INK);
  circle(cx + 34, cy - 2, 9, INK);
  line(cx + 42, cy - 2, cx + 56, cy + 2, INK);
  // Prohibition ring and slash.
  ring(cx, cy, 58, 51, RED);
  thickLine(cx - 38, cy + 38, cx + 38, cy - 38, 8, RED);
}

function panel(x: number, y: number, w: number, h: number, accent: RGB, kicker: string, head: string[], caption: string[]): void {
  card(x, y, w, h, accent);
  drawText(kicker, x + 176, y + 26, 2, RED);
  let hy = y + 52;
  for (const ln of head) {
    drawText(ln, x + 176, hy, 4, INK);
    hy += 32;
  }
  let cy = hy + 10;
  for (const ln of caption) {
    drawText(ln, x + 176, cy, 2, SLATE);
    cy += 18;
  }
}

function draw(): void {
  rect(0, 0, W, H, PAPER);

  // Masthead.
  rect(0, 0, W, 128, NAVY);
  rect(0, 128, W, 6, GOLD);
  drawText('21 NOVEMBER 2026', W / 2, 20, 8, WHITE, 'center');
  drawText('SATURDAY • WORLD NEWS IN ONE IMAGE', W / 2, 88, 3, GOLD_LIGHT, 'center');

  // Lead story.
  const lx = 24;
  const ly = 150;
  const lw = 976;
  const lh = 300;
  card(lx, ly, lw, lh, RED);
  rect(lx, ly, 10, lh, RED);
  drawGlobe(196, 302, 104);
  drawThermometer(306, 188, 216);
  drawText('CLIMATE • ANTALYA, TURKEY', 366, 174, 3, RED);
  drawText('CLIMATE TALKS', 366, 208, 6, INK);
  drawText('IN OVERTIME', 366, 258, 6, INK);
  rect(366, 316, 120, 5, GOLD);
  drawText('NEARLY 200 NATIONS DEADLOCKED', 366, 334, 3, INK);
  drawText('OVER FOSSIL FUELS AND FINANCE', 366, 362, 3, INK);
  drawText('TALKS RAN PAST DEADLINE INTO A SECOND NIGHT', 366, 396, 2, SLATE);

  // Grid of four stories.
  const pw = 480;
  const ph = 216;
  const gx = 24;
  const gy = 466;
  const gap = 16;

  // Bahrain.
  panel(gx, gy, pw, ph, RED, 'MIDDLE EAST', ['STRIKE SETS', 'PLANT ABLAZE'], ['BAHRAIN SAYS IRAN', 'HIT THE SITE;', 'NO INJURIES']);
  drawFactory(gx + 16, gy + 56, 1);

  // Mexico.
  panel(gx + pw + gap, gy, pw, ph, TEAL, 'MEXICO', ['CARTEL BOSS', 'CAPTURED'], ["'EL CHAPO ISIDRO'", 'HELD; 11 DEAD', 'IN SINALOA']);
  drawCuffs(gx + pw + gap + 84, gy + 118);

  // Markets.
  panel(gx, gy + ph + gap, pw, ph, NAVY, 'MARKETS', ['WALL ST IN', 'CORRECTION'], ['AI SELL-OFF:', "NASDAQ'S WORST", 'WEEK SINCE 2020']);
  drawChart(gx + 18, gy + ph + gap + 56);

  // Dengue.
  panel(gx + pw + gap, gy + ph + gap, pw, ph, GREEN, 'SCIENCE • BRAZIL', ['MOSQUITOES', 'BEAT DENGUE'], ['BRAZIL TRIAL:', 'INFECTIONS', 'DOWN 69%']);
  drawMosquito(gx + pw + gap + 84, gy + ph + gap + 118);

  // Footer.
  rect(0, 936, W, 88, NAVY);
  drawText('ALSO: CARGO SHIP ABLAZE IN THE GULF OF FINLAND', W / 2, 950, 3, WHITE, 'center');
  drawText('DRONE STRIKE ON SATURDAY; CREW OF 16 SAFE', W / 2, 984, 3, GOLD_LIGHT, 'center');
}

draw();

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), encodePng());
