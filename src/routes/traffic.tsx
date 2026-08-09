import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Brain,
  Building2,
  Camera,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  CloudFog,
  Cpu,
  Eye,
  FlameKindling,
  MapPin,
  MessageSquare,
  Navigation,
  PersonStanding,
  Radio,
  RefreshCw,
  Shield,
  Signal,
  Siren,
  Sparkles,
  TrafficCone,
  Upload,
  Users,
  VideoOff,
  XCircle,
  Zap,
} from "lucide-react";
import { SectionCard, SeverityBadge, StatCard } from "@/components/design-system";
import { TrafficShell, type TrafficTab } from "@/components/roles/traffic-shell";
import { LiveMap, type MapMarker } from "@/components/live-map";
import ProfileHeader from "@/components/profile/profile-header";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { getProfile, getDisplayName } from "@/lib/profile";
import {
  cctvCameras,
  generateAmbulances,
  generateEmergencies,
  generateHospitals,
  initialCongestionZones,
  initialRoadBlockages,
  initialTrafficCorridors,
  initialTrafficSignals,
  type CCTVCamera,
  type RoadBlockage,
  type TrafficCongestionZone,
  type TrafficCorridor,
  type TrafficSignal,
} from "@/lib/mock-data";

export const Route = createFileRoute("/traffic")({
  head: () => ({ meta: [{ title: "Traffic Control Hub · AEGIS" }] }),
  component: TrafficPortal,
});

const ALL_INCIDENTS = generateEmergencies(10);
const ALL_AMBULANCES = generateAmbulances(12);
const ALL_HOSPITALS = generateHospitals(6);

function TrafficPortal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "traffic")) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  const [tab, setTab] = useState<TrafficTab>("map");
  const [corridors, setCorridors] = useState<TrafficCorridor[]>(initialTrafficCorridors);
  const [signals, setSignals] = useState<TrafficSignal[]>(initialTrafficSignals);
  const [zones, setZones] = useState<TrafficCongestionZone[]>(initialCongestionZones);
  const [blockages, setBlockages] = useState<RoadBlockage[]>(initialRoadBlockages);
  const [selectedCameraId, setSelectedCameraId] = useState("CAM-001");
  const [uploadingFootage, setUploadingFootage] = useState(false);
  const [activeCommChannel, setActiveCommChannel] = useState<string | null>(null);

  if (isLoading || !isAuthenticated || user?.role !== "traffic") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080C14]">
        <div className="h-6 w-6 animate-ping bg-emerald-500 rounded-full" />
      </div>
    );
  }

  const selectedCamera = cctvCameras.find((c) => c.id === selectedCameraId) ?? cctvCameras[0];
  const activeCorridorsCount = corridors.filter((c) => c.status === "active").length;

  const handleToggleSignalOverride = (sigId: string) => {
    setSignals((prev) =>
      prev.map((s) => {
        if (s.id === sigId) {
          const newStatus = s.status === "green-override" ? "normal-auto" : "green-override";
          const newMsg = newStatus === "green-override" ? "Manual Green Override Locked" : "Returned to Auto-Cycle";
          toast.success(`${s.intersection} (${s.id}): ${newMsg}`);
          return { ...s, status: newStatus, overrideBy: newStatus === "green-override" ? "Traffic Officer Override" : undefined };
        }
        return s;
      })
    );
  };

  const handleApproveCorridor = (corridorId: string) => {
    setCorridors((prev) =>
      prev.map((c) => (c.id === corridorId ? { ...c, status: "active" as const } : c))
    );
    toast.success(`Emergency Corridor ${corridorId} APPROVED & LOCKED. 6 traffic signals switched to priority green.`);
  };

  const handleClearCorridor = (corridorId: string) => {
    setCorridors((prev) =>
      prev.map((c) => (c.id === corridorId ? { ...c, status: "cleared" as const } : c))
    );
    toast.info(`Emergency Corridor ${corridorId} cleared. Signals reverted to automated traffic control.`);
  };

  const handleUploadCCTV = () => {
    setUploadingFootage(true);
    toast.info("Uploading CCTV video feed to Vision Agent for neural analysis...");
    setTimeout(() => {
      setUploadingFootage(false);
      toast.success("Vision Analysis Complete: Vehicle Collision + 2 Pedestrians detected with 96% confidence on CAM-001!");
    }, 2000);
  };

  const mapMarkers: MapMarker[] = [
    ...ALL_INCIDENTS.slice(0, 3).map((inc) => ({
      id: inc.id,
      type: "emergency" as const,
      x: 35 + (inc.id === "EMG-1000" ? 0 : inc.id === "EMG-1001" ? 18 : 32),
      y: 45 + (inc.id === "EMG-1000" ? 0 : inc.id === "EMG-1001" ? -15 : 20),
      label: `${inc.id} (${inc.type})`,
      active: true,
    })),
    ...ALL_AMBULANCES.slice(0, 4).map((amb) => ({
      id: amb.id,
      type: "ambulance" as const,
      x: 25 + (amb.id === "AMB-100" ? 0 : amb.id === "AMB-101" ? 28 : 45),
      y: 58 + (amb.id === "AMB-100" ? 0 : amb.id === "AMB-101" ? -22 : 12),
      label: `${amb.id} (${amb.callsign})`,
      active: amb.status === "on-mission",
    })),
    ...ALL_HOSPITALS.slice(0, 3).map((hosp) => ({
      id: hosp.id,
      type: "hospital" as const,
      x: 72 + (hosp.id === "HSP-10" ? 0 : hosp.id === "HSP-11" ? -15 : 8),
      y: 28 + (hosp.id === "HSP-10" ? 0 : hosp.id === "HSP-11" ? 35 : -10),
      label: hosp.name.split(" ")[0],
    })),
  ];

  return (
    <TrafficShell activeTab={tab} onTabChange={setTab} activeCorridorsCount={activeCorridorsCount}>
      {/* ── KPI METRICS BANNER ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-5">
        <div className="rounded-2xl bg-[#131926]/80 border border-emerald-500/30 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Active Corridors</p>
            <p className="text-xl font-black text-emerald-400">{activeCorridorsCount}</p>
            <p className="text-[8px] text-emerald-400 font-bold">Priority Signals Locked</p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#131926]/80 border border-amber-500/30 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Traffic Incidents</p>
            <p className="text-xl font-black text-amber-400">{ALL_INCIDENTS.filter((i) => i.status === "active").length}</p>
            <p className="text-[8px] text-amber-400 font-bold">Active Road Crashes</p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#131926]/80 border border-cyan-500/30 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Signal className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Signals Overridden</p>
            <p className="text-xl font-black text-cyan-400">{signals.filter((s) => s.status === "green-override").length}</p>
            <p className="text-[8px] text-cyan-400 font-bold">Of {signals.length} City Signals</p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#131926]/80 border border-red-500/30 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <Car className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Road Blockages</p>
            <p className="text-xl font-black text-red-400">{blockages.length}</p>
            <p className="text-[8px] text-red-400 font-bold">Active Bottlenecks</p>
          </div>
        </div>

        <div className="rounded-2xl bg-[#131926]/80 border border-purple-500/30 p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Camera className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">CCTV Feeds</p>
            <p className="text-xl font-black text-purple-400">{cctvCameras.filter((c) => c.status === "live").length}</p>
            <p className="text-[8px] text-purple-400 font-bold">Vision Agent Synced</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB 1: LIVE TRAFFIC MAP & CORRIDORS
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "map" && (
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            <div className="rounded-2xl bg-[#131926]/80 border border-[#242E42] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#242E42]">
                <div className="flex items-center gap-2">
                  <TrafficCone className="h-4 w-4 text-emerald-400" />
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-widest text-white">Live City Traffic Grid</h2>
                    <p className="text-[9px] text-gray-400">Emergency Corridors, Signals, and Ambulances Overlay</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[9px] font-bold text-emerald-400">
                  Green Corridor Sync Active
                </span>
              </div>
              <div className="p-3">
                <LiveMap
                  dark
                  className="h-[320px]"
                  markers={mapMarkers}
                  route={{ from: [25, 58], via: [[35, 45]], to: [72, 28] }}
                  showCorridor={true}
                />
              </div>
              <div className="p-4 border-t border-[#242E42] grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-xl bg-[#161D2D]/60 p-2.5 border border-[#242E42]">
                  <p className="text-[9px] text-gray-400 uppercase font-bold">Corridor Speed Avg</p>
                  <p className="text-base font-black text-emerald-400 mt-0.5">58 km/h</p>
                </div>
                <div className="rounded-xl bg-[#161D2D]/60 p-2.5 border border-[#242E42]">
                  <p className="text-[9px] text-gray-400 uppercase font-bold">Time Saved / Incident</p>
                  <p className="text-base font-black text-cyan-400 mt-0.5">↓ 6.2 min</p>
                </div>
                <div className="rounded-xl bg-[#161D2D]/60 p-2.5 border border-[#242E42]">
                  <p className="text-[9px] text-gray-400 uppercase font-bold">Signal Override Latency</p>
                  <p className="text-base font-black text-purple-400 mt-0.5">80 ms</p>
                </div>
              </div>
            </div>

            {/* Signal Control Grid */}
            <div className="rounded-2xl bg-[#131926]/80 border border-[#242E42] p-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-white mb-3 flex items-center gap-2">
                <Signal className="h-4 w-4 text-cyan-400" />
                Traffic Signal Controllers — Interactive Manual Override
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {signals.map((sig) => (
                  <div
                    key={sig.id}
                    className={`rounded-xl p-3.5 border transition-all ${
                      sig.status === "green-override"
                        ? "border-emerald-500/40 bg-emerald-500/5 text-white"
                        : sig.status === "congested"
                        ? "border-amber-500/40 bg-amber-500/5 text-white"
                        : "border-[#242E42] bg-[#161D2D]/40 text-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-gray-400">{sig.id} · {sig.zone}</span>
                        <h4 className="text-xs font-bold text-white mt-0.5">{sig.intersection}</h4>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider ${
                          sig.status === "green-override"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : sig.status === "congested"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {sig.status.replace("-", " ")}
                      </span>
                    </div>
                    {sig.overrideBy && (
                      <p className="text-[9px] text-emerald-400 font-semibold mt-2">
                        Locked by: {sig.overrideBy} ({sig.timeRemainingSec}s remaining)
                      </p>
                    )}
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleSignalOverride(sig.id)}
                        className={`rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-all border ${
                          sig.status === "green-override"
                            ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                      >
                        {sig.status === "green-override" ? "Release Override" : "Trigger Priority Green"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Congestion Zones & Active Corridors */}
          <div className="space-y-5">
            <div className="rounded-2xl bg-[#131926]/80 border border-[#242E42] p-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-white mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                Active Emergency Corridors
              </h3>
              <div className="space-y-3">
                {corridors.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-xl p-4 border transition-all ${
                      c.status === "active"
                        ? "border-emerald-500/40 bg-emerald-500/5 text-white"
                        : "border-[#242E42] bg-[#161D2D]/40 text-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-emerald-400">{c.id} · {c.ambulanceId}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase ${
                          c.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white mt-1.5">{c.routeName}</p>
                    <div className="mt-2 text-[9px] text-gray-400 space-y-1">
                      <p>Signals Locked: <span className="text-emerald-400 font-bold">{c.signalsOverridden} junctions</span></p>
                      <p>Est. Time Saved: <span className="text-cyan-400 font-bold">~{c.etaSavedMin} min</span></p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {c.status !== "active" ? (
                        <button
                          type="button"
                          onClick={() => handleApproveCorridor(c.id)}
                          className="flex-1 rounded-lg bg-emerald-500 py-1.5 text-[10px] font-extrabold text-black hover:bg-emerald-400 transition-colors"
                        >
                          Lock Priority Corridor
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleClearCorridor(c.id)}
                          className="flex-1 rounded-lg border border-red-500/40 bg-red-500/10 py-1.5 text-[10px] font-extrabold text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          Clear Corridor Lock
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* City Congestion Heatmap List */}
            <div className="rounded-2xl bg-[#131926]/80 border border-[#242E42] p-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-white mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-400" />
                City Congestion Heatmap
              </h3>
              <div className="space-y-2.5">
                {zones.map((z) => (
                  <div key={z.id} className="rounded-xl bg-[#161D2D]/50 border border-[#242E42] p-3">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-white">{z.zoneName}</span>
                      <span
                        className={`text-[10px] uppercase font-bold ${
                          z.congestionLevel === "critical"
                            ? "text-red-400"
                            : z.congestionLevel === "heavy"
                            ? "text-amber-400"
                            : z.congestionLevel === "moderate"
                            ? "text-yellow-300"
                            : "text-emerald-400"
                        }`}
                      >
                        {z.congestionLevel} ({z.avgSpeedKmH} km/h)
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className={`h-full ${
                          z.congestionLevel === "critical"
                            ? "bg-red-500"
                            : z.congestionLevel === "heavy"
                            ? "bg-amber-500"
                            : z.congestionLevel === "moderate"
                            ? "bg-yellow-400"
                            : "bg-emerald-500"
                        }`}
                        style={{
                          width:
                            z.congestionLevel === "critical"
                              ? "90%"
                              : z.congestionLevel === "heavy"
                              ? "70%"
                              : z.congestionLevel === "moderate"
                              ? "45%"
                              : "20%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 2: CCTV FEEDS & VISION AI ANALYSIS
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "cctv" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-[#131926]/80 border border-[#242E42] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-400" />
                  CCTV Vision Agent Traffic Monitoring
                </h2>
                <p className="text-[9px] text-gray-400">Live Camera Matrix with Automatic Crash & Smoke Detection</p>
              </div>
              <button
                type="button"
                onClick={handleUploadCCTV}
                disabled={uploadingFootage}
                className="rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {uploadingFootage ? (
                  <span className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Upload CCTV Video for Neural Analysis</span>
                  </>
                )}
              </button>
            </div>

            {/* Camera Selectors */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {cctvCameras.map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setSelectedCameraId(cam.id)}
                  className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold border transition-all flex items-center gap-2 ${
                    cam.id === selectedCameraId
                      ? "border-purple-500 bg-purple-500/10 text-purple-300"
                      : "border-[#242E42] bg-[#161D2D]/60 text-gray-400 hover:text-white"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      cam.status === "live" ? "bg-red-500 animate-pulse" : "bg-gray-600"
                    }`}
                  />
                  <span>{cam.id}</span>
                  <span className="text-[9px] text-gray-500">({cam.zone})</span>
                </button>
              ))}
            </div>

            {/* Selected Camera Feed */}
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#242E42] bg-[#0A0D18] p-4 relative overflow-hidden min-h-[260px] flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-bold text-gray-300 mb-2">
                  <span>{selectedCamera.id} · {selectedCamera.location}</span>
                  <span className="rounded bg-red-500/20 text-red-400 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest border border-red-500/30">
                    {selectedCamera.status === "live" ? "REC ● LIVE STREAM" : "OFFLINE"}
                  </span>
                </div>

                {/* Feed Canvas Simulator */}
                {selectedCamera.status === "live" ? (
                  <div className="relative h-[200px] w-full rounded-xl bg-gradient-to-br from-[#0B0E17] via-[#0E1322] to-[#080C14] border border-[#242E42] overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:16px_16px]" />
                    
                    {/* Simulated Detection Box Overlay */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-between pointer-events-none">
                      <div className="border-2 border-red-500/80 rounded-lg p-2 max-w-[200px] bg-red-500/10">
                        <span className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                          ACCIDENT DETECTED (94%)
                        </span>
                        <p className="text-[9px] font-bold text-white mt-1">2 Vehicles Collided</p>
                      </div>

                      <div className="self-end border border-cyan-400/70 rounded p-1.5 bg-cyan-400/10 text-[8px] font-mono text-cyan-300">
                        VEHICLE STREAM #AMB-1083
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 font-mono font-bold">
                      {selectedCamera.location} Stream Matrix
                    </p>
                  </div>
                ) : (
                  <div className="h-[200px] rounded-xl bg-[#080C14] border border-[#242E42] flex flex-col items-center justify-center text-gray-500 space-y-2">
                    <VideoOff className="h-8 w-8" />
                    <p className="text-xs font-bold uppercase">Camera Feed Offline</p>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-[9px] text-gray-400 font-mono">
                  <span>FOV: 110° · Resolution: 4K UHD</span>
                  <span>AI Model: AegisVision v3.2</span>
                </div>
              </div>

              {/* Detections List */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#242E42] bg-[#161D2D]/60 p-4 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
                    <Eye className="h-4 w-4" /> Detections Log — Vision Agent
                  </h3>
                  <div className="space-y-2">
                    {selectedCamera.detections.length > 0 ? (
                      selectedCamera.detections.map((det, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl bg-[#0A0D18] border border-[#242E42] p-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                            <div>
                              <p className="font-bold text-white capitalize">{det.type} Event</p>
                              <p className="text-[9px] text-gray-400 font-mono">Timestamp: {det.timestamp}</p>
                            </div>
                          </div>
                          <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 text-[9px] font-black text-purple-300 font-mono">
                            {det.confidence}% Match
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 italic p-3">No active anomalies detected on this camera.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" /> AI Traffic Plan Recommendation
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Vision Agent recommends diverting southbound traffic from Sector 62 Main Junction to Service Road B to maintain clear passage for en-route Ambulance AMB-1083.
                  </p>
                  <button
                    type="button"
                    onClick={() => toast.success("AI Traffic Plan Approved: Southbound detour enacted. Route cleared for emergency units.")}
                    className="mt-2 w-full rounded-xl bg-emerald-500 py-2 text-xs font-bold text-black hover:bg-emerald-400 transition-colors"
                  >
                    Approve & Enact AI Traffic Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 3: EMERGENCY CORRIDORS MANAGEMENT
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "corridors" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-[#131926]/80 border border-[#242E42] p-5">
            <div className="flex items-center justify-between border-b border-[#242E42] pb-3 mb-4">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  Emergency Green Corridor Management Hub
                </h2>
                <p className="text-[9px] text-gray-400">Lock priority transit corridors for ambulances en-route to trauma centers</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newCorridor: TrafficCorridor = {
                    id: `COR-${103 + corridors.length}`,
                    ambulanceId: "AMB-105",
                    incidentId: "EMG-1270",
                    routeName: "Vasundhara Sector 4 → GT Road → City Care",
                    signalsOverridden: 5,
                    status: "active",
                    startTime: "Just now",
                    etaSavedMin: 5.0,
                    origin: "Vasundhara Sector 4",
                    destination: "City Care Hospital",
                  };
                  setCorridors([newCorridor, ...corridors]);
                  toast.success(`Created & Activated New Green Corridor ${newCorridor.id}!`);
                }}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-extrabold text-black transition-all"
              >
                + Create Emergency Corridor
              </button>
            </div>

            <div className="space-y-4">
              {corridors.map((c) => (
                <div key={c.id} className="rounded-2xl border border-[#242E42] bg-[#161D2D]/60 p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-400">{c.id}</span>
                        <span className="rounded bg-cyan-500/20 text-cyan-300 px-2 py-0.5 text-[9px] font-bold font-mono">
                          Unit: {c.ambulanceId}
                        </span>
                        <span className="rounded bg-[#242E42] text-gray-300 px-2 py-0.5 text-[9px]">
                          Case: {c.incidentId}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-2">{c.routeName}</h3>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider ${
                        c.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-[#242E42]">
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase font-bold">Origin</p>
                      <p className="font-semibold text-white mt-0.5">{c.origin}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase font-bold">Destination</p>
                      <p className="font-semibold text-white mt-0.5">{c.destination}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase font-bold">Signals Locked</p>
                      <p className="font-bold text-emerald-400 mt-0.5">{c.signalsOverridden} Green Overrides</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase font-bold">Time Saved</p>
                      <p className="font-bold text-cyan-400 mt-0.5">↓ {c.etaSavedMin} min</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {c.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => handleClearCorridor(c.id)}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Release Corridor Lock
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApproveCorridor(c.id)}
                        className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-black hover:bg-emerald-400 transition-colors"
                      >
                        Activate Priority Corridor
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 4: TRAFFIC INCIDENTS & ROAD BLOCKAGES
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "incidents" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-[#131926]/80 border border-[#242E42] p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Road Blockages & Incident Detour Management
            </h2>
            <div className="space-y-4">
              {blockages.map((blk) => (
                <div key={blk.id} className="rounded-2xl border border-amber-500/30 bg-[#161D2D]/60 p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-amber-400">{blk.id} · {blk.zone}</span>
                      <h3 className="text-sm font-bold text-white mt-1">{blk.location}</h3>
                      <p className="text-xs text-gray-300 mt-1">{blk.cause}</p>
                    </div>
                    <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 text-[9px] font-bold uppercase">
                      Clearance ETA: {blk.clearingETA}
                    </span>
                  </div>

                  <div className="rounded-xl bg-[#0A0D18] border border-[#242E42] p-3 text-xs space-y-1">
                    <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">AI Rerouting Plan</p>
                    <p className="text-gray-300">{blk.reroutePlan}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toast.success(`Traffic reroute deployed for ${blk.location}!`)}
                      className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-colors"
                    >
                      Enact Detour Reroute
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBlockages((prev) => prev.filter((b) => b.id !== blk.id));
                        toast.success(`${blk.id} marked cleared! Road opened to normal traffic.`);
                      }}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      Mark Blockage Cleared
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 5: INTER-AGENCY DISPATCH COORDINATION
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "coordination" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-[#131926]/80 border border-[#242E42] p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-400" />
              Inter-Agency Priority Communications Channel
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { agency: "Ambulance Driver (AMB-1083)", role: "Paramedic Fleet", status: "On Mission", channel: "AMB-1083-DIRECT" },
                { agency: "City Care ER Trauma Desk", role: "Hospital Operations", status: "Receiving", channel: "CITYCARE-ER" },
                { agency: "Command Center Dispatch", role: "Grid Officer", status: "Active Grid", channel: "COMMAND-GRID-1" },
              ].map((item) => (
                <div key={item.channel} className="rounded-2xl border border-[#242E42] bg-[#161D2D]/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-cyan-400 font-bold">{item.channel}</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{item.agency}</h3>
                    <p className="text-[10px] text-gray-400">{item.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCommChannel(item.agency);
                      toast.success(`Connected to secure channel: ${item.agency}`);
                    }}
                    className="w-full rounded-xl bg-cyan-500/10 border border-cyan-500/30 py-2 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                  >
                    Open Audio / Dispatch Link
                  </button>
                </div>
              ))}
            </div>

            {activeCommChannel && (
              <div className="mt-5 rounded-2xl border border-cyan-500/40 bg-cyan-500/5 p-4 space-y-2">
                <p className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                  <Radio className="h-4 w-4 animate-pulse" />
                  Active Audio Channel: {activeCommChannel}
                </p>
                <p className="text-[10px] text-gray-400">
                  Voice & Data link active. Transmitting green corridor clearance status.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 6: OFFICER PROFILE & DUTY LOG
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "profile" && (() => {
        const profile = getProfile("traffic");
        const name = getDisplayName("traffic", user);

        return (
          <div className="max-w-xl mx-auto space-y-4">
            <ProfileHeader name={name} subtitle="Traffic Control Officer · Badge TRF-9021 · Noida Sector 62" role="traffic" />
            <div className="space-y-3">
              {[
                { label: "Assigned Sector", value: "Sector 62 & NH-24 Corridor" },
                { label: "Clearance Level", value: "Level 2 Traffic & Signal Override Clearance" },
                { label: "Duty Shift", value: "08:00 – 20:00 (Active Duty)" },
                { label: "Corridors Cleared Today", value: "14 Emergency Corridors" },
              ].map((row) => (
                <div key={row.label} className="rounded-2xl bg-[#131926]/80 border border-[#242E42] p-4">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{row.label}</p>
                  <p className="text-xs font-bold text-white mt-1">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </TrafficShell>
  );
}
