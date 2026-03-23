export default function TopoBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{
      background: "linear-gradient(180deg, #07111A 0%, #0B1622 100%)",
    }}>
      {/* Primary grid — blue */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(43,89,255,0.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(43,89,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
      }} />
      {/* Secondary fine grid — violet */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(124,58,237,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(124,58,237,0.03) 1px, transparent 1px)
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
