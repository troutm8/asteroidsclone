import { W, H } from './config.js';

export const TAU = Math.PI * 2;

export const rand = (a, b) => a + Math.random() * (b - a);
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Wrap an object with x/y around the playfield. It leaves the screen fully
// (by `margin`) before reappearing on the opposite side.
export function wrap(o, margin) {
  if (o.x < -margin) o.x += W + margin * 2;
  else if (o.x > W + margin) o.x -= W + margin * 2;
  if (o.y < -margin) o.y += H + margin * 2;
  else if (o.y > H + margin) o.y -= H + margin * 2;
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

// Rotate + translate a local polygon into world space.
export function transformPoly(local, x, y, angle, scale = 1) {
  const c = Math.cos(angle) * scale, s = Math.sin(angle) * scale;
  const out = new Array(local.length);
  for (let i = 0; i < local.length; i++) {
    const [px, py] = local[i];
    out[i] = [x + px * c - py * s, y + px * s + py * c];
  }
  return out;
}

// Ray-casting point-in-polygon test.
export function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function orient(ax, ay, bx, by, cx, cy) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

export function segIntersect(a, b, c, d) {
  const o1 = orient(a[0], a[1], b[0], b[1], c[0], c[1]);
  const o2 = orient(a[0], a[1], b[0], b[1], d[0], d[1]);
  const o3 = orient(c[0], c[1], d[0], d[1], a[0], a[1]);
  const o4 = orient(c[0], c[1], d[0], d[1], b[0], b[1]);
  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

// True if two convex-or-concave polygons overlap (edge crossing or containment).
export function polysIntersect(A, B) {
  for (let i = 0; i < A.length; i++) {
    const a1 = A[i], a2 = A[(i + 1) % A.length];
    for (let j = 0; j < B.length; j++) {
      if (segIntersect(a1, a2, B[j], B[(j + 1) % B.length])) return true;
    }
  }
  return pointInPoly(A[0][0], A[0][1], B) || pointInPoly(B[0][0], B[0][1], A);
}
