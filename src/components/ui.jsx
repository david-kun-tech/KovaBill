import {
  ArrowLeft,
  ArrowRight,
  ChartPie,
  Check,
  ChevronRight,
  Coins,
  Copy,
  Download,
  FileText,
  HardDrive,
  House,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  TriangleAlert,
  Upload,
  Printer,
  MessageCircle,
  Mail,
  FileSpreadsheet,
  ScrollText,
  Users,
  X,
} from 'lucide-react';
import { STATUS_LABEL } from '../utils/invoice.js';
import { COLORS, MARK, colorFor, markGeometry } from '../brand/mark.js';

// ---------- icons (Lucide, ISC licence) ----------
const ICONS = {
  home: House,
  invoice: FileText,
  plus: Plus,
  users: Users,
  settings: SlidersHorizontal,
  search: Search,
  back: ArrowLeft,
  arrow: ArrowRight,
  trash: Trash2,
  copy: Copy,
  download: Download,
  send: Send,
  check: Check,
  x: X,
  layers: Layers,
  coins: Coins,
  ring: ChartPie,
  alert: TriangleAlert,
  upload: Upload,
  print: Printer,
  chat: MessageCircle,
  mail: Mail,
  sheet: FileSpreadsheet,
  statement: ScrollText,
  sparkle: Sparkles,
  chevron: ChevronRight,
  shield: ShieldCheck,
  phone: Smartphone,
  drive: HardDrive,
  refresh: RefreshCw,
  share: Share2,
};

export function Icon({ name, size = 20, strokeWidth = 1.8, className = '' }) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      className={`icon ${className}`}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
    />
  );
}

// KovaBill mark: an upright K trailing a stack of invoice pages (see src/brand/mark.js).
const GEO = markGeometry();
const TILE_SCALE = Math.min(66 / GEO.box.w, 62 / GEO.box.h);

function MarkPaths({ tone }) {
  return GEO.shapes.map((s) => {
    const c = colorFor(s.role, tone);
    return <path key={s.role} d={s.d} fill={c} stroke={c} strokeWidth={MARK.round * 2} strokeLinejoin="round" />;
  });
}

/**
 * tile: the app-icon square (ink background). size = its width/height.
 * bare: just the mark. size = its height; tone = 'light' | 'dark' background.
 */
export function Logo({ size = 40, tile = true, tone = 'light', className = '' }) {
  if (tile) {
    const tx = 50 - (GEO.box.x + GEO.box.w / 2) * TILE_SCALE;
    const ty = 50 - (GEO.box.y + GEO.box.h / 2) * TILE_SCALE;
    return (
      <svg className={`logo ${className}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <rect width="100" height="100" rx="24" fill={COLORS.ink} />
        <g transform={`translate(${tx} ${ty}) scale(${TILE_SCALE})`}>
          <MarkPaths tone="dark" />
        </g>
      </svg>
    );
  }
  return (
    <svg
      className={`logo ${className}`}
      height={size}
      width={(size * GEO.box.w) / GEO.box.h}
      viewBox={GEO.viewBox}
      aria-hidden="true"
    >
      <MarkPaths tone={tone} />
    </svg>
  );
}

// The full lockup: mark + "KovaBill" wordmark (Kova bold, Bill light)
export function Wordmark({ size = 20, tone = 'light' }) {
  return (
    <span className={`wordmark tone-${tone}`} style={{ fontSize: size }}>
      <Logo tile={false} tone={tone} size={size * 1.25} />
      <span>
        <b>Kova</b>Bill
      </span>
    </span>
  );
}

// ---------- avatar ----------
const TINTS = ['lime', 'lilac', 'sky', 'peach', 'mint', 'sand'];
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

export function Avatar({ name, size = 'md', square = false }) {
  const tint = TINTS[hash(name || '?') % TINTS.length];
  return (
    <span className={`avatar avatar-${size} tint-${tint} ${square ? 'square' : ''}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function StatusPill({ status }) {
  return (
    <span className={`pill pill-${status}`}>
      <span className="pill-dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

// ---------- collection ring ----------
export function Ring({ value, label }) {
  return (
    <div className="ring" role="img" aria-label={`${value}% ${label}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="42" className="ring-track" pathLength="100" />
        <circle
          cx="50"
          cy="50"
          r="42"
          className="ring-value"
          pathLength="100"
          style={{ '--offset': 100 - Math.max(0, Math.min(100, value)) }}
        />
      </svg>
      <span className="ring-label">{value}%</span>
    </div>
  );
}
