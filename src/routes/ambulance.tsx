import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Ambulance,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Fuel,
  Gauge,
  HeartPulse,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Radio,
  Shield,
  Siren,
  Timer,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { SectionCard, SeverityBadge, StatCard } from "@/components/design-system";
import { AmbulanceShell, type AmbulanceTab } from "@/components/roles/ambulance-shell";
import { LiveMap } from "@/components/live-map";
import ProfileHeader from "@/components/profile/profile-header";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { getProfile, getDisplayName } from "@/lib/profile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  { stage: "en-route-patient", label: "EN ROUTE TO PATIENT", actionLabel: "Mark Arrived at Patient" },
  { stage: "arrived-patient", label: "ARRIVED AT PATIENT", actionLabel: "Mark Patient Stabilized" },
  { stage: "patient-stabilized", label: "PATIENT STABILIZED", actionLabel: "Start Hospital Transfer" },
  { stage: "en-route-hospital", label: "EN ROUTE TO HOSPITAL", actionLabel: "Mark Hospital Arrival" },
  { stage: "arrived-hospital", label: "ARRIVED AT HOSPITAL", actionLabel: "Complete ER Handover" },
  { stage: "handover-complete", label: "ER HANDOVER COMPLETE", actionLabel: "Mission Complete — Return to Station" },
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
  const [commChannelModal, setCommChannelModal] = useState<"command" | "hospital" | "volunteer" | null>(null);

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

  const mapProps = {
    showCorridor: true,
    route: { from: [15, 80] as [number, number], via: [[35, 65], [55, 50]] as [number, number][], to: [80, 20] as [number, number] },
    markers: [
      { id: "pat", type: "emergency" as const, x: 15, y: 80, label: "Patient (Sector 62)", active: true },
      { id: "us", type: "ambulance" as const, x: stageIndex >= 5 ? 65 : stageIndex >= 3 ? 20 : 35, y: stageIndex >= 5 ? 35 : stageIndex >= 3 ? 75 : 60, label: "Unit A-1083", active: true },
      { id: "h", type: "hospital" as const, x: 80, y: 20, label: "City Care Trauma Hub" },
      { id: "vol", type: "volunteer" as const, x: 18, y: 78, label: "VOL-202 (CPR)" },
    ],
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
            <p className="font-bold text-emerald-400 mt-0.5 font-mono text-sm">{calculatedEtaMin} min</p>
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
          MISSION / NAVIGATION TAB
      ═══════════════════════════════════════════════════════════════ */}
      {(tab === "mission" || tab === "navigation") && (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-gray-200">
            <LiveMap className="min-h-[50vh] rounded-none border-0" {...mapProps} />
            <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-white/95 backdrop-blur-md p-4 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase text-gray-500">Next Priority Navigation Maneuver</p>
                  <p className="text-sm font-bold text-gray-900">Turn Right onto NH-24 Green Corridor Bypass</p>
                </div>
                <span className="rounded-lg bg-blue-50 text-blue-600 px-3 py-1.5 text-sm font-bold border border-blue-100">
                  400m
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Communication Options */}
            <SectionCard title="Direct Communication Center" description="Instant audio & dispatch channels">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCommChannelModal("command")}
                  className="rounded-xl border border-gray-200 bg-white p-3 text-center hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <Radio className="mx-auto h-5 w-5 text-gray-700" />
                  <p className="text-xs font-bold text-gray-900 mt-1">Command Dispatch</p>
                  <p className="text-[9px] text-gray-500">Direct Line</p>
                </button>

                <button
                  type="button"
                  onClick={() => setCommChannelModal("hospital")}
                  className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-center hover:bg-blue-50 transition-colors shadow-sm"
                >
                  <Building2 className="mx-auto h-5 w-5 text-blue-600" />
                  <p className="text-xs font-bold text-gray-900 mt-1">City Care ER</p>
                  <p className="text-[9px] text-blue-600 font-bold">Trauma Desk</p>
                </button>

                <button
                  type="button"
                  onClick={() => setCommChannelModal("volunteer")}
                  className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 text-center hover:bg-purple-50 transition-colors shadow-sm"
                >
                  <Users className="mx-auto h-5 w-5 text-purple-600" />
                  <p className="text-xs font-bold text-gray-900 mt-1">VOL-202 Aarav</p>
                  <p className="text-[9px] text-purple-600 font-bold">120m away</p>
                </button>
              </div>
            </SectionCard>

            {/* Volunteer Coordination Card */}
            <SectionCard title="On-Scene Volunteer Coordination" description="Citizen responder active at location">
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
                  "Patient collapsed near Sector 62 market main entry. CPR cycle 2 active. AED retrieved from Metro Gate 2."
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
                    className="flex-1 rounded-lg border border-purple-300 bg-white py-1.5 text-[10px] font-bold text-purple-700 hover:bg-purple-50"
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
          PATIENT TELEMETRY TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "patient" && (
        <div className="space-y-4 max-w-3xl">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Heart Rate", value: vitals.hr, unit: "bpm", color: "text-[#E63946]" },
              { label: "SpO₂ Saturation", value: vitals.spo2, unit: "%", color: "text-blue-600" },
              { label: "Blood Pressure", value: vitals.bp, unit: "mmHg", color: "text-emerald-600" },
            ].map((v) => (
              <div key={v.label} className="rounded-2xl bg-white p-4 text-center border border-gray-200 shadow-sm">
                <p className="text-[9px] font-bold uppercase text-gray-500">{v.label}</p>
                <p className={`mt-1 text-2xl font-black font-mono ${v.color}`}>{v.value}</p>
                <p className="text-[10px] text-gray-400">{v.unit}</p>
              </div>
            ))}
          </div>

          <SectionCard title="Patient Clinical File" description="Live telemetry streaming to City Care ER">
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <Field k="Age / Sex" v="56 Years / Male" />
              <Field k="Chief Complaint" v="Sudden Collapse & Chest Distress" />
              <Field k="Severity Classification" v="CRITICAL (Level 1 Trauma)" />
              <Field k="Assigned Destination" v="City Care Hospital · ER Bay 3" />
              <Field k="GCS Score" v="14 / 15 (Responsive to voice)" />
              <Field k="Known Allergies" v="None reported by family" />
            </dl>
          </SectionCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VEHICLE & FLEET TELEMETRY TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "vehicle" && (
        <div className="space-y-4 max-w-3xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Fuel Level" value="68%" hint="~240 km operational range" icon={Fuel} accent="warning" />
            <StatCard label="Vehicle Status" value="Operational" hint="ALS Unit A-1083 · Telemetry Active" icon={Gauge} accent="success" />
          </div>

          <SectionCard title="Ambulance Crew Roster" description="ALS Response Unit A-1083">
            {[
              { name: "Vivaan Sharma", role: "Lead EMT & Driver", status: "On Mission" },
              { name: "Neha Kapoor", role: "Paramedic Specialist", status: "On Mission" },
            ].map((member) => (
              <div key={member.name} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-xs font-bold text-gray-900">{member.name}</p>
                    <p className="text-[10px] text-gray-500">{member.role}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[9px] font-bold border border-emerald-200">
                  {member.status}
                </span>
              </div>
            ))}
          </SectionCard>

          <SectionCard title="Equipment & Lifesaving Inventory">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {["AED Defibrillator", "Ventilator Unit", "Oxygen Supply", "Stretcher System", "Trauma Rescue Kit", "ECG Monitor"].map((eq) => (
                <div key={eq} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                  <span className="font-semibold text-gray-800">{eq}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PROFILE TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "profile" && (() => {
        const profile = getProfile("ambulance");
        const name = getDisplayName("ambulance", user);

        return (
          <div className="space-y-4 max-w-lg mx-auto">
            <ProfileHeader name={name} subtitle="ALS Unit A-1083 · Driver License DL-9012" role="ambulance" />
            <div className="space-y-2">
              {[
                { label: "Shift Schedule", value: "06:00 – 18:00 (Day Shift)" },
                { label: "GPS Telemetry ID", value: "Grid-7 Alpha" },
                { label: "Green Corridors Activated", value: "847 Activations" },
              ].map((row) => (
                <div key={row.label} className="rounded-2xl bg-white p-4 border border-gray-200 shadow-sm">
                  <p className="text-[9px] font-bold uppercase text-gray-500">{row.label}</p>
                  <p className="text-xs font-bold text-gray-900 mt-0.5">{row.value}</p>
                </div>
              ))}
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
                Connecting secure audio &amp; data channel to {commChannelModal === "command" ? "Command Center Dispatch" : commChannelModal === "hospital" ? "City Care ER Trauma Desk" : "Volunteer VOL-202"}...
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
