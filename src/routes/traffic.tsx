import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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

// ═══════════════════════════════════════════════════════════════
// VISION AGENT DEMO CONFIGURATION
// Configurable timestamp in video.mp4 to trigger accident detection
// ═══════════════════════════════════════════════════════════════
const ACCIDENT_DETECTION_TIME = 3;

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
  const [activeCommChannel, setActiveCommChannel] = useState<string | null>(null);

  // Vision Agent Demo State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectionTriggeredRef = useRef(false);
  const [accidentDetected, setAccidentDetected] = useState(false);
  const [detectionState, setDetectionState] = useState<"monitoring" | "detected" | "confirmed">(
    "monitoring",
  );

  // ═══════════════════════════════════════════════════════════════
  // VISION AGENT DEMO DETECTION FUNCTION
  // Called automatically when video reaches ACCIDENT_DETECTION_TIME (~3s)
  // ═══════════════════════════════════════════════════════════════
  const handleVisionDetection = () => {
    if (detectionTriggeredRef.current) return;
    detectionTriggeredRef.current = true;
    setAccidentDetected(true);
    setDetectionState("detected");

    setTimeout(() => {
      setDetectionState("confirmed");
    }, 1500);

    toast.error(
      "🚨 VISION AGENT: Accident Detected on CAM-001 (NH-24 Bridge Overpass) — 94% Confidence!",
      { duration: 4000 },
    );
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const currentTime = videoRef.current.currentTime;

    // Reset detection state when video loops back to start (< 1 second)
    if (currentTime < 1 && detectionTriggeredRef.current) {
      detectionTriggeredRef.current = false;
      setAccidentDetected(false);
      setDetectionState("monitoring");
    }

    // Trigger detection once per loop cycle at ACCIDENT_DETECTION_TIME threshold (~3s)
    if (currentTime >= ACCIDENT_DETECTION_TIME && !detectionTriggeredRef.current) {
      handleVisionDetection();
    }
  };

  if (isLoading || !isAuthenticated || user?.role !== "traffic") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB]">
        <div className="h-6 w-6 animate-ping bg-blue-600 rounded-full" />
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
          const newMsg =
            newStatus === "green-override"
              ? "Manual Green Override Locked"
              : "Returned to Auto-Cycle";
          toast.success(`${s.intersection} (${s.id}): ${newMsg}`);
          return {
            ...s,
            status: newStatus,
            overrideBy: newStatus === "green-override" ? "Traffic Officer Override" : undefined,
          };
        }
        return s;
      }),
    );
  };

  const handleApproveCorridor = (corridorId: string) => {
    setCorridors((prev) =>
      prev.map((c) => (c.id === corridorId ? { ...c, status: "active" as const } : c)),
    );
    toast.success(
      `Emergency Corridor ${corridorId} APPROVED & LOCKED. 6 traffic signals switched to priority green.`,
    );
  };

  const handleClearCorridor = (corridorId: string) => {
    setCorridors((prev) =>
      prev.map((c) => (c.id === corridorId ? { ...c, status: "cleared" as const } : c)),
    );
    toast.info(
      `Emergency Corridor ${corridorId} cleared. Signals reverted to automated traffic control.`,
    );
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
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-6">
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 flex items-center gap-3.5 hover:shadow-md transition-all">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
            <Zap className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
              Active Corridors
            </p>
            <p className="text-xl font-black text-gray-900">{activeCorridorsCount}</p>
            <p className="text-[10px] text-emerald-700 font-extrabold">Priority Signals Locked</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 flex items-center gap-3.5 hover:shadow-md transition-all">
          <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 text-amber-600">
            <AlertTriangle className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
              Traffic Incidents
            </p>
            <p className="text-xl font-black text-gray-900">
              {ALL_INCIDENTS.filter((i) => i.status === "active").length +
                (accidentDetected ? 1 : 0)}
            </p>
            <p className="text-[10px] text-amber-700 font-extrabold">
              {accidentDetected ? "4 Active Crashes" : "Active Road Crashes"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 flex items-center gap-3.5 hover:shadow-md transition-all">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
            <Signal className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
              Signals Overridden
            </p>
            <p className="text-xl font-black text-gray-900">
              {signals.filter((s) => s.status === "green-override").length}
            </p>
            <p className="text-[10px] text-blue-700 font-extrabold">Of {signals.length} Signals</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 flex items-center gap-3.5 hover:shadow-md transition-all">
          <div className="h-10 w-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-[#E63946]">
            <Car className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
              Road Blockages
            </p>
            <p className="text-xl font-black text-gray-900">
              {blockages.length + (accidentDetected ? 1 : 0)}
            </p>
            <p className="text-[10px] text-[#E63946] font-extrabold">
              {accidentDetected ? "3 Bottlenecks Active" : "Active Bottlenecks"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 flex items-center gap-3.5 hover:shadow-md transition-all">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 text-purple-600">
            <Camera className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
              CCTV Feeds
            </p>
            <p className="text-xl font-black text-gray-900">
              {cctvCameras.filter((c) => c.status === "live").length}
            </p>
            <p className="text-[10px] text-purple-700 font-extrabold">Vision Agent Synced</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB 1: LIVE TRAFFIC MAP & CORRIDORS
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "map" && (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            {/* Live Map Card Container */}
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <TrafficCone className="h-4 w-4 text-blue-600" />
                  <div>
                    <h2 className="text-sm font-black text-gray-900 tracking-tight">
                      Live City Traffic Grid
                    </h2>
                    <p className="text-xs text-gray-500">
                      Emergency Corridors, Signals, and Ambulances Overlay
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-[10px] font-extrabold uppercase">
                  Green Corridor Sync Active
                </span>
              </div>

              <div className="p-4">
                <LiveMap
                  dark
                  className="h-[340px] rounded-2xl overflow-hidden border border-gray-200"
                  markers={mapMarkers}
                  route={{ from: [25, 58], via: [[35, 45]], to: [72, 28] }}
                  showCorridor={true}
                />
              </div>

              <div className="p-4 bg-gray-50/50 border-t border-gray-100 grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-2xl bg-white p-3 border border-gray-200 shadow-xs">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    Corridor Speed Avg
                  </p>
                  <p className="text-base font-black text-emerald-700 mt-0.5">58 km/h</p>
                </div>
                <div className="rounded-2xl bg-white p-3 border border-gray-200 shadow-xs">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    Time Saved / Incident
                  </p>
                  <p className="text-base font-black text-blue-700 mt-0.5">↓ 6.2 min</p>
                </div>
                <div className="rounded-2xl bg-white p-3 border border-gray-200 shadow-xs">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    Signal Latency
                  </p>
                  <p className="text-base font-black text-purple-700 mt-0.5">80 ms</p>
                </div>
              </div>
            </div>

            {/* Signal Control Grid */}
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Signal className="h-4 w-4 text-blue-600" />
                  Traffic Signal Controllers — Manual Override
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Direct signal green-light locking for emergency dispatch
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {signals.map((sig) => (
                  <div
                    key={sig.id}
                    className={`rounded-2xl p-4 border transition-all ${
                      sig.status === "green-override"
                        ? "border-emerald-300 bg-emerald-50/70"
                        : sig.status === "congested"
                          ? "border-amber-300 bg-amber-50/70"
                          : "border-gray-200 bg-gray-50/80"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-gray-400">
                          {sig.id} · {sig.zone}
                        </span>
                        <h4 className="text-xs font-bold text-gray-900 mt-0.5">
                          {sig.intersection}
                        </h4>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase border ${
                          sig.status === "green-override"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : sig.status === "congested"
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {sig.status.replace("-", " ")}
                      </span>
                    </div>

                    {sig.overrideBy && (
                      <p className="text-[10px] text-emerald-700 font-bold mt-2">
                        Locked by: {sig.overrideBy} ({sig.timeRemainingSec}s remaining)
                      </p>
                    )}

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleSignalOverride(sig.id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                          sig.status === "green-override"
                            ? "bg-red-50 border border-red-200 text-red-700 hover:bg-red-100"
                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                        }`}
                      >
                        {sig.status === "green-override"
                          ? "Release Override"
                          : "Trigger Priority Green"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Congestion Zones & Active Corridors */}
          <div className="space-y-6">
            {/* Active Emergency Corridors */}
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  Active Emergency Corridors
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Synchronized ambulance green corridors
                </p>
              </div>

              <div className="space-y-3">
                {corridors.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-2xl p-4 border transition-all ${
                      c.status === "active"
                        ? "border-emerald-200 bg-emerald-50/70"
                        : "border-gray-200 bg-gray-50/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-blue-700">
                        {c.id} · {c.ambulanceId}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase border ${
                          c.status === "active"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-gray-900 mt-1.5">{c.routeName}</p>

                    <div className="mt-2 text-[10px] text-gray-600 space-y-0.5">
                      <p>
                        Signals Locked:{" "}
                        <span className="text-emerald-700 font-extrabold">
                          {c.signalsOverridden} junctions
                        </span>
                      </p>
                      <p>
                        Est. Time Saved:{" "}
                        <span className="text-blue-700 font-extrabold">~{c.etaSavedMin} min</span>
                      </p>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {c.status !== "active" ? (
                        <button
                          type="button"
                          onClick={() => handleApproveCorridor(c.id)}
                          className="flex-1 rounded-xl bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
                        >
                          Lock Priority Corridor
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleClearCorridor(c.id)}
                          className="flex-1 rounded-xl border border-red-200 bg-red-50 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
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
            <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-600" />
                  City Congestion Heatmap
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Live traffic flow and bottleneck analysis
                </p>
              </div>

              <div className="space-y-3">
                {zones.map((z) => (
                  <div
                    key={z.id}
                    className="rounded-2xl bg-gray-50/90 border border-gray-200 p-3.5 space-y-2"
                  >
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-gray-900">{z.zoneName}</span>
                      <span
                        className={`text-[10px] uppercase font-extrabold ${
                          z.congestionLevel === "critical"
                            ? "text-red-700"
                            : z.congestionLevel === "heavy"
                              ? "text-amber-700"
                              : z.congestionLevel === "moderate"
                                ? "text-yellow-700"
                                : "text-emerald-700"
                        }`}
                      >
                        {z.congestionLevel} ({z.avgSpeedKmH} km/h)
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full transition-all duration-300 ${
                          z.congestionLevel === "critical"
                            ? "bg-red-500"
                            : z.congestionLevel === "heavy"
                              ? "bg-amber-500"
                              : z.congestionLevel === "moderate"
                                ? "bg-yellow-500"
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
        <div className="space-y-6">
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-600" />
                  CCTV Vision Agent Traffic Monitoring
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Live Camera Matrix with Automatic Crash &amp; Smoke Detection
                </p>
              </div>

              {/* Status Pills — No Manual Upload Button */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 text-xs font-extrabold uppercase flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />● AI VISION
                  MONITORING ACTIVE
                </span>
                <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-3.5 py-1.5 text-xs font-bold">
                  5 CCTV FEEDS CONNECTED · Last Analysis: LIVE
                </span>
              </div>
            </div>

            {/* Camera Selectors */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {cctvCameras.map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setSelectedCameraId(cam.id)}
                  className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                    cam.id === selectedCameraId
                      ? "border-purple-300 bg-purple-50 text-purple-900 shadow-xs"
                      : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      cam.status === "live" ? "bg-red-500 animate-pulse" : "bg-gray-400"
                    }`}
                  />
                  <span>{cam.id}</span>
                  <span className="text-[10px] text-gray-400 font-mono">({cam.zone})</span>
                </button>
              ))}
            </div>

            {/* Selected Camera Feed */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-950 p-3 relative overflow-hidden min-h-[300px] flex flex-col justify-between shadow-inner">
                  {/* CCTV Feed Canvas Container */}
                  {selectedCamera.id === "CAM-001" ? (
                    <div className="relative h-[250px] sm:h-[280px] w-full rounded-xl bg-black border border-gray-800 overflow-hidden">
                      <video
                        ref={videoRef}
                        src="/videos/video.mp4"
                        autoPlay
                        muted
                        loop
                        playsInline
                        controls
                        preload="auto"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                          background: "black",
                        }}
                        className="absolute inset-0 w-full h-full object-cover rounded-xl z-0"
                        onLoadedMetadata={() =>
                          console.log("VIDEO METADATA LOADED", {
                            duration: videoRef.current?.duration,
                            width: videoRef.current?.videoWidth,
                            height: videoRef.current?.videoHeight,
                          })
                        }
                        onCanPlay={() => console.log("VIDEO CAN PLAY")}
                        onPlay={() => console.log("VIDEO PLAYING")}
                        onError={(e) => {
                          console.error("VIDEO ERROR", e);
                          console.error("VIDEO SOURCE:", e.currentTarget.currentSrc);
                        }}
                        onTimeUpdate={handleTimeUpdate}
                      />

                      {/* Camera Overlay Top-Left */}
                      <div className="absolute top-3 left-3 z-10 font-mono text-[10px] font-bold text-white/90 drop-shadow-md bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/10 pointer-events-none">
                        <p className="font-extrabold text-white">CAM-001</p>
                        <p className="text-[9px] text-gray-300">NH-24 Bridge Overpass</p>
                      </div>

                      {/* Camera Overlay Top-Right */}
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 font-mono text-[10px] font-bold text-white drop-shadow-md bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-md border border-white/10 pointer-events-none">
                        <span className="flex items-center gap-1 text-red-500 font-extrabold">
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />● LIVE
                        </span>
                        <span className="text-gray-300">REC</span>
                      </div>

                      {/* Camera Overlay Bottom-Left */}
                      <div className="absolute bottom-3 left-3 z-10 font-mono text-[9px] font-bold text-emerald-400 drop-shadow-md bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded border border-emerald-500/30 pointer-events-none">
                        VISION AGENT ACTIVE
                      </div>

                      {/* Camera Overlay Bottom-Right */}
                      <div className="absolute bottom-3 right-3 z-10 font-mono text-[9px] font-bold text-gray-300 drop-shadow-md bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded border border-white/10 pointer-events-none">
                        CAM-001
                      </div>

                      {/* Subtle Red Accident Detection Overlay */}
                      {accidentDetected && (
                        <div className="absolute top-12 left-3 z-20 border-2 border-red-500 rounded-xl p-3 bg-red-950/85 backdrop-blur-md text-white space-y-1 shadow-lg animate-fade-in max-w-[240px] pointer-events-none">
                          <div className="flex items-center gap-1.5 text-xs font-black text-red-400 uppercase tracking-wider">
                            <AlertTriangle className="h-4 w-4 animate-bounce text-red-400 shrink-0" />
                            <span>ACCIDENT DETECTED</span>
                          </div>
                          <p className="text-[11px] font-bold text-white">94% CONFIDENCE</p>
                          <p className="text-[10px] text-red-200 font-semibold">
                            2 VEHICLES INVOLVED
                          </p>
                        </div>
                      )}
                    </div>
                  ) : selectedCamera.status === "live" ? (
                    <div className="relative h-[250px] sm:h-[280px] w-full rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-black border border-slate-800 overflow-hidden flex items-center justify-center">
                      <div className="absolute top-3 left-3 z-10 font-mono text-[10px] font-bold text-white/90 bg-black/50 px-2.5 py-1 rounded">
                        {selectedCamera.id} · {selectedCamera.location}
                      </div>
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 text-[10px] font-mono text-red-400 font-bold bg-black/50 px-2 py-1 rounded">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        REC ● LIVE STREAM
                      </div>
                      <p className="text-xs text-gray-400 font-mono font-bold">
                        {selectedCamera.location} Live Feed Canvas
                      </p>
                    </div>
                  ) : (
                    <div className="h-[250px] sm:h-[280px] rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-gray-500 space-y-2">
                      <VideoOff className="h-8 w-8" />
                      <p className="text-xs font-bold uppercase">Camera Feed Offline</p>
                    </div>
                  )}

                  {/* Feed Status Indicator Bar */}
                  <div className="mt-2 flex items-center justify-between text-xs px-1">
                    {!accidentDetected ? (
                      <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-blue-800 font-bold flex items-center gap-2 text-xs">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
                        <span>AI Vision Monitoring Active — Waiting for events...</span>
                      </div>
                    ) : detectionState === "detected" ? (
                      <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-red-700 font-black flex items-center gap-2 text-xs animate-pulse">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span>ACCIDENT DETECTED · 94% Confidence</span>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-red-100 border border-red-300 px-3 py-1.5 text-red-900 font-black flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-4 w-4 text-red-600" />
                        <span>INCIDENT CONFIRMED — Vision Agent Active</span>
                      </div>
                    )}
                    <span className="text-[10px] font-mono text-gray-400">
                      FOV: 110° · AegisVision v3.2
                    </span>
                  </div>
                </div>
              </div>

              {/* Detections List & AI Plan Recommendation */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-purple-700 flex items-center gap-1.5">
                    <Eye className="h-4 w-4" /> DETECTIONS LOG — VISION AGENT
                  </h3>
                  <div className="space-y-2.5">
                    {selectedCamera.id === "CAM-001" && accidentDetected ? (
                      <>
                        <div className="flex items-center justify-between rounded-xl bg-white border border-red-200 p-3 text-xs shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                            <div>
                              <p className="font-extrabold text-red-700 flex items-center gap-1">
                                🚨 Accident Event
                              </p>
                              <p className="text-[10px] text-gray-500 font-mono">
                                Camera: CAM-001 · Location: NH-24 Bridge Overpass
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="rounded-full bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 text-[9px] font-black font-mono">
                              94% Confidence
                            </span>
                            <p className="text-[9px] font-bold text-emerald-700 mt-0.5">
                              Status: Confirmed
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-white border border-gray-200 p-3 text-xs shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <div>
                              <p className="font-bold text-gray-900">Vehicle Event</p>
                              <p className="text-[10px] text-gray-500 font-mono">
                                Camera: CAM-001 · Multi-vehicle track
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 text-[9px] font-black font-mono">
                            99% Confidence
                          </span>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-white border border-gray-200 p-3 text-xs shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            <div>
                              <p className="font-bold text-gray-900">Person Event</p>
                              <p className="text-[10px] text-gray-500 font-mono">
                                Camera: CAM-001 · Pedestrian proximity track
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-[9px] font-black font-mono">
                            88% Confidence
                          </span>
                        </div>
                      </>
                    ) : selectedCamera.detections.length > 0 ? (
                      selectedCamera.detections.map((det, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-xl bg-white border border-gray-200 p-3 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                            <div>
                              <p className="font-bold text-gray-900 capitalize">{det.type} Event</p>
                              <p className="text-[10px] text-gray-500 font-mono">
                                Timestamp: {det.timestamp}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 text-[9px] font-black font-mono">
                            {det.confidence}% Match
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl bg-white border border-gray-200 p-4 text-xs text-gray-500 italic">
                        AI Vision Agent active. Scanning live {selectedCamera.id} stream for
                        anomalies...
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-blue-600" /> AI Traffic Plan Recommendation
                  </h4>
                  <p className="text-xs text-gray-700 leading-relaxed font-medium">
                    Vision Agent recommends diverting southbound traffic from Sector 62 Main
                    Junction to Service Road B to maintain clear passage for en-route Ambulance
                    AMB-1083.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      toast.success(
                        "AI Traffic Plan Approved: Southbound detour enacted. Route cleared for emergency units.",
                      )
                    }
                    className="mt-2 w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                  >
                    Approve &amp; Enact AI Traffic Plan
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
        <div className="space-y-6">
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  Emergency Green Corridor Management Hub
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lock priority transit corridors for ambulances en-route to trauma centers
                </p>
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
                className="rounded-2xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
              >
                + Create Emergency Corridor
              </button>
            </div>

            <div className="space-y-4">
              {corridors.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-2xl border p-5 space-y-3 transition-all ${
                    c.status === "active"
                      ? "border-emerald-200 bg-emerald-50/70"
                      : "border-gray-200 bg-gray-50/80"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-blue-700">{c.id}</span>
                        <span className="rounded bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold font-mono border border-blue-200">
                          Unit: {c.ambulanceId}
                        </span>
                        <span className="rounded bg-gray-200 text-gray-700 px-2 py-0.5 text-[10px] font-mono">
                          Case: {c.incidentId}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mt-2">{c.routeName}</h3>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase border ${
                        c.status === "active"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-gray-200/60">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-wider">
                        Origin
                      </p>
                      <p className="font-bold text-gray-900 mt-0.5">{c.origin}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-wider">
                        Destination
                      </p>
                      <p className="font-bold text-gray-900 mt-0.5">{c.destination}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-wider">
                        Signals Locked
                      </p>
                      <p className="font-bold text-emerald-700 mt-0.5">
                        {c.signalsOverridden} Green Overrides
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-wider">
                        Time Saved
                      </p>
                      <p className="font-bold text-blue-700 mt-0.5">↓ {c.etaSavedMin} min</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {c.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => handleClearCorridor(c.id)}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        Release Corridor Lock
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApproveCorridor(c.id)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
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
        <div className="space-y-6">
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Road Blockages &amp; Incident Detour Management
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage active traffic bottlenecks and deploy AI detour plans
              </p>
            </div>

            <div className="space-y-4">
              {accidentDetected && (
                <div className="rounded-2xl border-2 border-red-300 bg-red-50/70 p-5 space-y-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-red-700">
                        INC-VISION-001 · CAM-001 DETECTED
                      </span>
                      <h3 className="text-sm font-black text-gray-900 mt-1 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 animate-bounce" />
                        NH-24 Bridge Overpass — Multi-Vehicle Collision
                      </h3>
                      <p className="text-xs text-gray-700 mt-0.5 font-medium">
                        Vision Agent Neural Detection: 2 Vehicles Involved (94% Confidence)
                      </p>
                    </div>
                    <span className="rounded-full bg-red-100 text-red-800 border border-red-300 px-3 py-1 text-[10px] font-black uppercase">
                      ACCIDENT DETECTED
                    </span>
                  </div>

                  <div className="rounded-xl bg-white border border-red-200 p-3 text-xs space-y-1 shadow-2xs">
                    <p className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">
                      AI Rerouting Plan
                    </p>
                    <p className="text-gray-800 font-medium">
                      Vision Agent recommends diverting southbound traffic from Sector 62 Main
                      Junction to Service Road B.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        toast.success("Traffic reroute deployed for NH-24 Bridge Overpass!")
                      }
                      className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                    >
                      Enact Detour Reroute
                    </button>
                    <span className="text-xs font-bold text-emerald-700 font-mono">
                      Status: Live Analysis Confirmed
                    </span>
                  </div>
                </div>
              )}

              {blockages.map((blk) => (
                <div
                  key={blk.id}
                  className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-800">
                        {blk.id} · {blk.zone}
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 mt-1">{blk.location}</h3>
                      <p className="text-xs text-gray-700 mt-0.5">{blk.cause}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 text-[10px] font-bold uppercase">
                      Clearance ETA: {blk.clearingETA}
                    </span>
                  </div>

                  <div className="rounded-xl bg-white border border-amber-200 p-3 text-xs space-y-1 shadow-2xs">
                    <p className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">
                      AI Rerouting Plan
                    </p>
                    <p className="text-gray-800 font-medium">{blk.reroutePlan}</p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => toast.success(`Traffic reroute deployed for ${blk.location}!`)}
                      className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-black transition-colors cursor-pointer shadow-xs"
                    >
                      Enact Detour Reroute
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBlockages((prev) => prev.filter((b) => b.id !== blk.id));
                        toast.success(`${blk.id} marked cleared! Road opened to normal traffic.`);
                      }}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
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
        <div className="space-y-6">
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Radio className="h-4 w-4 text-blue-600" />
                Inter-Agency Priority Communications Channel
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Direct dispatch voice &amp; telemetry link with responder units
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  agency: "Ambulance Driver (AMB-1083)",
                  role: "Paramedic Fleet",
                  status: "On Mission",
                  channel: "AMB-1083-DIRECT",
                },
                {
                  agency: "City Care ER Trauma Desk",
                  role: "Hospital Operations",
                  status: "Receiving",
                  channel: "CITYCARE-ER",
                },
                {
                  agency: "Command Center Dispatch",
                  role: "Grid Officer",
                  status: "Active Grid",
                  channel: "COMMAND-GRID-1",
                },
              ].map((item) => (
                <div
                  key={item.channel}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-blue-700 font-extrabold">
                      {item.channel}
                    </span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900">{item.agency}</h3>
                    <p className="text-[10px] text-gray-500 font-medium">{item.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCommChannel(item.agency);
                      toast.success(`Connected to secure channel: ${item.agency}`);
                    }}
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                  >
                    Open Audio / Dispatch Link
                  </button>
                </div>
              ))}
            </div>

            {activeCommChannel && (
              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 space-y-1">
                <p className="text-xs font-bold text-blue-900 flex items-center gap-2">
                  <Radio className="h-4 w-4 text-blue-600 animate-pulse" />
                  Active Audio Channel: {activeCommChannel}
                </p>
                <p className="text-[11px] text-gray-600 font-medium">
                  Voice &amp; Data link active. Transmitting green corridor clearance status.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 6: OFFICER PROFILE & DUTY LOG
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "profile" &&
        (() => {
          const profile = getProfile("traffic");
          const name =
            profile.fullName ||
            profile.officerName ||
            profile.name ||
            getDisplayName("traffic", user);
          const designation = profile.designation || "Traffic Police Officer";
          const officerId =
            profile.officerId || profile.employeeId || profile.badgeId || "TP-DEL-10482";
          const trafficUnit = profile.trafficUnit || "Delhi Traffic Control Unit";
          const controlCenter = profile.controlCenter || "Sector 62 Traffic Control Center";
          const zone = profile.zone || "Sector 62 / NH-24";
          const city = profile.city || "Delhi NCR";
          const dutyShift = profile.dutyShift || "Rotational";
          const email = profile.email || user?.email || "officer@traffic.aegis.gov.in";
          const mobile =
            profile.mobileNumber || profile.phone || user?.mobileNumber || "9876543218";
          const emergencyContact = profile.emergencyContact;
          const badgeId = profile.badgeId || officerId;

          return (
            <div className="max-w-4xl mx-auto space-y-6 pb-6">
              <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-600/10 border border-blue-600/20 text-2xl font-black text-blue-700 shrink-0">
                      {name
                        .split(" ")
                        .map((s: string) => s[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-gray-900">{name}</h2>
                        <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Verified / Active
                        </span>
                      </div>
                      <p className="text-xs font-bold text-blue-700 mt-0.5">{designation}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-mono">
                        Officer ID: {officerId}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      Officer / Employee ID
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1 font-mono">{officerId}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      Designation
                    </p>
                    <p className="text-sm font-bold text-blue-700 mt-1">{designation}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      Traffic Unit
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{trafficUnit}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      Control Center / Station
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{controlCenter}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      Assigned Zone / Sector
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{zone}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      City
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{city}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      Duty Shift
                    </p>
                    <p className="text-sm font-bold text-blue-700 mt-1">{dutyShift}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      Badge Number
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1 font-mono">{badgeId}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      Official Email
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1 truncate">{email}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      Mobile Number
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1 font-mono">+91 {mobile}</p>
                  </div>
                </div>

                {emergencyContact && (
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      Emergency Contact Number
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1 font-mono">
                      +91 {emergencyContact}
                    </p>
                  </div>
                )}

                {profile.idUploadName && (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
                        Submitted Identification Document
                      </p>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">
                        {profile.idUploadName}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-3 py-1">
                      Document Verified
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </TrafficShell>
  );
}
