export function Logo({ className = "h-16" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/PCP-logo.png"
        alt="PADEL CENTER PUAN"
        className="object-contain"
        style={{ maxHeight: "100%", width: "auto", height: "100%" }}
        crossOrigin="anonymous"
      />
    </div>
  );
}

