import { useEffect, useRef, useState } from 'react';
import type { LatLng } from './MapView';

export type DrawMode = 'free' | 'rect' | 'circle';
type Px = [x: number, y: number];

// Ramer-Douglas-Peucker: drops points that sit within `eps` pixels of the line through their neighbours.
function simplify(pts: Px[], eps: number): Px[] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let worst = 0;
  let at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((b[0] - a[0]) * (a[1] - pts[i][1]) - (a[0] - pts[i][0]) * (b[1] - a[1])) / len;
    if (d > worst) [worst, at] = [d, i];
  }
  return worst <= eps ? [a, b] : [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)];
}

// A closed curve through the midpoints of the traced points, so the stroke has no corners.
function smooth(pts: Px[]) {
  if (pts.length < 3) return `M${pts.map((p) => p.join(',')).join('L')}`;
  const mid = (a: Px, b: Px) => `${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2}`;
  return `M${mid(pts[0], pts[1])}` + pts.slice(1, -1).map((p, i) => `Q${p.join(',')} ${mid(p, pts[i + 2])}`).join('');
}

const circlePts = (c: Px, r: number): Px[] => Array.from({ length: 64 }, (_, i) => [c[0] + r * Math.cos((i / 64) * 2 * Math.PI), c[1] + r * Math.sin((i / 64) * 2 * Math.PI)]);

// Sits over the map while a drawing tool is active. The shape is drawn in screen space
// as the pointer drags (mouse, pen or touch) and turned into map coordinates on release.
export function DrawOverlay({ mode, toLatLng, onDone, onCancel }: { mode: DrawMode; toLatLng: (x: number, y: number) => LatLng | null; onDone: (ring: LatLng[]) => void; onCancel: () => void }) {
  const el = useRef<SVGSVGElement>(null);
  const [start, setStart] = useState<Px | null>(null);
  const [now, setNow] = useState<Px | null>(null);
  const trace = useRef<Px[]>([]);
  const [, redraw] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const at = (e: React.PointerEvent): Px => {
    const box = el.current!.getBoundingClientRect();
    return [e.clientX - box.left, e.clientY - box.top];
  };
  const shape = (): Px[] => {
    if (!start || !now) return [];
    if (mode === 'rect') return [start, [now[0], start[1]], now, [start[0], now[1]]];
    if (mode === 'circle') return circlePts(start, Math.hypot(now[0] - start[0], now[1] - start[1]));
    return trace.current;
  };

  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    el.current!.setPointerCapture(e.pointerId);
    const p = at(e);
    trace.current = [p];
    setStart(p);
    setNow(p);
  };
  const move = (e: React.PointerEvent) => {
    if (!start) return;
    const p = at(e);
    const last = trace.current[trace.current.length - 1];
    if (mode === 'free' && Math.hypot(p[0] - last[0], p[1] - last[1]) >= 3) {
      trace.current.push(p);
      redraw((n) => n + 1);
    }
    setNow(p);
  };
  const up = () => {
    const pts = mode === 'free' ? simplify(trace.current, 1.5) : shape();
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const big = pts.length >= 3 && Math.max(...xs) - Math.min(...xs) > 12 && Math.max(...ys) - Math.min(...ys) > 12;
    const ring = big ? pts.map(([x, y]) => toLatLng(x, y)).filter((p): p is LatLng => !!p) : [];
    setStart(null);
    setNow(null);
    trace.current = [];
    // A stray click or tiny drag keeps the tool active for another try.
    if (ring.length >= 3) onDone(ring);
  };

  const pts = shape();
  const d = !pts.length ? '' : mode === 'free' ? smooth(pts) : `M${pts.map((p) => p.join(',')).join('L')}Z`;
  return (
    <svg ref={el} className="draw-overlay" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Drawing surface: press and drag to draw the search area">
      {d && <path d={d} fill="rgba(20, 112, 127, 0.12)" stroke="#14707f" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
      {mode === 'circle' && start && <circle cx={start[0]} cy={start[1]} r="4" fill="#14707f" />}
    </svg>
  );
}
