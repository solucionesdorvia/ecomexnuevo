import { cn } from "./cn";

export function ProgressRing({
  value,
  size = 44,
  stroke = 5,
  className,
  label,
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  className?: string;
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(15,73,189,0.95)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[11px] font-black tracking-tight text-white">
          {Math.round(v)}%
        </div>
        {label ? (
          <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-muted">
            {label}
          </div>
        ) : null}
      </div>
    </div>
  );
}

