import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Ambulance,
  ArrowRight,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Crosshair,
  Droplet,
  FileText,
  Filter,
  Fuel,
  Gauge,
  Heart,
  HeartPulse,
  History,
  Info,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Mic,
  Minus,
  Monitor,
  Navigation,
  Paperclip,
  Phone,
  Plus,
  Radio,
  RotateCw,
  Shield,
  ShieldCheck,
  Siren,
  Smartphone,
  Stethoscope,
  Thermometer,
  Timer,
  User,
  Users,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { SectionCard, SeverityBadge, StatCard } from "@/components/design-system";
import { AmbulanceShell, type AmbulanceTab } from "@/components/roles/ambulance-shell";
import { LiveMap } from "@/components/live-map";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileEdit from "@/components/profile/profile-edit";
import ProfileSettings from "@/components/profile/profile-settings";
import SecuritySettings from "@/components/profile/security-settings";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { getProfile, getDisplayName, clearSession } from "@/lib/profile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ambulance")({
  head: () => ({ meta: [{ title: "Ambulance Mission Cockpit · AEGIS" }] }),
  component: AmbulancePortal,
});

export type MissionStage =
  | "dispatched"
  | "route-ready"
  | "en-route-patient"
  | "arrived-patient"
  | "patient-stabilized"
  | "en-route-hospital"
  | "arrived-hospital"
  | "handover-complete";

const MISSION_WORKFLOW_STEPS: { stage: MissionStage; label: string; actionLabel: string }[] = [
  { stage: "dispatched", label: "DISPATCHED", actionLabel: "Acknowledge Dispatch" },
  { stage: "route-ready", label: "ROUTE READY", actionLabel: "Start Navigation & Route Sync" },
  {
    stage: "en-route-patient",
    label: "EN ROUTE TO PATIENT",
    actionLabel: "Mark Arrived at Patient",
  },
  { stage: "arrived-patient", label: "ARRIVED AT PATIENT", actionLabel: "Mark Patient Stabilized" },
  {
    stage: "patient-stabilized",
    label: "PATIENT STABILIZED",
    actionLabel: "Start Hospital Transfer",
  },
  {
    stage: "en-route-hospital",
    label: "EN ROUTE TO HOSPITAL",
    actionLabel: "Mark Hospital Arrival",
  },
  { stage: "arrived-hospital", label: "ARRIVED AT HOSPITAL", actionLabel: "Complete ER Handover" },
  {
    stage: "handover-complete",
    label: "ER HANDOVER COMPLETE",
    actionLabel: "Mission Complete — Return to Station",
  },
];

function AmbulancePortal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "ambulance")) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  const [tab, setTab] = useState<AmbulanceTab>("mission");
  const [stageIndex, setStageIndex] = useState<number>(1); // Default to route-ready
  const [distance, setDistance] = useState(1.8);
  const [vitals, setVitals] = useState({ bp: "145/95", spo2: 91, hr: 94 });
  const [commChannelModal, setCommChannelModal] = useState<
    "command" | "hospital" | "volunteer" | null
  >(null);

  // History state
  const [selectedMissionId, setSelectedMissionId] = useState<string>("EMG-1180");
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "COMPLETED" | "ABORTED" | "CANCELLED">(
    "ALL",
  );
  const [historyPage, setHistoryPage] = useState<number>(1);

  // Navigation state
  const [selectedRoute, setSelectedRoute] = useState<"fastest" | "alternative">("fastest");
  const [navActive, setNavActive] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const historyMissionsList = [
    {
      id: "EMG-1180",
      type: "Cardiac Emergency",
      pickup: "Sector 62 Market",
      destination: "City Care Trauma Hub",
      dateTime: "Mar 2, 2026 · 10:24 AM",
      dispatchTime: "Mar 2, 2026 · 10:24 AM",
      arrivalScene: "Mar 2, 2026 · 10:29 AM",
      patientStabilized: "Mar 2, 2026 · 10:30 AM",
      arrivalHospital: "Mar 2, 2026 · 10:32 AM",
      handoverComplete: "Mar 2, 2026 · 10:37 AM",
      responseTime: "7 min 42 sec",
      distance: "1.8 km",
      hospital: "City Care Trauma Hub",
      crew: "2 Members",
      status: "COMPLETED",
      timeline: [
        { label: "Dispatched", time: "10:24 AM", done: true },
        { label: "En Route", time: "10:25 AM", done: true },
        { label: "Arrived", time: "10:29 AM", done: true },
        { label: "Stabilized", time: "10:30 AM", done: true },
        { label: "Hospital", time: "10:32 AM", done: true },
        { label: "Handover", time: "10:37 AM", done: true },
      ],
    },
    {
      id: "EMG-1176",
      type: "Accident Assistance",
      pickup: "Noida Sec 71 Metro",
      destination: "City Care ER Bay 3",
      dateTime: "Feb 28, 2026 · 08:15 PM",
      dispatchTime: "Feb 28, 2026 · 08:15 PM",
      arrivalScene: "Feb 28, 2026 · 08:22 PM",
      patientStabilized: "Feb 28, 2026 · 08:25 PM",
      arrivalHospital: "Feb 28, 2026 · 08:30 PM",
      handoverComplete: "Feb 28, 2026 · 08:34 PM",
      responseTime: "9 min 18 sec",
      distance: "3.2 km",
      hospital: "City Care ER Bay 3",
      crew: "2 Members",
      status: "COMPLETED",
      timeline: [
        { label: "Dispatched", time: "08:15 PM", done: true },
        { label: "En Route", time: "08:17 PM", done: true },
        { label: "Arrived", time: "08:22 PM", done: true },
        { label: "Stabilized", time: "08:25 PM", done: true },
        { label: "Hospital", time: "08:30 PM", done: true },
        { label: "Handover", time: "08:34 PM", done: true },
      ],
    },
    {
      id: "EMG-1170",
      type: "Medical Emergency",
      pickup: "Sector 53 Chowk",
      destination: "City Care Trauma Hub",
      dateTime: "Feb 25, 2026 · 04:40 PM",
      dispatchTime: "Feb 25, 2026 · 04:40 PM",
      arrivalScene: "Feb 25, 2026 · 04:47 PM",
      patientStabilized: "N/A",
      arrivalHospital: "N/A",
      handoverComplete: "N/A",
      responseTime: "8 min 05 sec",
      distance: "2.1 km",
      hospital: "City Care Trauma Hub",
      crew: "2 Members",
      status: "ABORTED",
      timeline: [
        { label: "Dispatched", time: "04:40 PM", done: true },
        { label: "En Route", time: "04:42 PM", done: true },
        { label: "Arrived", time: "04:47 PM", done: true },
        { label: "Aborted", time: "04:48 PM", done: false },
      ],
    },
    {
      id: "EMG-1165",
      type: "Breathing Difficulty",
      pickup: "Sector 122 Market",
      destination: "City Care ER Bay 2",
      dateTime: "Feb 23, 2026 · 01:10 PM",
      dispatchTime: "Feb 23, 2026 · 01:10 PM",
      arrivalScene: "Feb 23, 2026 · 01:18 PM",
      patientStabilized: "Feb 23, 2026 · 01:21 PM",
      arrivalHospital: "Feb 23, 2026 · 01:28 PM",
      handoverComplete: "Feb 23, 2026 · 01:33 PM",
      responseTime: "11 min 33 sec",
      distance: "4.5 km",
      hospital: "City Care ER Bay 2",
      crew: "2 Members",
      status: "COMPLETED",
      timeline: [
        { label: "Dispatched", time: "01:10 PM", done: true },
        { label: "En Route", time: "01:12 PM", done: true },
        { label: "Arrived", time: "01:18 PM", done: true },
        { label: "Stabilized", time: "01:21 PM", done: true },
        { label: "Hospital", time: "01:28 PM", done: true },
        { label: "Handover", time: "01:33 PM", done: true },
      ],
    },
    {
      id: "EMG-1160",
      type: "Trauma Case",
      pickup: "DND Flyway",
      destination: "City Care Trauma Hub",
      dateTime: "Feb 20, 2026 · 11:55 AM",
      dispatchTime: "Feb 20, 2026 · 11:55 AM",
      arrivalScene: "N/A",
      patientStabilized: "N/A",
      arrivalHospital: "N/A",
      handoverComplete: "N/A",
      responseTime: "N/A",
      distance: "5.0 km",
      hospital: "City Care Trauma Hub",
      crew: "2 Members",
      status: "CANCELLED",
      timeline: [
        { label: "Dispatched", time: "11:55 AM", done: true },
        { label: "Cancelled", time: "11:56 AM", done: false },
      ],
    },
    {
      id: "EMG-1156",
      type: "Fall Injury",
      pickup: "Sector 63 Market",
      destination: "City Care ER Bay 3",
      dateTime: "Feb 18, 2026 · 07:35 PM",
      dispatchTime: "Feb 18, 2026 · 07:35 PM",
      arrivalScene: "Feb 18, 2026 · 07:43 PM",
      patientStabilized: "Feb 18, 2026 · 07:45 PM",
      arrivalHospital: "Feb 18, 2026 · 07:51 PM",
      handoverComplete: "Feb 18, 2026 · 07:55 PM",
      responseTime: "10 min 04 sec",
      distance: "2.8 km",
      hospital: "City Care ER Bay 3",
      crew: "2 Members",
      status: "COMPLETED",
      timeline: [
        { label: "Dispatched", time: "07:35 PM", done: true },
        { label: "En Route", time: "07:37 PM", done: true },
        { label: "Arrived", time: "07:43 PM", done: true },
        { label: "Stabilized", time: "07:45 PM", done: true },
        { label: "Hospital", time: "07:51 PM", done: true },
        { label: "Handover", time: "07:55 PM", done: true },
      ],
    },
  ];

  const filteredMissions = historyMissionsList.filter(
    (m) => historyFilter === "ALL" || m.status === historyFilter,
  );
  const selectedMissionRecord =
    historyMissionsList.find((m) => m.id === selectedMissionId) || historyMissionsList[0];

  // Dynamic ETA calculation (never shows "—" when distance is available)
  const currentStage = MISSION_WORKFLOW_STEPS[stageIndex] ?? MISSION_WORKFLOW_STEPS[0];
  const calculatedEtaMin = Math.max(1, Math.ceil(distance * 2.2));

  useEffect(() => {
    if (stageIndex < 2 || stageIndex >= 7) return;
    const interval = setInterval(() => {
      setVitals((v) => ({
        hr: Math.round(v.hr + (Math.random() > 0.5 ? 1 : -1)),
        spo2: Math.min(100, Math.max(85, v.spo2 + (Math.random() > 0.7 ? 1 : -1))),
        bp: v.bp,
      }));
      setDistance((d) => Math.max(0.1, +(d - 0.1).toFixed(1)));
    }, 6000);
    return () => clearInterval(interval);
  }, [stageIndex]);

  if (isLoading || !isAuthenticated || user?.role !== "ambulance") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-6 w-6 animate-ping bg-amber-600 rounded-full" />
      </div>
    );
  }

  const handleAdvanceWorkflow = () => {
    if (stageIndex < MISSION_WORKFLOW_STEPS.length - 1) {
      const nextIdx = stageIndex + 1;
      setStageIndex(nextIdx);
      const nextStep = MISSION_WORKFLOW_STEPS[nextIdx];
      toast.success(`Mission State Updated: ${nextStep.label}`);
    } else {
      toast.success("Mission Handover Completed! Unit A-1083 status updated to AVAILABLE.");
    }
  };

  return (
    <AmbulanceShell
      activeTab={tab}
      onTabChange={setTab}
      missionStatus={
        <span className="rounded-full bg-[#E63946] px-3 py-1 text-[10px] font-black uppercase tracking-wider">
          EMG-1258 · {currentStage.label}
        </span>
      }
    >
      {/* ═══════════════════════════════════════════════════════════════
          OPERATIONAL INFORMATION HEADER GRID (CRITICAL MISSION METRICS)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 mb-4 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black text-amber-400">EMG-1258</span>
            <SeverityBadge severity="critical" />
            <h1 className="text-sm font-extrabold text-white">Cardiac Distress Emergency</h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-gray-400">Status:</span>
            <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-[10px]">
              ● {currentStage.label}
            </span>
          </div>
        </div>

        {/* Operational Grid Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs text-center">
          <div className="bg-[#1F2937] p-2.5 rounded-xl border border-gray-700">
            <p className="text-[9px] font-bold text-gray-400 uppercase">Pickup Location</p>
            <p className="font-bold text-white mt-0.5 truncate">Sector 62 Market</p>
          </div>

          <div className="bg-[#1F2937] p-2.5 rounded-xl border border-gray-700">
            <p className="text-[9px] font-bold text-gray-400 uppercase">Victim / Condition</p>
            <p className="font-bold text-amber-400 mt-0.5">1 Male (56Y) · Cardiac</p>
          </div>

          <div className="bg-[#1F2937] p-2.5 rounded-xl border border-gray-700">
            <p className="text-[9px] font-bold text-gray-400 uppercase">Current ETA</p>
            <p className="font-bold text-emerald-400 mt-0.5 font-mono text-sm">
              {calculatedEtaMin} min
            </p>
          </div>

          <div className="bg-[#1F2937] p-2.5 rounded-xl border border-gray-700">
            <p className="text-[9px] font-bold text-gray-400 uppercase">Distance</p>
            <p className="font-bold text-white mt-0.5 font-mono">{distance} km</p>
          </div>

          <div className="bg-[#1F2937] p-2.5 rounded-xl border border-gray-700">
            <p className="text-[9px] font-bold text-gray-400 uppercase">Traffic Corridor</p>
            <p className="font-bold text-emerald-400 mt-0.5">6 Signals Green</p>
          </div>

          <div className="bg-[#1F2937] p-2.5 rounded-xl border border-gray-700">
            <p className="text-[9px] font-bold text-gray-400 uppercase">Hospital Target</p>
            <p className="font-bold text-cyan-400 mt-0.5 truncate">City Care ER Bay 3</p>
          </div>

          <div className="bg-[#1F2937] p-2.5 rounded-xl border border-gray-700 col-span-2 sm:col-span-1">
            <p className="text-[9px] font-bold text-gray-400 uppercase">Nearby Volunteer</p>
            <p className="font-bold text-purple-400 mt-0.5 truncate">VOL-202 (120m away)</p>
          </div>
        </div>

        {/* Actionable Mission Stepper Bar */}
        <div className="mt-4 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 mb-3">
            {MISSION_WORKFLOW_STEPS.map((s, idx) => (
              <div
                key={s.stage}
                className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-extrabold transition-all border ${
                  stageIndex === idx
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-300 scale-105"
                    : idx < stageIndex
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-gray-800/50 border-gray-700 text-gray-500"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAdvanceWorkflow}
            className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-black text-black transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
            <span>ACTION: {currentStage.actionLabel}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MISSION TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "mission" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Communication Options */}
            <SectionCard
              title="Direct Communication Center"
              description="Instant audio & dispatch channels"
            >
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCommChannelModal("command")}
                  className="rounded-xl border border-gray-200 bg-white p-3 text-center hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                >
                  <Radio className="mx-auto h-5 w-5 text-gray-700" />
                  <p className="text-xs font-bold text-gray-900 mt-1">Command Dispatch</p>
                  <p className="text-[9px] text-gray-500">Direct Line</p>
                </button>

                <button
                  type="button"
                  onClick={() => setCommChannelModal("hospital")}
                  className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-center hover:bg-blue-50 transition-colors shadow-sm cursor-pointer"
                >
                  <Building2 className="mx-auto h-5 w-5 text-blue-600" />
                  <p className="text-xs font-bold text-gray-900 mt-1">City Care ER</p>
                  <p className="text-[9px] text-blue-600 font-bold">Trauma Desk</p>
                </button>

                <button
                  type="button"
                  onClick={() => setCommChannelModal("volunteer")}
                  className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 text-center hover:bg-purple-50 transition-colors shadow-sm cursor-pointer"
                >
                  <Users className="mx-auto h-5 w-5 text-purple-600" />
                  <p className="text-xs font-bold text-gray-900 mt-1">VOL-202 Aarav</p>
                  <p className="text-[9px] text-purple-600 font-bold">120m away</p>
                </button>
              </div>
            </SectionCard>

            {/* Volunteer Coordination Card */}
            <SectionCard
              title="On-Scene Volunteer Coordination"
              description="Citizen responder active at location"
            >
              <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3.5 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold text-gray-900">VOL-202 · Aarav Sharma</h3>
                    <p className="text-[10px] text-gray-600">CPR Certified · EMT Basic</p>
                  </div>
                  <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[9px] font-bold border border-purple-200">
                    Performing CPR on Scene
                  </span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  "Patient collapsed near Sector 62 market main entry. CPR cycle 2 active. AED
                  retrieved from Metro Gate 2."
                </p>
                <div className="flex gap-2 pt-1">
                  <a
                    href="tel:+919876543214"
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-purple-600 py-1.5 text-[10px] font-bold text-white hover:bg-purple-700"
                  >
                    <Phone className="h-3 w-3" /> Call Volunteer
                  </a>
                  <button
                    type="button"
                    onClick={() => toast.success("Location beacon synced with Volunteer VOL-202.")}
                    className="flex-1 rounded-lg border border-purple-300 bg-white py-1.5 text-[10px] font-bold text-purple-700 hover:bg-purple-50 cursor-pointer"
                  >
                    Sync Beacon
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          NAVIGATION WORKSPACE TAB (PRIMARY NAVIGATION INTERFACE)
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "navigation" && (
        <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-2 py-2">
          {/* MAIN NAVIGATION WORKSPACE GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ═════════════════════════════════════════════════════════
                LEFT: ROUTE OPTIONS PANEL (~30-35% WIDTH)
            ═════════════════════════════════════════════════════════ */}
            <div className="space-y-6">
              <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Compass className="h-4 w-4 text-[#E63946]" />
                    Route Options
                  </h3>
                  <span className="text-[10px] font-mono text-gray-400">2 Paths Found</span>
                </div>

                {/* FASTEST ROUTE (RECOMMENDED) */}
                <div
                  onClick={() => setSelectedRoute("fastest")}
                  className={cn(
                    "rounded-2xl p-4 border transition-all duration-150 cursor-pointer space-y-2 relative overflow-hidden",
                    selectedRoute === "fastest"
                      ? "bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-400/30"
                      : "bg-gray-50 border-gray-200 hover:border-gray-300",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      FASTEST ROUTE · Recommended
                    </span>
                    {selectedRoute === "fastest" && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-gray-900">4 min</span>
                      <span className="text-xs font-bold text-gray-500">(1.8 km)</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> 6 Signals Green
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-500 font-medium">
                    Green Corridor Bypass via NH-24 · Zero Congestion
                  </p>
                </div>

                {/* ALTERNATIVE ROUTE */}
                <div
                  onClick={() => setSelectedRoute("alternative")}
                  className={cn(
                    "rounded-2xl p-4 border transition-all duration-150 cursor-pointer space-y-2",
                    selectedRoute === "alternative"
                      ? "bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-400/30"
                      : "bg-gray-50/80 border-gray-200 hover:border-gray-300 hover:bg-gray-100/60",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded">
                      ALTERNATIVE ROUTE
                    </span>
                    {selectedRoute === "alternative" && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-gray-700">6 min</span>
                      <span className="text-xs font-medium text-gray-500">(2.4 km)</span>
                    </div>
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Moderate Traffic
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-500 font-medium">
                    Service Road Loop via Sec 62 Inner Circle
                  </p>
                </div>

                {/* COMPACT ROUTE SUMMARY */}
                <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-500 font-medium">Destination</span>
                    <span className="font-bold text-gray-900">City Care Trauma Hub</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Traffic Status</span>
                    <span className="font-bold text-emerald-600">
                      {selectedRoute === "fastest" ? "6 Signals Green" : "3 Signals Green"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">ETA</span>
                    <span className="font-bold text-gray-900 font-mono">
                      {selectedRoute === "fastest" ? "4 min" : "6 min"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Distance</span>
                    <span className="font-bold text-gray-900 font-mono">
                      {selectedRoute === "fastest" ? "1.8 km" : "2.4 km"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                    <span className="text-gray-500 font-medium">Status</span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-black border uppercase",
                        navActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-blue-50 text-blue-700 border-blue-200",
                      )}
                    >
                      {navActive ? "● NAVIGATION ACTIVE" : "ROUTE READY"}
                    </span>
                  </div>
                </div>

                {/* RECALCULATE ROUTE BUTTON */}
                <button
                  type="button"
                  disabled={isRecalculating}
                  onClick={() => {
                    setIsRecalculating(true);
                    toast.info("Recalculating optimal traffic corridor...");
                    setTimeout(() => {
                      setIsRecalculating(false);
                      toast.success("Route recalculated! Fastest path confirmed (4 min).");
                    }, 600);
                  }}
                  className="w-full rounded-2xl bg-gray-100 hover:bg-gray-200 py-2.5 text-xs font-bold text-gray-800 transition-all cursor-pointer border border-gray-200 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <RotateCw className={cn("h-3.5 w-3.5", isRecalculating && "animate-spin")} />
                  <span>{isRecalculating ? "Recalculating..." : "Recalculate Route"}</span>
                </button>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════
                RIGHT: ROUTE OVERVIEW & TACTICAL MAP (~65-70% WIDTH)
            ═════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm relative overflow-hidden space-y-5">
                {/* ROUTE OVERVIEW HEADER */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-[#E63946]" />
                      Route Overview
                    </h3>
                    <p className="text-xs font-medium text-gray-500 mt-0.5 flex items-center gap-1.5">
                      <span className="font-bold text-gray-900">Unit A-1083</span>
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      <span className="font-bold text-gray-900">Patient</span>
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      <span className="font-bold text-emerald-600">City Care Trauma Hub</span>
                    </p>
                  </div>

                  {/* FLOATING MAP STATUS BADGES */}
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold">
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE · 13s ago
                    </span>
                    <span className="rounded-full bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-0.5">
                      28.66°N · 77.45°E
                    </span>
                  </div>
                </div>

                {/* READOUT SUMMARY GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">
                      Current Location
                    </span>
                    <span className="font-bold text-gray-900 block truncate">ALS Unit A-1083</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">
                      Patient Location
                    </span>
                    <span className="font-bold text-gray-900 block truncate">Sector 62 Market</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">
                      Hospital Destination
                    </span>
                    <span className="font-bold text-emerald-700 block truncate">
                      City Care Trauma Hub
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">ETA</span>
                    <span className="font-mono font-bold text-gray-900 block">4 min</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">
                      Distance
                    </span>
                    <span className="font-mono font-bold text-gray-900 block">1.8 km</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">
                      Traffic Status
                    </span>
                    <span className="font-bold text-emerald-600 block">6 Signals Green</span>
                  </div>
                </div>

                {/* LIVE MAP CONTAINER */}
                <div className="relative rounded-2xl border border-gray-200 overflow-hidden bg-slate-900 min-h-[420px] shadow-inner">
                  <LiveMap
                    markers={[
                      {
                        id: "us",
                        type: "ambulance",
                        x: selectedRoute === "fastest" ? 25 : 20,
                        y: selectedRoute === "fastest" ? 75 : 80,
                        label: "Unit A-1083",
                        active: true,
                      },
                      {
                        id: "pat",
                        type: "emergency",
                        x: 48,
                        y: 52,
                        label: "Patient - Sector 62 Market",
                        active: true,
                      },
                      {
                        id: "h",
                        type: "hospital",
                        x: 82,
                        y: 22,
                        label: "City Care Trauma Hub",
                        active: false,
                      },
                    ]}
                    route={
                      selectedRoute === "fastest"
                        ? {
                            from: [25, 75],
                            via: [
                              [38, 62],
                              [48, 52],
                              [65, 38],
                            ],
                            to: [82, 22],
                          }
                        : {
                            from: [20, 80],
                            via: [
                              [28, 68],
                              [48, 52],
                              [60, 48],
                              [75, 30],
                            ],
                            to: [82, 22],
                          }
                    }
                    showCorridor={true}
                    dark={false}
                    className="h-[420px] w-full"
                  />

                  {/* MAP CONTROLS (ZOOM IN, ZOOM OUT, RECENTER, NORTH UP) */}
                  <div className="absolute right-4 top-4 flex flex-col gap-2 z-10">
                    <button
                      type="button"
                      title="Recenter Map"
                      onClick={() => toast.info("Map re-centered to ALS Unit A-1083")}
                      className="h-8 w-8 rounded-full bg-white/95 text-gray-800 border border-gray-200 shadow-md flex items-center justify-center hover:bg-white transition-all cursor-pointer"
                    >
                      <Crosshair className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Zoom In"
                      onClick={() => toast.info("Zoom In")}
                      className="h-8 w-8 rounded-full bg-white/95 text-gray-800 border border-gray-200 shadow-md flex items-center justify-center hover:bg-white transition-all cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Zoom Out"
                      onClick={() => toast.info("Zoom Out")}
                      className="h-8 w-8 rounded-full bg-white/95 text-gray-800 border border-gray-200 shadow-md flex items-center justify-center hover:bg-white transition-all cursor-pointer"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="North Up"
                      onClick={() => toast.info("Map Oriented North Up")}
                      className="h-8 w-8 rounded-full bg-white/95 text-gray-800 border border-gray-200 shadow-md flex items-center justify-center hover:bg-white transition-all cursor-pointer text-[10px] font-black"
                    >
                      N
                    </button>
                  </div>

                  {/* MAP LEGEND OVERLAY */}
                  <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur border border-gray-200 text-gray-900 text-[10px] px-3 py-2 rounded-xl shadow-md space-y-1">
                    <div className="font-bold text-gray-500 uppercase text-[9px] border-b border-gray-200 pb-0.5">
                      Map Legend
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-medium pt-0.5">
                      <span className="flex items-center gap-1.5 text-gray-800">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Fastest Route
                      </span>
                      <span className="flex items-center gap-1.5 text-gray-800">
                        <span className="h-2 w-2 rounded-full bg-amber-500" /> Moderate Traffic
                      </span>
                      <span className="flex items-center gap-1.5 text-gray-800">
                        <span className="h-2 w-2 rounded-full bg-red-500" /> Heavy Traffic
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. NEXT TURN SECTION */}
                <div className="rounded-2xl bg-gray-50/90 border border-gray-200 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#E63946] bg-[#E63946]/10 px-2 py-0.5 rounded border border-[#E63946]/20">
                          NEXT TURN
                        </span>
                        <span className="text-xs font-mono font-bold text-gray-500">In 400 m</span>
                      </div>

                      <h4 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-[#E63946] shrink-0" />
                        Turn Right onto NH-24 Green Corridor Bypass
                      </h4>
                    </div>

                    {/* 4. START NAVIGATION BUTTON & SUBTITLE */}
                    <div className="text-center sm:text-right space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setNavActive((prev) => !prev);
                          if (!navActive) {
                            toast.success("Navigation Active! Live GPS route guidance initiated.");
                          } else {
                            toast.info("Navigation paused.");
                          }
                        }}
                        className={cn(
                          "rounded-2xl px-6 py-3.5 text-xs font-black text-white hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-md flex items-center gap-2 justify-center",
                          navActive
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-[#E63946] hover:bg-[#C32F3A] hover:shadow-red-500/20",
                        )}
                      >
                        <Navigation className="h-4 w-4" />
                        <span>{navActive ? "NAVIGATION ACTIVE" : "Start Navigation"}</span>
                      </button>
                      <span className="text-[10px] text-gray-500 font-medium block">
                        Route Sync will begin
                      </span>
                    </div>
                  </div>

                  {/* UPCOMING INSTRUCTIONS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                    <div className="p-2 rounded-xl bg-white border border-gray-200">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Step 1
                      </span>
                      <span className="font-bold text-gray-900 block mt-0.5">
                        Continue for 800 m
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-gray-200">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Step 2
                      </span>
                      <span className="font-bold text-gray-900 block mt-0.5">
                        Exit Sec 62 — 1.2 km
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-gray-200">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Step 3
                      </span>
                      <span className="font-bold text-gray-900 block mt-0.5">
                        Slight Left — 500 m
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-gray-200">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Destination
                      </span>
                      <span className="font-bold text-emerald-700 block mt-0.5">
                        Hospital — ETA 4 min
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. ROUTE INFORMATION CARD */}
                <div className="rounded-2xl bg-blue-50/70 border border-blue-200/80 p-3.5 flex items-center gap-3 text-xs">
                  <Info className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold text-blue-950 block">Route Information</span>
                    <p className="text-[11px] text-blue-800 mt-0.5">
                      Fastest route based on live traffic conditions. Stay on NH-24 Green Corridor
                      for quickest access.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PATIENT MEDICAL DASHBOARD TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "patient" && (
        <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-2 py-2">
          {/* 3-COLUMN RESPONSIVE MEDICAL DASHBOARD LAYOUT */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* ═════════════════════════════════════════════════════════
                LEFT COLUMN — PATIENT OVERVIEW
            ═════════════════════════════════════════════════════════ */}
            <div className="space-y-6">
              <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <User className="h-4 w-4 text-[#E63946]" />
                    Patient Overview
                  </h3>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                </div>

                {/* Patient Header Avatar & Key Info */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80">
                  <div className="h-12 w-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                    <User className="h-6 w-6 text-[#E63946]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-gray-900">Male, 56 Years</h4>
                      <span className="rounded bg-red-50 text-[#E63946] border border-red-200 text-[9px] font-extrabold px-1.5 py-0.5 uppercase">
                        O+
                      </span>
                    </div>
                    <p className="text-xs font-mono font-bold text-gray-500 mt-0.5">
                      Patient ID: PT-562478
                    </p>
                  </div>
                </div>

                {/* Structured Medical Data List */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Age / Sex</span>
                    <span className="font-bold text-gray-900">56 Years / Male</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Weight</span>
                    <span className="font-bold text-gray-900 font-mono">78 kg</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Blood Group</span>
                    <span className="font-extrabold text-[#E63946]">O Positive (O+)</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Allergies</span>
                    <span className="font-bold text-emerald-700">None Known</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Chronic Conditions</span>
                    <span className="font-bold text-amber-700">Hypertension (Known)</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Medications</span>
                    <span className="font-bold text-gray-900">Amlodipine (5mg OD)</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-gray-500 font-medium">Insurance</span>
                    <span className="font-bold text-blue-700">Star Health (#SH-8821)</span>
                  </div>
                </div>

                {/* View Full Profile Button */}
                <button
                  type="button"
                  onClick={() => toast.info("Opening full patient medical history file...")}
                  className="w-full rounded-2xl bg-gray-50 hover:bg-gray-100 py-2.5 text-xs font-bold text-gray-800 transition-all border border-gray-200 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>View Full Profile</span>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════
                CENTER COLUMN — CLINICAL SUMMARY & TIMELINE
            ═════════════════════════════════════════════════════════ */}
            <div className="space-y-6">
              <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#E63946]" />
                    Clinical Summary
                  </h3>
                  <span className="rounded-md bg-red-50 text-[#E63946] border border-red-200 px-2 py-0.5 text-[9px] font-extrabold uppercase">
                    HIGH RISK EVENT
                  </span>
                </div>

                {/* Grid Layout of Clinical Summary */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80 col-span-2">
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">
                      Chief Complaint
                    </span>
                    <span className="font-extrabold text-gray-900 block mt-0.5 text-sm">
                      Sudden Collapse &amp; Chest Distress
                    </span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-200/80">
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">Onset Time</span>
                    <span className="font-bold text-gray-900 font-mono block mt-0.5">16:21 hrs</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-red-50/60 border border-red-200/80">
                    <span className="text-[9px] font-bold text-red-600 uppercase block">Category</span>
                    <span className="font-extrabold text-[#E63946] block mt-0.5">CRITICAL</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-200/80 col-span-2">
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">
                      Initial Impression
                    </span>
                    <span className="font-bold text-gray-900 block mt-0.5">Acute Cardiac Event</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-200/80">
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">Consciousness</span>
                    <span className="font-bold text-gray-900 block mt-0.5">Responsive to voice</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                    <span className="text-[9px] font-bold text-amber-700 uppercase block">Breathing</span>
                    <span className="font-bold text-amber-900 block mt-0.5">Labored</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-200/80">
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">Skin Condition</span>
                    <span className="font-bold text-gray-900 block mt-0.5">Pale &amp; Clammy</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-red-50/60 border border-red-200/80">
                    <span className="text-[9px] font-bold text-red-600 uppercase block">Pain Score / Risk</span>
                    <span className="font-extrabold text-[#E63946] block mt-0.5">8 / 10 · HIGH</span>
                  </div>
                </div>

                {/* Timeline & Notes Section */}
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <h4 className="text-xs font-extrabold text-gray-900 tracking-tight uppercase flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-500" />
                    Timeline &amp; Notes
                  </h4>

                  <div className="space-y-3 pl-2 border-l-2 border-gray-200 text-xs relative ml-1">
                    {/* Event 1 */}
                    <div className="relative pl-4 space-y-0.5">
                      <div className="absolute -left-[17px] top-1 h-2.5 w-2.5 rounded-full bg-gray-400 ring-4 ring-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-gray-900">16:19 — Incident Reported</span>
                        <span className="rounded bg-gray-100 text-gray-700 px-1.5 py-0.5 text-[8px] font-extrabold uppercase border border-gray-200">
                          SYSTEM
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600">
                        Emergency call received from citizen (AI-CCTV + Citizen Report)
                      </p>
                    </div>

                    {/* Event 2 */}
                    <div className="relative pl-4 space-y-0.5">
                      <div className="absolute -left-[17px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-gray-900">16:21 — Ambulance Dispatched</span>
                        <span className="rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[8px] font-extrabold uppercase border border-blue-200">
                          DISPATCH
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600">
                        UP-14-004 dispatched to Sector 62 Market
                      </p>
                    </div>

                    {/* Event 3 */}
                    <div className="relative pl-4 space-y-0.5">
                      <div className="absolute -left-[17px] top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-gray-900">16:27 — Arrived at Scene</span>
                        <span className="rounded bg-amber-50 text-amber-700 px-1.5 py-0.5 text-[8px] font-extrabold uppercase border border-amber-200">
                          ON SCENE
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600">
                        Patient found conscious but in severe distress
                      </p>
                    </div>

                    {/* Event 4 */}
                    <div className="relative pl-4 space-y-0.5">
                      <div className="absolute -left-[17px] top-1 h-2.5 w-2.5 rounded-full bg-purple-500 ring-4 ring-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-gray-900">16:29 — Initial Assessment</span>
                        <span className="rounded bg-purple-50 text-purple-700 px-1.5 py-0.5 text-[8px] font-extrabold uppercase border border-purple-200">
                          ASSESSMENT
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600">
                        Vitals recorded, 12-lead ECG initiated
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toast.info("Opening complete clinical log stream...")}
                    className="w-full rounded-2xl bg-gray-50 hover:bg-gray-100 py-2.5 text-xs font-bold text-gray-800 transition-all border border-gray-200 flex items-center justify-center gap-1.5 cursor-pointer mt-2 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>View Full Timeline</span>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════
                RIGHT COLUMN — LIVE VITALS & EMERGENCY ACTIONS
            ═════════════════════════════════════════════════════════ */}
            <div className="space-y-6">
              {/* LIVE VITALS CARD */}
              <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#E63946]" />
                    Live Vitals
                  </h3>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold">
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE
                    </span>
                    <span className="text-gray-400">10s ago</span>
                  </div>
                </div>

                {/* 6 Compact Vital Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Heart Rate */}
                  <div className="p-3 rounded-2xl bg-red-50/60 border border-red-200/80">
                    <div className="flex items-center justify-between text-gray-500 text-[10px] font-bold">
                      <span>Heart Rate</span>
                      <Heart className="h-3.5 w-3.5 text-[#E63946]" />
                    </div>
                    <p className="text-xl font-black font-mono text-[#E63946] mt-1">
                      {vitals.hr} <span className="text-[10px] text-gray-500 font-sans font-normal">bpm</span>
                    </p>
                  </div>

                  {/* SpO2 */}
                  <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200/80">
                    <div className="flex items-center justify-between text-gray-500 text-[10px] font-bold">
                      <span>SpO₂</span>
                      <Activity className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <p className="text-xl font-black font-mono text-blue-700 mt-1">
                      {vitals.spo2}% <span className="text-[10px] text-gray-500 font-sans font-normal">Sat</span>
                    </p>
                  </div>

                  {/* Blood Pressure */}
                  <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                    <div className="flex items-center justify-between text-gray-500 text-[10px] font-bold">
                      <span>Blood Pressure</span>
                      <HeartPulse className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <p className="text-lg font-black font-mono text-emerald-800 mt-1">
                      145/95 <span className="text-[9px] text-gray-500 font-sans font-normal">mmHg</span>
                    </p>
                  </div>

                  {/* Respiratory Rate */}
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80">
                    <div className="flex items-center justify-between text-gray-500 text-[10px] font-bold">
                      <span>Resp Rate</span>
                      <Activity className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                    <p className="text-xl font-black font-mono text-gray-900 mt-1">
                      22 <span className="text-[10px] text-gray-500 font-sans font-normal">/min</span>
                    </p>
                  </div>

                  {/* Temperature */}
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80">
                    <div className="flex items-center justify-between text-gray-500 text-[10px] font-bold">
                      <span>Temperature</span>
                      <Thermometer className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                    <p className="text-xl font-black font-mono text-gray-900 mt-1">
                      36.7 <span className="text-[10px] text-gray-500 font-sans font-normal">°C</span>
                    </p>
                  </div>

                  {/* Glucose */}
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80">
                    <div className="flex items-center justify-between text-gray-500 text-[10px] font-bold">
                      <span>Glucose</span>
                      <Droplet className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                    <p className="text-xl font-black font-mono text-gray-900 mt-1">
                      112 <span className="text-[9px] text-gray-500 font-sans font-normal">mg/dL</span>
                    </p>
                  </div>
                </div>

                {/* Subtle Alert Box */}
                <div className="rounded-2xl bg-amber-50 border border-amber-200/90 p-3 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed font-medium">
                    Elevated Heart Rate and Blood Pressure detected. Continue monitoring. Prepare for ER handover.
                  </p>
                </div>
              </div>

              {/* ACTIONS & SUPPORT CARD */}
              <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Zap className="h-4 w-4 text-[#E63946]" />
                  Actions &amp; Support
                </h3>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => toast.success("12-Lead ECG monitoring stream initiated and synced with ER.")}
                    className="p-3 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all text-left space-y-1 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Activity className="h-4 w-4 text-[#E63946]" />
                    <p className="text-xs font-bold text-gray-900">Start 12-Lead ECG</p>
                    <p className="text-[9px] text-gray-500">ECG Monitoring</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => toast.info("Voice recorder active. Speak clinical note...")}
                    className="p-3 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all text-left space-y-1 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Mic className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-bold text-gray-900">Record Voice Note</p>
                    <p className="text-[9px] text-gray-500">Add Clinical Note</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => toast.info("Attach photo or video media file...")}
                    className="p-3 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all text-left space-y-1 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Paperclip className="h-4 w-4 text-purple-600" />
                    <p className="text-xs font-bold text-gray-900">Attach Media</p>
                    <p className="text-[9px] text-gray-500">Photo / Video</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => toast.success("Remote Doctor Consultation Requested. Dr. Ankit Sharma notified.")}
                    className="p-3 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all text-left space-y-1 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Stethoscope className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs font-bold text-gray-900">Request Doctor</p>
                    <p className="text-[9px] text-gray-500">Remote Consultation</p>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleAdvanceWorkflow();
                    toast.success("Patient marked as STABILIZED. Preparing for ER Handover.");
                  }}
                  className="w-full rounded-2xl border-2 border-[#E63946] bg-white hover:bg-red-50 py-3 text-xs font-black text-[#E63946] transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Mark Patient as Stabilized</span>
                </button>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════
              BOTTOM SUPPORT BAR — 3 SECTIONS
          ═════════════════════════════════════════════════════════ */}
          <div className="rounded-3xl bg-white p-5 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 divide-y md:divide-y-0 md:divide-x divide-gray-200">
              {/* Section 1: Hospital Target */}
              <div className="flex items-center justify-between pr-0 md:pr-4 pt-3 md:pt-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider">
                      Hospital Target
                    </p>
                    <h4 className="text-xs font-extrabold text-gray-900">City Care ER Bay 3</h4>
                    <p className="text-[10px] text-emerald-700 font-mono font-bold mt-0.5">
                      ETA: 4 min • 1.8 km
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCommChannelModal("hospital")}
                  className="rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 text-[10px] font-bold text-gray-800 transition-all cursor-pointer shrink-0"
                >
                  View Hospital
                </button>
              </div>

              {/* Section 2: Receiving Doctor */}
              <div className="flex items-center justify-between px-0 md:px-4 pt-3 md:pt-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider">
                      Receiving Doctor
                    </p>
                    <h4 className="text-xs font-extrabold text-gray-900">Dr. Ankit Sharma</h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mt-0.5">
                      <span>Emergency Physician</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-emerald-700 font-bold">Connected</span>
                    </div>
                  </div>
                </div>
                <a
                  href="tel:+919876543210"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-[10px] font-bold text-white transition-all cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <Phone className="h-3 w-3" />
                  <span>Call</span>
                </a>
              </div>

              {/* Section 3: Nearby Volunteer */}
              <div className="flex items-center justify-between pl-0 md:pl-4 pt-3 md:pt-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider">
                      Nearby Volunteer
                    </p>
                    <h4 className="text-xs font-extrabold text-gray-900">VOL-202 (Aarav)</h4>
                    <p className="text-[10px] text-purple-700 font-mono font-bold mt-0.5">
                      120m • En Route
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCommChannelModal("volunteer")}
                  className="rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 text-[10px] font-bold text-purple-700 transition-all cursor-pointer shrink-0"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VEHICLE & FLEET TELEMETRY TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "vehicle" && (
        <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-2 py-2">
          {/* 3-COLUMN RESPONSIVE DASHBOARD LAYOUT */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* ═════════════════════════════════════════════════════════
                LEFT COLUMN: VEHICLE OVERVIEW & RECENT ALERTS
            ═════════════════════════════════════════════════════════ */}
            <div className="space-y-6">
              {/* 1. VEHICLE OVERVIEW — PRIMARY CARD */}
              <div className="group rounded-3xl bg-white p-6 border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider block">
                      Primary Response Vehicle
                    </span>
                    <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                      ALS Unit A-1083
                    </h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-bold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Operational
                  </span>
                </div>

                {/* AMBULANCE VISUAL GRAPHIC */}
                <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-inner flex flex-col items-center justify-center space-y-3 relative overflow-hidden">
                  <div className="absolute top-3 left-3 flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                    <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
                    <span>TELEMETRY SYNCED</span>
                  </div>

                  {/* AMBULANCE SVG ICON WITH PULSE */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 rounded-full bg-[#E63946]/20 blur-lg animate-pulse" />
                    <Ambulance className="h-16 w-16 text-[#E63946] relative z-10 filter drop-shadow-md" />
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-wider text-white">
                      Advanced Life Support Ambulance
                    </p>
                    <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                      Class A Emergency Unit · Grid Node Noida-62
                    </p>
                  </div>
                </div>

                {/* ESSENTIAL VEHICLE DETAILS GRID */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/80 p-3 rounded-2xl border border-gray-200/80">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">
                      Registration
                    </span>
                    <span className="font-mono font-bold text-gray-900 block">DL 1A B 1234</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">
                      Model Year
                    </span>
                    <span className="font-bold text-gray-900 block">2022</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">
                      Unit Type
                    </span>
                    <span className="font-bold text-purple-700 block">ALS (Heavy Trauma)</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">
                      Fleet ID
                    </span>
                    <span className="font-mono font-bold text-blue-700 block">ALS-1083</span>
                  </div>
                </div>

                {/* COMPACT STATUS CHIPS */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                    Sub-System Telemetry Status
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 p-2 text-[11px] font-bold text-gray-800">
                      <span>GPS Signal</span>
                      <span className="flex items-center gap-1 text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                        Online
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 p-2 text-[11px] font-bold text-gray-800">
                      <span>Engine Status</span>
                      <span className="flex items-center gap-1 text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> On
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 p-2 text-[11px] font-bold text-gray-800">
                      <span>Cabin AC</span>
                      <span className="flex items-center gap-1 text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> On
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 p-2 text-[11px] font-bold text-gray-800">
                      <span>Access Doors</span>
                      <span className="flex items-center gap-1 text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Locked
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 8. RECENT ALERTS & NOTIFICATIONS */}
              <div className="group rounded-3xl bg-white p-6 border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Recent Alerts &amp; Notifications
                  </h3>
                  <span className="text-[10px] font-mono text-gray-400">3 Logs</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* Warning alert */}
                  <div className="rounded-2xl bg-amber-50/90 border border-amber-200/90 p-3 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950">Low Fuel Alert</span>
                        <span className="text-[9px] text-amber-700 font-mono">10m ago</span>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Fuel level is below 70%. Currently reading 68% (~240 km range remaining).
                      </p>
                    </div>
                  </div>

                  {/* Normal alert */}
                  <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200/80 p-3 flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950">Tire Pressure Normal</span>
                        <span className="text-[9px] text-emerald-700 font-mono">25m ago</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        All tire pressure levels are normal. All 4 tires at 35 PSI.
                      </p>
                    </div>
                  </div>

                  {/* Informational alert */}
                  <div className="rounded-2xl bg-blue-50/80 border border-blue-200/80 p-3 flex items-start gap-2.5">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-950">System Check Completed</span>
                        <span className="text-[9px] text-blue-700 font-mono">1h ago</span>
                      </div>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        All systems are functioning normally with 100% operational readiness.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════
                CENTER COLUMN: TELEMETRY, HEALTH & MAINTENANCE
            ═════════════════════════════════════════════════════════ */}
            <div className="space-y-6">
              {/* 3. VEHICLE TELEMETRY */}
              <div className="group rounded-3xl bg-white p-6 border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#E63946]" />
                    Vehicle Telemetry
                  </h3>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Speed */}
                  <div className="rounded-2xl bg-gray-50/80 p-3 border border-gray-200/90 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase">
                      <span>Speed</span>
                      <span className="text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Optimal
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-gray-900">45</span>
                      <span className="text-[10px] font-bold text-gray-500">km/h</span>
                    </div>
                  </div>

                  {/* Battery */}
                  <div className="rounded-2xl bg-gray-50/80 p-3 border border-gray-200/90 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase">
                      <span>Battery</span>
                      <span className="text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Normal
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-gray-900">14.2</span>
                      <span className="text-[10px] font-bold text-gray-500">V</span>
                    </div>
                  </div>

                  {/* Engine Temperature */}
                  <div className="rounded-2xl bg-gray-50/80 p-3 border border-gray-200/90 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase">
                      <span>Engine Temp</span>
                      <span className="text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Healthy
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-gray-900">86</span>
                      <span className="text-[10px] font-bold text-gray-500">°C</span>
                    </div>
                  </div>

                  {/* Odometer */}
                  <div className="rounded-2xl bg-gray-50/80 p-3 border border-gray-200/90 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase">
                      <span>Odometer</span>
                      <span className="text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Normal
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black text-gray-900 font-mono">24,560</span>
                      <span className="text-[10px] font-bold text-gray-500">km</span>
                    </div>
                  </div>
                </div>

                {/* RPM Metric */}
                <div className="rounded-2xl bg-gray-50/80 p-3 border border-gray-200/90 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase block">
                      Engine RPM
                    </span>
                    <span className="text-base font-black text-gray-900">
                      1,850 <span className="text-[10px] font-bold text-gray-500">rpm</span>
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    Optimal Range
                  </span>
                </div>
              </div>

              {/* 4. VEHICLE SYSTEM HEALTH */}
              <div className="group rounded-3xl bg-white p-6 border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-600" />
                    System Health
                  </h3>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    All Systems Operational
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { title: "Engine", status: "Healthy" },
                    { title: "Brakes", status: "Normal" },
                    { title: "Tires", status: "Good" },
                    { title: "Lights", status: "Operational" },
                    { title: "Siren", status: "Ready" },
                    { title: "AC", status: "On" },
                  ].map((sys) => (
                    <div
                      key={sys.title}
                      className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200/90 p-2.5"
                    >
                      <span className="font-bold text-gray-800 text-[11px]">{sys.title}</span>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        {sys.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. MAINTENANCE & SERVICE */}
              <div className="group rounded-3xl bg-white p-6 border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-purple-600" />
                    Maintenance &amp; Service
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      toast.info("Service history log: Last inspection passed 12 Aug 2026.")
                    }
                    className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
                  >
                    View Service History
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-purple-50/40 p-3 rounded-2xl border border-purple-100">
                  <div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase block">
                      Next Service Due
                    </span>
                    <span className="font-bold text-purple-900 block">3,240 km</span>
                    <span className="text-[10px] text-gray-500 font-medium">or 25 Aug 2026</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase block">
                      Last Service
                    </span>
                    <span className="font-bold text-gray-900 block">12 Aug 2026</span>
                    <span className="text-[10px] text-gray-500 font-medium">at 21,320 km</span>
                  </div>
                </div>

                {/* HEALTH INDICATORS */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "Engine Oil", status: "Good" },
                    { label: "Brake Pads", status: "Good" },
                    { label: "Air Filter", status: "Good" },
                    { label: "Coolant", status: "Good" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 p-2 text-[11px]"
                    >
                      <span className="text-gray-600 font-medium">{item.label}</span>
                      <span className="font-extrabold text-emerald-700">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════
                RIGHT COLUMN: FUEL, LOCATION & DOCUMENTS
            ═════════════════════════════════════════════════════════ */}
            <div className="space-y-6">
              {/* 5. FUEL & RANGE */}
              <div className="group rounded-3xl bg-white p-6 border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-amber-500" />
                    Fuel &amp; Range
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      toast.info("Fuel History: Refueled 60L on 14 Aug 2026 @ HP Station.")
                    }
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    View Fuel History
                  </button>
                </div>

                {/* FUEL LEVEL & PROGRESS BAR */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Fuel Level
                      </span>
                      <span className="text-2xl font-black text-gray-900">68%</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Estimated Range
                      </span>
                      <span className="text-base font-black text-blue-600">~240 km</span>
                    </div>
                  </div>

                  {/* HORIZONTAL FUEL BAR */}
                  <div className="h-3.5 w-full rounded-full bg-gray-100 p-0.5 border border-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-600 transition-all duration-500"
                      style={{ width: "68%" }}
                    />
                  </div>
                </div>

                {/* FUEL SPECS GRID */}
                <div className="grid grid-cols-3 gap-2 text-xs bg-gray-50 p-3 rounded-2xl border border-gray-200 text-center">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">
                      Fuel Type
                    </span>
                    <span className="font-bold text-gray-900 block">Diesel</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">
                      Tank Capacity
                    </span>
                    <span className="font-bold text-gray-900 block">80 L</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase block">
                      Consumption
                    </span>
                    <span className="font-bold text-gray-900 block">12.5 km/L</span>
                  </div>
                </div>
              </div>

              {/* 6. CURRENT LOCATION */}
              <div className="group rounded-3xl bg-white p-6 border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#E63946]" />
                    Current Location
                  </h3>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="rounded-2xl bg-slate-900 text-white p-4 space-y-1 border border-slate-800">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                      <span>ALS Unit A-1083</span>
                      <span className="text-emerald-400 font-bold">FIXED (12 Satellites)</span>
                    </div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5 pt-0.5">
                      Sector 62 Market, Noida, UP
                    </h4>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-200 text-center font-mono">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Latitude
                      </span>
                      <span className="font-bold text-gray-900 block text-[11px]">28.6621° N</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Longitude
                      </span>
                      <span className="font-bold text-gray-900 block text-[11px]">77.4505° E</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Altitude
                      </span>
                      <span className="font-bold text-gray-900 block text-[11px]">212 m</span>
                    </div>
                  </div>

                  {/* VIEW ON MAP BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      setTab("navigation");
                      toast.success("Switched to Live Navigation Map!");
                    }}
                    className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 py-3 text-xs font-bold text-white hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  >
                    <Navigation className="h-4 w-4" />
                    <span>View on Map</span>
                  </button>
                </div>
              </div>

              {/* 9. DOCUMENTS & INSURANCE */}
              <div className="group rounded-3xl bg-white p-6 border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    Documents &amp; Insurance
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      toast.info("All 4 vehicle compliance certificates are active and verified.")
                    }
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    View All Documents
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {[
                    { name: "Insurance", expiry: "Valid thru Dec 2026" },
                    { name: "Fitness Certificate", expiry: "Valid thru Oct 2026" },
                    { name: "Pollution Certificate", expiry: "Valid thru Nov 2026" },
                    { name: "Registration Certificate", expiry: "Valid (Permanent)" },
                  ].map((doc) => (
                    <div
                      key={doc.name}
                      className="flex items-center justify-between rounded-2xl bg-gray-50 border border-gray-200 p-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold text-gray-900 text-[11px]">{doc.name}</p>
                          <p className="text-[10px] text-gray-500">{doc.expiry}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Valid
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MISSION HISTORY TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "history" && (
        <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-2 py-2">
          {/* 2-COLUMN RESPONSIVE LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ═════════════════════════════════════════════════════════
                LEFT SECTION (~65-70% WIDTH): SUMMARY & MISSION LIST
            ═════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-6">
                {/* SECTION TITLE & FILTER CONTROL */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <History className="h-5 w-5 text-[#E63946]" />
                      Mission History
                    </h2>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">
                      Previous emergency responses and mission records.
                    </p>
                  </div>

                  {/* FILTER DROPDOWN */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-gray-400" />
                    <select
                      value={historyFilter}
                      onChange={(e) => setHistoryFilter(e.target.value as any)}
                      className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E63946]/20 cursor-pointer"
                    >
                      <option value="ALL">All Missions</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ABORTED">Aborted</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* 3 COMPACT SUMMARY CARDS */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-blue-50/70 border border-blue-200/80 p-3.5 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-blue-800">
                        Total Missions
                      </p>
                      <p className="text-base font-black text-blue-950">14</p>
                      <p className="text-[9px] font-medium text-blue-700">All time missions</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-3.5 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-emerald-800">Completed</p>
                      <p className="text-base font-black text-emerald-950">12</p>
                      <p className="text-[9px] font-medium text-emerald-700">85.7% success rate</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-purple-50/70 border border-purple-200/80 p-3.5 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-purple-800">
                        Avg Response
                      </p>
                      <p className="text-base font-black text-purple-950">8.4 min</p>
                      <p className="text-[9px] font-medium text-purple-700">Dispatch to hospital</p>
                    </div>
                  </div>
                </div>

                {/* RECENT MISSIONS LIST */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">
                    Recent Missions
                  </h3>

                  <div className="space-y-2.5">
                    {filteredMissions.map((m) => {
                      const isSelected = m.id === selectedMissionId;

                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMissionId(m.id)}
                          className={cn(
                            "group rounded-2xl p-4 border transition-all duration-150 cursor-pointer flex flex-wrap items-center justify-between gap-3",
                            isSelected
                              ? "bg-slate-900 text-white border-slate-800 shadow-sm"
                              : "bg-white text-gray-900 border-gray-200 hover:border-gray-300 hover:shadow-xs hover:-translate-y-0.5",
                          )}
                        >
                          {/* LEFT METADATA */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span
                                className={cn(
                                  "font-mono font-black px-2 py-0.5 rounded text-[11px]",
                                  isSelected
                                    ? "bg-slate-800 text-white border border-slate-700"
                                    : "bg-gray-100 text-gray-900 border border-gray-200",
                                )}
                              >
                                {m.id}
                              </span>
                              <h4 className="font-extrabold text-sm">{m.type}</h4>
                            </div>

                            <p
                              className={cn(
                                "text-xs font-medium flex items-center gap-1",
                                isSelected ? "text-gray-300" : "text-gray-600",
                              )}
                            >
                              <span>{m.pickup}</span>
                              <ArrowRight className="h-3 w-3 shrink-0" />
                              <span>{m.destination}</span>
                            </p>

                            <p
                              className={cn(
                                "text-[10px] font-medium",
                                isSelected ? "text-gray-400" : "text-gray-400",
                              )}
                            >
                              {m.dateTime} · Response Time: {m.responseTime}
                            </p>
                          </div>

                          {/* RIGHT STATUS & ACTION */}
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border",
                                m.status === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : m.status === "ABORTED"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-red-50 text-red-700 border-red-200",
                              )}
                            >
                              {m.status}
                            </span>

                            <span
                              className={cn(
                                "text-xs font-bold flex items-center gap-1 transition-transform duration-150 group-hover:translate-x-1",
                                isSelected ? "text-[#E63946]" : "text-blue-600",
                              )}
                            >
                              View Details <ArrowRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PAGINATION BAR */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 text-xs text-gray-500 font-bold">
                  <span>Showing 1–{filteredMissions.length} of 14 missions</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {[1, 2, 3].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setHistoryPage(p)}
                        className={cn(
                          "h-8 w-8 rounded-xl font-bold transition-all cursor-pointer",
                          historyPage === p
                            ? "bg-[#E63946] text-white shadow-xs"
                            : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
                        )}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={historyPage === 3}
                      onClick={() => setHistoryPage((p) => Math.min(3, p + 1))}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════
                RIGHT SECTION (~30-35% WIDTH): MISSION DETAILS & TIMELINE
            ═════════════════════════════════════════════════════════ */}
            <div className="space-y-6">
              <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-6">
                {/* SECTION HEADER */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#E63946]" />
                    Mission Details
                  </h3>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border",
                      selectedMissionRecord.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : selectedMissionRecord.status === "ABORTED"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-red-50 text-red-700 border-red-200",
                    )}
                  >
                    {selectedMissionRecord.status}
                  </span>
                </div>

                {/* DETAILS METADATA LIST */}
                <div className="space-y-2 text-xs">
                  <div className="rounded-2xl bg-gray-50 p-3.5 border border-gray-200/80 space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        Mission ID
                      </span>
                      <span className="font-mono font-black text-gray-900">
                        {selectedMissionRecord.id}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        Emergency Type
                      </span>
                      <span className="font-bold text-gray-900">{selectedMissionRecord.type}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px]">
                      <span className="text-gray-500 font-medium">Pickup Location</span>
                      <span className="font-bold text-gray-900 truncate max-w-[170px]">
                        {selectedMissionRecord.pickup}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px]">
                      <span className="text-gray-500 font-medium">Destination</span>
                      <span className="font-bold text-gray-900 truncate max-w-[170px]">
                        {selectedMissionRecord.destination}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px]">
                      <span className="text-gray-500 font-medium">Dispatch Time</span>
                      <span className="font-bold text-gray-900">
                        {selectedMissionRecord.dispatchTime}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px]">
                      <span className="text-gray-500 font-medium">Arrival at Scene</span>
                      <span className="font-bold text-gray-900">
                        {selectedMissionRecord.arrivalScene}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px]">
                      <span className="text-gray-500 font-medium">Patient Stabilized</span>
                      <span className="font-bold text-gray-900">
                        {selectedMissionRecord.patientStabilized}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px]">
                      <span className="text-gray-500 font-medium">Arrival at Hospital</span>
                      <span className="font-bold text-gray-900">
                        {selectedMissionRecord.arrivalHospital}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px]">
                      <span className="text-gray-500 font-medium">Handover Complete</span>
                      <span className="font-bold text-gray-900">
                        {selectedMissionRecord.handoverComplete}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 text-[11px]">
                      <span className="text-purple-800 font-medium">Response Time</span>
                      <span className="font-black text-purple-950">
                        {selectedMissionRecord.responseTime}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px]">
                      <span className="text-gray-500 font-medium">Distance</span>
                      <span className="font-bold text-gray-900">
                        {selectedMissionRecord.distance}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px]">
                      <span className="text-gray-500 font-medium">Hospital</span>
                      <span className="font-bold text-gray-900 truncate max-w-[170px]">
                        {selectedMissionRecord.hospital}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[11px]">
                      <span className="text-gray-500 font-medium">Crew</span>
                      <span className="font-bold text-gray-900 font-mono">
                        {selectedMissionRecord.crew}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 9. MISSION TIMELINE */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#E63946]" />
                    Mission Timeline
                  </h4>

                  <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200 text-xs">
                    {selectedMissionRecord.timeline.map((step, idx) => (
                      <div key={idx} className="relative flex items-center justify-between">
                        <span
                          className={cn(
                            "absolute -left-5 top-0.5 h-3 w-3 rounded-full border-2 border-white",
                            step.done ? "bg-emerald-500 ring-2 ring-emerald-100" : "bg-gray-300",
                          )}
                        />
                        <span
                          className={cn("font-bold", step.done ? "text-gray-900" : "text-gray-400")}
                        >
                          {step.label}
                        </span>
                        <span className="font-mono text-[10px] text-gray-500">{step.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PROFILE TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "profile" &&
        (() => {
          const profile = getProfile("ambulance");
          const name = getDisplayName("ambulance", user);
          const { logout } = useAuth();

          const handleLogout = () => {
            if (logout) {
              logout();
            }
            clearSession();
            localStorage.removeItem("aegis_user");
            localStorage.removeItem("aegis_token");
            toast.success("Logout successful");
            window.location.href = "/login";
          };

          return (
            <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-2 py-2">
              {/* 1. HERO & QUICK ACTIONS ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* PROFILE HERO CARD */}
                <div className="lg:col-span-2 rounded-3xl bg-white p-6 border border-gray-200 shadow-sm flex flex-col justify-between space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#E63946]/10 text-2xl font-black text-[#E63946] border border-[#E63946]/20 shrink-0">
                        {name
                          ? name
                              .split(" ")
                              .map((s) => s[0])
                              .slice(0, 2)
                              .join("")
                          : "S"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-black text-gray-900 capitalize">{name}</h2>
                          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-600 mt-0.5 flex items-center gap-2">
                          <span className="text-[#E63946]">ALS Unit A-1083</span>
                          <span>•</span>
                          <span className="font-mono text-gray-500">Driver License: DL-9012</span>
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-right border border-slate-800 shrink-0">
                      <span className="text-[9px] font-bold uppercase text-gray-400 block">
                        System ID
                      </span>
                      <span className="font-mono text-xs font-black text-emerald-400 block">
                        EMT-A1083-GRID7
                      </span>
                    </div>
                  </div>

                  {/* COMPACT METADATA ROW */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/80">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Role
                      </span>
                      <span className="font-bold text-gray-900 block">EMT &amp; Driver</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Employee ID
                      </span>
                      <span className="font-mono font-bold text-blue-700 block">EMT-A1083</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Joined On
                      </span>
                      <span className="font-bold text-gray-900 block">12 Jan 2024</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Contact
                      </span>
                      <span className="font-mono font-bold text-gray-900 block">
                        +91 98765 43210
                      </span>
                    </div>
                  </div>
                </div>

                {/* QUICK ACTIONS CARD */}
                <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="border-b border-gray-100 pb-3">
                    <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[#E63946]" />
                      Quick Actions
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Responder account settings &amp; authorization
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <ProfileEdit role="ambulance" />
                    <ProfileSettings role="ambulance" />
                    <SecuritySettings role="ambulance" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-2xl bg-[#E63946] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#C32F3A] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="h-4 w-4 stroke-[2.5]" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. PROFILE INFO & SHIFT INFO ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* PROFILE INFORMATION CARD (2 COLUMNS) */}
                <div className="lg:col-span-2 rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-5">
                  <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                    <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <User className="h-4 w-4 text-[#E63946]" />
                      Profile Information
                    </h3>
                    <span className="text-[10px] font-mono text-gray-400">Verified Identity</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    {/* LEFT COLUMN */}
                    <div className="space-y-3">
                      <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-200/80">
                        <span className="text-[9px] font-bold uppercase text-gray-400 block">
                          Full Name
                        </span>
                        <span className="font-bold text-gray-900 text-xs block mt-0.5">
                          Sahil Sharma
                        </span>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-200/80">
                        <span className="text-[9px] font-bold uppercase text-gray-400 block">
                          Email Address
                        </span>
                        <span className="font-bold text-gray-900 text-xs block mt-0.5">
                          sahil.ambulance@aegis.gov.in
                        </span>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-200/80">
                        <span className="text-[9px] font-bold uppercase text-gray-400 block">
                          Date of Birth
                        </span>
                        <span className="font-bold text-gray-900 text-xs block mt-0.5">
                          14 Mar 1994
                        </span>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-200/80">
                        <span className="text-[9px] font-bold uppercase text-gray-400 block">
                          Gender
                        </span>
                        <span className="font-bold text-gray-900 text-xs block mt-0.5">Male</span>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-200/80">
                        <span className="text-[9px] font-bold uppercase text-gray-400 block">
                          Blood Group
                        </span>
                        <span className="font-bold text-red-600 text-xs block mt-0.5">
                          O+ Positive
                        </span>
                      </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-3 md:border-l md:border-gray-100 md:pl-6">
                      <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-200/80">
                        <span className="text-[9px] font-bold uppercase text-gray-400 block">
                          Address
                        </span>
                        <span className="font-bold text-gray-900 text-xs block mt-0.5">
                          Sector 62, Noida, UP
                        </span>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-200/80">
                        <span className="text-[9px] font-bold uppercase text-gray-400 block">
                          Emergency Contact
                        </span>
                        <span className="font-mono font-bold text-gray-900 text-xs block mt-0.5">
                          +91 98112 34567
                        </span>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-200/80">
                        <span className="text-[9px] font-bold uppercase text-gray-400 block">
                          Aadhaar Number
                        </span>
                        <span className="font-mono font-bold text-gray-900 text-xs block mt-0.5">
                          •••• •••• 8842
                        </span>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-200/80">
                        <span className="text-[9px] font-bold uppercase text-gray-400 block">
                          Qualification
                        </span>
                        <span className="font-bold text-gray-900 text-xs block mt-0.5">
                          B.Sc. Paramedical Science
                        </span>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-200/80">
                        <span className="text-[9px] font-bold uppercase text-gray-400 block">
                          Languages
                        </span>
                        <span className="font-bold text-gray-900 text-xs block mt-0.5">
                          English, Hindi
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SHIFT & OPERATIONAL INFO */}
                <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-5 flex flex-col justify-between">
                  <div className="border-b border-gray-100 pb-3">
                    <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-600" />
                      Shift &amp; Operational Info
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Active duty schedule &amp; roster details
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="rounded-2xl bg-purple-50/70 p-3.5 border border-purple-200/80 space-y-1">
                      <span className="text-[9px] font-bold text-purple-800 uppercase block">
                        Shift Schedule
                      </span>
                      <span className="font-black text-purple-950 text-sm block">
                        06:00 – 18:00 (Day Shift)
                      </span>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3 border border-gray-200 space-y-0.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Next Shift
                      </span>
                      <span className="font-bold text-gray-900 block">16 Aug 2026, 06:00 AM</span>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3 border border-gray-200 space-y-0.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Total Duty Hours
                      </span>
                      <span className="font-mono font-bold text-gray-900 block">
                        156 hrs 30 mins
                      </span>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3 border border-gray-200 space-y-0.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">
                        Weekly Off
                      </span>
                      <span className="font-bold text-emerald-700 block">Sunday</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. LOWER INFORMATION CARDS (3 COLUMNS) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* CARD 1 — GPS & TELEMETRY */}
                <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-900 tracking-tight flex items-center gap-2 uppercase">
                      <Radio className="h-4 w-4 text-emerald-600" />
                      GPS &amp; Telemetry
                    </h3>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[9px] font-extrabold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Online
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                      <span className="text-gray-500 font-medium">GPS Telemetry ID</span>
                      <span className="font-mono font-bold text-gray-900">Grid-7 Alpha</span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                      <span className="text-gray-500 font-medium">Status</span>
                      <span className="font-bold text-emerald-600">Online &amp; Active</span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                      <span className="text-gray-500 font-medium">Last Sync</span>
                      <span className="font-mono font-bold text-gray-900">
                        15 Aug 2026, 12:58 PM
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD 2 — CERTIFICATIONS */}
                <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-900 tracking-tight flex items-center gap-2 uppercase">
                      <Award className="h-4 w-4 text-purple-600" />
                      Certifications
                    </h3>
                    <span className="text-[10px] font-bold text-purple-700">3 Verified</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {["BLS Certification", "ACLS Certification", "PHTLS Certification"].map(
                      (cert) => (
                        <div
                          key={cert}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200"
                        >
                          <span className="font-bold text-gray-900">{cert}</span>
                          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[9px] font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Valid
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* CARD 3 — EQUIPMENT ASSIGNED */}
                <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                    <h3 className="text-xs font-black text-gray-900 tracking-tight flex items-center gap-2 uppercase">
                      <Wrench className="h-4 w-4 text-blue-600" />
                      Equipment Assigned
                    </h3>
                    <span className="text-[10px] font-bold text-blue-700">4 Items</span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between p-2 rounded-xl bg-gray-50 border border-gray-200 text-[11px]">
                      <span className="text-gray-500 font-sans">Radio ID</span>
                      <span className="font-bold text-gray-900">RAD-A1083</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-xl bg-gray-50 border border-gray-200 text-[11px]">
                      <span className="text-gray-500 font-sans">Tablet ID</span>
                      <span className="font-bold text-gray-900">TAB-A1083</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-xl bg-gray-50 border border-gray-200 text-[11px]">
                      <span className="text-gray-500 font-sans">Kit ID</span>
                      <span className="font-bold text-gray-900">KIT-A1083</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-xl bg-gray-50 border border-gray-200 text-[11px]">
                      <span className="text-gray-500 font-sans">Vehicle ID</span>
                      <span className="font-bold text-gray-900">UP 14 0001</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. SYSTEM & APP INFO */}
              <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-4">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    System &amp; App Info
                  </h3>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                    Active Session
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-2xl bg-gray-50 p-3 border border-gray-200">
                    <span className="text-[9px] font-bold uppercase text-gray-400 block">
                      App Version
                    </span>
                    <span className="font-mono font-bold text-gray-900 text-xs block mt-0.5">
                      v2.4.1
                    </span>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3 border border-gray-200">
                    <span className="text-[9px] font-bold uppercase text-gray-400 block">
                      Last Login
                    </span>
                    <span className="font-bold text-gray-900 text-xs block mt-0.5">
                      15 Aug 2026, 09:12 AM
                    </span>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3 border border-gray-200">
                    <span className="text-[9px] font-bold uppercase text-gray-400 block">
                      Login Device
                    </span>
                    <span className="font-bold text-gray-900 text-xs block mt-0.5">
                      Windows • Chrome
                    </span>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-3 border border-gray-200">
                    <span className="text-[9px] font-bold uppercase text-gray-400 block">
                      Session Status
                    </span>
                    <span className="font-bold text-emerald-600 text-xs block mt-0.5">
                      Active &amp; Secured
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. ACTIVITY SUMMARY (FULL WIDTH) */}
              <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-4">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#E63946]" />
                    Activity Summary
                  </h3>
                  <span className="text-[10px] font-mono text-gray-400">
                    All-Time Operational Metrics
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center text-xs">
                  <div className="rounded-2xl bg-blue-50/70 p-3.5 border border-blue-200/80">
                    <span className="text-[9px] font-bold text-blue-800 uppercase block">
                      Total Missions
                    </span>
                    <span className="text-xl font-black text-blue-950 block mt-0.5">142</span>
                  </div>
                  <div className="rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-200/80">
                    <span className="text-[9px] font-bold text-emerald-800 uppercase block">
                      Completed
                    </span>
                    <span className="text-xl font-black text-emerald-950 block mt-0.5">131</span>
                  </div>
                  <div className="rounded-2xl bg-amber-50/70 p-3.5 border border-amber-200/80">
                    <span className="text-[9px] font-bold text-amber-800 uppercase block">
                      Aborted
                    </span>
                    <span className="text-xl font-black text-amber-950 block mt-0.5">6</span>
                  </div>
                  <div className="rounded-2xl bg-red-50/70 p-3.5 border border-red-200/80">
                    <span className="text-[9px] font-bold text-red-800 uppercase block">
                      Cancelled
                    </span>
                    <span className="text-xl font-black text-red-950 block mt-0.5">5</span>
                  </div>
                  <div className="rounded-2xl bg-purple-50/70 p-3.5 border border-purple-200/80">
                    <span className="text-[9px] font-bold text-purple-800 uppercase block">
                      Avg Response
                    </span>
                    <span className="text-xl font-black text-purple-950 block mt-0.5">8.4 min</span>
                  </div>
                  <div className="rounded-2xl bg-teal-50/70 p-3.5 border border-teal-200/80">
                    <span className="text-[9px] font-bold text-teal-800 uppercase block">
                      Handovers
                    </span>
                    <span className="text-xl font-black text-teal-950 block mt-0.5">126</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Communication Channel Modal */}
      {commChannelModal && (
        <Dialog open={true} onOpenChange={() => setCommChannelModal(null)}>
          <DialogContent className="sm:max-w-md bg-white p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <Radio className="h-5 w-5 animate-pulse" />
                <span>Inter-Agency Channel: {commChannelModal.toUpperCase()}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-xs text-gray-600">
                Connecting secure audio &amp; data channel to{" "}
                {commChannelModal === "command"
                  ? "Command Center Dispatch"
                  : commChannelModal === "hospital"
                    ? "City Care ER Trauma Desk"
                    : "Volunteer VOL-202"}
                ...
              </p>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs font-mono text-emerald-600 text-center font-bold">
                ● CHANNEL LOCKED · ENCRYPTED STREAM
              </div>
              <button
                type="button"
                onClick={() => {
                  toast.success(`Communication dispatched to ${commChannelModal.toUpperCase()}`);
                  setCommChannelModal(null);
                }}
                className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-black hover:bg-amber-400"
              >
                Transmit Audio Message
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AmbulanceShell>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[9px] font-bold uppercase text-gray-400">{k}</dt>
      <dd className="font-extrabold text-gray-900 text-xs mt-0.5">{v}</dd>
    </div>
  );
}
