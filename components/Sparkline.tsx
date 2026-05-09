// Tiny inline-SVG sparkline. No deps, server-renderable.

export default function Sparkline({
  values,
  width = 240,
  height = 48,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  // Soft fill under the line.
  const last = points[points.length - 1];
  const first = points[0];
  const fill = `${path} L${last[0].toFixed(1)},${(pad + innerH).toFixed(1)} L${first[0].toFixed(1)},${(pad + innerH).toFixed(1)} Z`;

  // Trend colour — lower is good for a price tracker.
  const change = values[values.length - 1] - values[0];
  const tone =
    change < 0
      ? "text-green-600 dark:text-green-400"
      : change > 0
        ? "text-red-600 dark:text-red-400"
        : "text-neutral-500";

  return (
    <svg width={width} height={height} className={tone} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={fill} fill="currentColor" fillOpacity={0.1} />
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill="currentColor" />
    </svg>
  );
}
