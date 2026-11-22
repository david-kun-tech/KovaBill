// The KovaBill mark: an upright K whose open side trails a stack of invoice "pages".
// Single source of truth. The React <Logo> and the icon build script both draw from here.
// Tune it visually in design/logo-tuner.html, then copy the numbers into MARK.

export const MARK = {
  lean: 0, // back-slant (top leans left); 0 = upright
  stem: 10, // stem width
  thick: 18, // arm and page thickness
  gap: 7, // spacing between every strip
  slope: 0.78, // how far an arm travels sideways per unit up/down
  pages: 2,
  firstPage: 40, // first page's half-height (the K's arms are 50)
  shrink: 10, // each next page is this much shorter
  round: 1.2, // corner softening
};

export const COLORS = {
  ink: '#12130f',
  cream: '#f1f1eb',
  green: '#4d9a12',
  lime: '#9bff3a',
};

// tone = which background the mark sits on
export const TONES = {
  light: { k: COLORS.ink, pages: [COLORS.green, COLORS.lime] },
  dark: { k: COLORS.cream, pages: [COLORS.green, COLORS.lime] },
};

const fmt = (n) => +n.toFixed(2);

/** Shapes in drawing order (back pages first, K on top) plus a tight viewBox. */
export function markGeometry(p = MARK) {
  const { lean, stem: SW, thick: T, gap, slope, pages, firstPage, shrink } = p;
  const chevron = (v, h) => {
    const up = h * (slope + lean);
    const down = h * (slope - lean);
    return [[v, 50], [v + up, 50 - h], [v + up + T, 50 - h], [v + T, 50], [v + down + T, 50 + h], [v + down, 50 + h]];
  };
  const armsAt = SW + gap;
  const shapes = [];
  for (let i = pages; i >= 1; i--) {
    const h = Math.max(6, firstPage - (i - 1) * shrink);
    shapes.push({ role: `page${i}`, pts: chevron(armsAt + i * (T + gap), h) });
  }
  shapes.push({ role: 'arms', pts: chevron(armsAt, 50) });
  shapes.push({ role: 'stem', pts: [[0, 0], [SW, 0], [SW, 100], [0, 100]] });

  // apply the lean directly to the points
  for (const s of shapes) s.pts = s.pts.map(([x, y]) => [x + lean * y, y]);

  const all = shapes.flatMap((s) => s.pts);
  const pad = p.round;
  const minX = Math.min(...all.map((q) => q[0])) - pad;
  const maxX = Math.max(...all.map((q) => q[0])) + pad;
  const minY = Math.min(...all.map((q) => q[1])) - pad;
  const maxY = Math.max(...all.map((q) => q[1])) + pad;

  return {
    box: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    viewBox: `${fmt(minX)} ${fmt(minY)} ${fmt(maxX - minX)} ${fmt(maxY - minY)}`,
    shapes: shapes.map((s) => ({ role: s.role, d: 'M' + s.pts.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L') + 'Z' })),
  };
}

export const colorFor = (role, tone = 'light') => {
  const t = TONES[tone];
  return role.startsWith('page') ? t.pages[Number(role.slice(4)) - 1] ?? t.pages.at(-1) : t.k;
};

/** Standalone SVG string (for favicons / files). tile = ink rounded square app icon. */
export function markSVG({ tone = 'light', tile = false } = {}) {
  const g = markGeometry();
  const paths = g.shapes
    .map((s) => {
      const c = colorFor(s.role, tile ? 'dark' : tone);
      return `<path d="${s.d}" fill="${c}" stroke="${c}" stroke-width="${MARK.round * 2}" stroke-linejoin="round"/>`;
    })
    .join('');
  if (!tile) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${g.viewBox}">${paths}</svg>`;
  }
  // centre the mark in a 100×100 rounded tile, ~66% of its width
  const scale = Math.min(66 / g.box.w, 62 / g.box.h);
  const tx = 50 - (g.box.x + g.box.w / 2) * scale;
  const ty = 50 - (g.box.y + g.box.h / 2) * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="${COLORS.ink}"/><g transform="translate(${fmt(tx)} ${fmt(ty)}) scale(${fmt(scale)})">${paths}</g></svg>`;
}
