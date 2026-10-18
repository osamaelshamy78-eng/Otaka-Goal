// The Otaka Goal mark: a football drawn from a central pentagon and five edge patches.
const pt = (cx: number, cy: number, r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)].map((n) => +n.toFixed(2));
const poly = (pts: number[][]) => "M" + pts.map((p) => p.join(" ")).join("L") + "Z";

function ballPaths(cx: number, cy: number, r: number) {
  const up = -Math.PI / 2, step = (2 * Math.PI) / 5, p = r * 0.31;
  const inner = [...Array(5)].map((_, k) => pt(cx, cy, r * 0.37, up + k * step));
  const centers = [...Array(5)].map((_, k) => pt(cx, cy, r, up + k * step));
  const patches = centers.map((c, k) => [...Array(5)].map((_, j) => pt(c[0], c[1], p, up + k * step + Math.PI + j * step)));
  const d2 = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  let seams = "";
  for (let k = 0; k < 5; k++) {
    const n = (k + 1) % 5;
    const a = patches[k].reduce((m, v) => (d2(v, centers[n]) < d2(m, centers[n]) ? v : m));
    const b = patches[n].reduce((m, v) => (d2(v, centers[k]) < d2(m, centers[k]) ? v : m));
    seams += `M${inner[k].join(" ")}L${patches[k][0].join(" ")}M${a.join(" ")}L${b.join(" ")}`;
  }
  return { center: poly(inner), patches: patches.map(poly).join(""), seams };
}

export function Ball({ size, id, ink = "var(--band)", fill = "#F4F8F7", className }: { size: number; id: string; ink?: string; fill?: string; className?: string }) {
  const r = 21, c = 24, { center, patches, seams } = ballPaths(c, c, r);
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <clipPath id={id}><circle cx={c} cy={c} r={r} /></clipPath>
      <circle cx={c} cy={c} r={r} fill={fill} />
      <g clipPath={`url(#${id})`} fill={ink} stroke={ink} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
        <path d={center} />
        <path d={patches} />
        <path d={seams} fill="none" />
      </g>
      <circle cx={c} cy={c} r={r - 0.8} fill="none" stroke={ink} strokeWidth={1.7} />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo" dir="ltr" aria-label="Otaka Goal">
      <span className="logo-mark">
        <Ball size={34} id="logo-mark" />
      </span>
      <span className="logo-word">
        <span className="logo-top"><Ball size={18} id="logo-o" className="logo-o" />TAKA</span>
        <b>GOAL</b>
      </span>
    </span>
  );
}
