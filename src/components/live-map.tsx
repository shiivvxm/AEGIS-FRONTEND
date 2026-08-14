import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Stylized animated tactical map (SVG) — works without external map APIs
export interface MapMarker {
  id: string;
  type: "emergency" | "citizen" | "ambulance" | "hospital" | "volunteer" | "signal" | "traffic" | "command" | (string & {});
  x: number; // 0-100
  y: number; // 0-100
  label?: string;
  active?: boolean;
}

interface LiveMapProps {
  markers?: MapMarker[];
  route?: { from: [number, number]; via?: [number, number][]; to: [number, number] };
  className?: string;
  showGrid?: boolean;
  showCorridor?: boolean;
  dark?: boolean;
}

export function LiveMap({ markers = [], route, className, showGrid = true, showCorridor = false, dark = false }: LiveMapProps) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, []);

  const path = route ? buildPath(route) : null;

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl shadow-sm", className, dark ? "border border-[#242E42]" : "border border-gray-200/80")} style={{ minHeight: 360 }}>
      <div className={cn("absolute inset-0", dark ? "bg-[#0A0F1E]" : "bg-gradient-to-br from-[#F8F9FB] via-[#F3F4F6] to-[#E5E7EB]")} />
      {/* roads */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {showGrid && (
          <g stroke={dark ? "rgba(0,229,255,0.05)" : "rgba(0, 0, 0, 0.04)"} strokeWidth="0.15">
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="100" />
            ))}
          </g>
        )}
        {/* major roads */}
        <g stroke={dark ? "rgba(255,255,255,0.08)" : "rgba(0, 0, 0, 0.08)"} strokeWidth="1.2" fill="none">
          <path d="M0 35 Q 30 30 55 45 T 100 50" />
          <path d="M0 70 Q 40 75 65 65 T 100 75" />
          <path d="M20 0 Q 25 40 35 60 T 45 100" />
          <path d="M70 0 Q 75 30 65 55 T 80 100" />
        </g>
        {/* secondary roads */}
        {dark && (
          <g stroke="rgba(255,255,255,0.04)" strokeWidth="0.6" fill="none">
            <path d="M10 20 Q 30 25 50 20 T 90 30" />
            <path d="M5 55 Q 35 50 60 58 T 95 55" />
            <path d="M40 5 Q 45 35 40 55 T 55 95" />
          </g>
        )}
        {/* corridor highlight */}
        {showCorridor && path && (
          <>
            <path d={path} stroke="#22C55E" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.85" />
            <path d={path} stroke="#86EFAC" strokeWidth="0.6" fill="none" strokeDasharray="2 3" className="animate-dash" />
          </>
        )}
        {route && !showCorridor && path && (
          <path d={path} stroke={dark ? "#E63946" : "#E63946"} strokeWidth="1.6" fill="none" strokeDasharray="2 2" className="animate-dash" />
        )}
      </svg>

      {/* markers */}
      <div className="absolute inset-0">
        {(markers || []).map((m) => (
          <Marker key={m.id || Math.random().toString()} marker={m} dark={dark} />
        ))}
      </div>

      {/* compass / hud */}
      <div className={cn(
        "pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border px-2 py-1 text-[10px] uppercase tracking-widest font-bold shadow-sm backdrop-blur",
        dark ? "border-[#242E42] bg-[#131926]/80 text-[#00E5FF]" : "border-gray-250 bg-white/90 text-gray-700"
      )}>
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Live · {tick % 60}s
      </div>
      <div className={cn(
        "pointer-events-none absolute right-3 top-3 rounded-md border px-2 py-1 text-[10px] uppercase tracking-widest font-bold shadow-sm backdrop-blur",
        dark ? "border-[#242E42] bg-[#131926]/80 text-[#8F9BB3]" : "border-gray-250 bg-white/90 text-gray-700"
      )}>
        28.66°N · 77.45°E
      </div>
    </div>
  );
}

function buildPath(route: NonNullable<LiveMapProps["route"]>) {
  const pts = [route.from, ...(route.via ?? []), route.to];
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
}

function Marker({ marker, dark }: { marker: MapMarker; dark?: boolean }) {
  const style = { left: `${marker?.x ?? 50}%`, top: `${marker?.y ?? 50}%` };

  const markerConfigs: Record<string, { color: string; ring: string; glyph: string }> = {
    emergency: { color: "bg-[#E63946] text-white", ring: "bg-[#E63946]/45", glyph: "✚" },
    citizen: { color: "bg-[#E63946] text-white", ring: "bg-[#E63946]/45", glyph: "👤" },
    ambulance: { color: "bg-[#00E5FF] text-[#080C14]", ring: "bg-[#00E5FF]/40", glyph: "🚑" },
    hospital: { color: "bg-[#22C55E] text-white", ring: "bg-[#22C55E]/45", glyph: "H" },
    volunteer: { color: "bg-purple-500 text-white", ring: "bg-purple-500/45", glyph: "★" },
    signal: { color: "bg-[#22C55E] text-white", ring: "bg-[#22C55E]/45", glyph: "●" },
    traffic: { color: "bg-emerald-500 text-white", ring: "bg-emerald-500/45", glyph: "🚥" },
    command: { color: "bg-slate-700 text-white", ring: "bg-slate-700/45", glyph: "🛡️" },
  };

  const defaultConfig = { color: "bg-purple-500 text-white", ring: "bg-purple-500/45", glyph: "📍" };
  const config = (marker && marker.type ? markerConfigs[marker.type] : undefined) ?? defaultConfig;

  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={style}>
      <div className="relative">
        {marker?.active && <span className={cn("absolute inset-0 -m-1 rounded-full ping-ring", config.ring)} />}
        <div className={cn("relative grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold shadow-md border border-white/20", config.color)}>
          {config.glyph}
        </div>
        {marker?.label && (
          <div className={cn(
            "absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold shadow-sm backdrop-blur",
            dark ? "border-[#242E42] bg-[#131926]/90 text-white" : "border-gray-150 bg-white/95 text-gray-700"
          )}>
            {marker.label}
          </div>
        )}
      </div>
    </div>
  );
}
