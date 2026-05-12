export default function TopoBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{
      background: "linear-gradient(180deg, #07111A 0%, #0B1622 100%)",
    }}>
      {/* Primary grid — cyan */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(24,195,214,0.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(24,195,214,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
      }} />
      {/* Secondary fine grid — cyan faint */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(24,195,214,0.025) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(24,195,214,0.025) 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px",
      }} />
      {/* Fade mask */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 70% 60% at 50% 40%, transparent 20%, #07111A 70%)",
      }} />
    </div>
  );
}
