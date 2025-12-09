function SpaceBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Deep gradient sky */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_800px_at_20%_-10%,rgba(90,80,255,0.35),transparent_60%),radial-gradient(900px_700px_at_80%_-10%,rgba(0,255,200,0.25),transparent_60%),radial-gradient(1100px_900px_at_50%_120%,rgba(255,120,220,0.25),transparent_60%),linear-gradient(180deg,#04060b,35%,#070a12)]" />

      {/* Parallax star layers */}
      <div className="absolute inset-0 animate-[twinkle_16s_linear_infinite] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%224%22><circle cx=%220.5%22 cy=%220.5%22 r=%220.5%22 fill=%22white%22 opacity=%220.7%22/></svg>')] opacity-40 [background-size:2px_2px]" />
      <div className="absolute inset-0 animate-[drift_90s_linear_infinite] bg-[radial-gradient(1000px_800px_at_70%_30%,rgba(90,0,120,0.25),transparent_60%)]" />
      <div className="absolute inset-0 animate-[drift_120s_linear_infinite] bg-[radial-gradient(1000px_800px_at_30%_60%,rgba(0,110,200,0.22),transparent_60%)]" />

      {/* Soft vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,transparent_55%,rgba(0,0,0,0.38))]" />
    </div>
  );
}
