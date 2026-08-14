import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Bed,
  BedDouble,
  Brain,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  HeartPulse,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { SectionCard, SeverityBadge, StatCard } from "@/components/design-system";
import { HospitalShell, type HospitalTab } from "@/components/roles/hospital-shell";
import ProfileHeader from "@/components/profile/profile-header";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { getProfile, getDisplayName } from "@/lib/profile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/hospital")({
  head: () => ({ meta: [{ title: "Hospital Operations Center · AEGIS" }] }),
  component: HospitalPortal,
});

export type CasePrepStage =
  | "incoming"
  | "acknowledged"
  | "preparing-er"
  | "team-ready"
  | "arrived"
  | "er-handover"
  | "icu-trauma";

const PREP_WORKFLOW_STEPS: { stage: CasePrepStage; label: string; actionLabel: string }[] = [
  { stage: "incoming", label: "INCOMING", actionLabel: "Acknowledge Case" },
  { stage: "acknowledged", label: "ACKNOWLEDGED", actionLabel: "Prepare ER Bay 3" },
  { stage: "preparing-er", label: "PREPARING ER BAY", actionLabel: "Confirm Team Ready" },
  { stage: "team-ready", label: "TEAM READY", actionLabel: "Mark Patient Arrived" },
  { stage: "arrived", label: "PATIENT ARRIVED", actionLabel: "Complete ER Handover" },
  { stage: "er-handover", label: "ER HANDOVER", actionLabel: "Transfer to ICU / Trauma" },
  { stage: "icu-trauma", label: "TRANSFERRED TO ICU", actionLabel: "Case Admitted & Active" },
];

interface IncomingCase {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  ambulanceId: string;
  ambulanceDriver: string;
  victims: number;
  location: string;
  eta: number; // minutes
  vitals: { hr: number; spo2: number; bp: string; gcs: number };
  requiredTreatment: string;
  icuRequired: boolean;
  traumaLevelRequired: string;
  ventilatorRequired: boolean;
  stage: CasePrepStage;
  isLiveFeed: boolean;
}

const occupancyData = [
  { hour: "06", er: 45, icu: 72 },
  { hour: "09", er: 68, icu: 80 },
  { hour: "12", er: 82, icu: 85 },
  { hour: "15", er: 74, icu: 78 },
  { hour: "18", er: 86, icu: 88 },
  { hour: "21", er: 62, icu: 75 },
];

function HospitalPortal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role?.toLowerCase() !== "hospital")) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  const [tab, setTab] = useState<HospitalTab>("overview");
  const [traumaAvailability, setTraumaAvailability] = useState<"accepting" | "caution" | "diversion">("accepting");

  // Detailed bed breakdown
  const [beds, setBeds] = useState({
    icuTotal: 20,
    icuOccupied: 12,
    icuReserved: 3,
    icuFree: 5,
    erTotal: 24,
    erOccupied: 14,
    erReserved: 2,
    erFree: 8,
    erCleaning: 2,
    otTotal: 6,
    otOccupied: 4,
    otFree: 2,
  });

  const [incomingCases, setIncomingCases] = useState<IncomingCase[]>([
    {
      id: "EMG-1258",
      type: "Cardiac Distress / Acute STEMI",
      severity: "critical",
      ambulanceId: "AMB-1083",
      ambulanceDriver: "Vivaan Sharma",
      victims: 1,
      location: "Sector 62 Crossing, Noida",
      eta: 4,
      vitals: { hr: 94, spo2: 91, bp: "145/95", gcs: 14 },
      requiredTreatment: "Cath Lab, Emergency Defibrillator, O2 High Flow",
      icuRequired: true,
      traumaLevelRequired: "Level 1 Cardiac Trauma Bay",
      ventilatorRequired: true,
      stage: "preparing-er",
      isLiveFeed: true,
    },
    {
      id: "EMG-1262",
      type: "Road Traffic Accident (Polytrauma)",
      severity: "high",
      ambulanceId: "AMB-1094",
      ambulanceDriver: "Arjun Singh",
      victims: 2,
      location: "NH-24 Hindon Bridge",
      eta: 8,
      vitals: { hr: 112, spo2: 95, bp: "110/70", gcs: 12 },
      requiredTreatment: "X-Ray, Trauma Surgical Team, Blood Unit O−",
      icuRequired: true,
      traumaLevelRequired: "Level 1 Trauma Surgical Bay",
      ventilatorRequired: false,
      stage: "incoming",
      isLiveFeed: false,
    },
  ]);

  const [commTarget, setCommTarget] = useState<string | null>(null);

  if (isLoading || !isAuthenticated || user?.role?.toLowerCase() !== "hospital") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-6 w-6 animate-ping bg-blue-600 rounded-full" />
      </div>
    );
  }

  // Readiness Score Breakdown Math
  const icuFactor = Math.round((beds.icuFree / beds.icuTotal) * 100);
  const erFactor = Math.round((beds.erFree / beds.erTotal) * 100);
  const equipmentFactor = 88; // 88% equipment ready
  const staffFactor = 90; // 90% staff on duty
  const readinessScore = Math.round(icuFactor * 0.35 + erFactor * 0.3 + staffFactor * 0.2 + equipmentFactor * 0.15);
  const earliestEta =
    incomingCases.length > 0 ? Math.min(...incomingCases.map((c) => c.eta)) : null;
  const profile = getProfile("hospital");
  const displayName = getDisplayName("hospital", user);
  const hospitalLabel = profile.hospitalName || displayName;

  const handleAdvanceCaseWorkflow = (caseId: string) => {
    setIncomingCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          const currentIdx = PREP_WORKFLOW_STEPS.findIndex((s) => s.stage === c.stage);
          if (currentIdx >= PREP_WORKFLOW_STEPS.length - 1) {
            toast.info(`${c.id}: Case workflow is already at the final stage.`);
            return c;
          }
          const nextStage = PREP_WORKFLOW_STEPS[currentIdx + 1].stage;
          toast.success(`${c.id}: Case workflow advanced to ${PREP_WORKFLOW_STEPS[currentIdx + 1].label}`);
          return { ...c, stage: nextStage };
        }
        return c;
      })
    );
  };

  const handleDivertCase = (caseId: string) => {
    setIncomingCases((prev) => prev.filter((c) => c.id !== caseId));
    toast.error(`Case ${caseId} diverted to next available hospital in grid.`);
  };

  const handleToggleTraumaStatus = () => {
    if (traumaAvailability === "accepting") {
      setTraumaAvailability("caution");
      toast.warning("Hospital status changed to CAUTION: High ER Occupancy.");
    } else if (traumaAvailability === "caution") {
      setTraumaAvailability("diversion");
      toast.error("Hospital status changed to TRAUMA DIVERSION: Emergency cases diverted.");
    } else {
      setTraumaAvailability("accepting");
      toast.success("Hospital status changed to ACCEPTING TRAUMA: Full operations.");
    }
  };

  return (
    <HospitalShell
      activeTab={tab}
      onTabChange={setTab}
      statusBadge={
        <button
          type="button"
          onClick={handleToggleTraumaStatus}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-all border cursor-pointer ${
            traumaAvailability === "accepting"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : traumaAvailability === "caution"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {traumaAvailability === "accepting" && "● Accepting Trauma (Level 1)"}
          {traumaAvailability === "caution" && "⚠️ High Occupancy (Caution)"}
          {traumaAvailability === "diversion" && "⛔ Trauma Diversion Active"}
        </button>
      }
    >
      {/* ═══════════════════════════════════════════════════════════════
          OPERATIONS CENTER HEADER BANNER
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 border border-blue-800 rounded-2xl p-5 mb-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-800/80 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-wide uppercase">
                AEGIS Emergency Hospital Operations Center
              </h1>
              <p className="text-xs text-blue-200 mt-0.5">
                City Care Hospital · Level 1 Trauma Center · Grid Node #HSP-10
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 font-bold text-emerald-300">
              ● Grid Connection Online
            </span>
            <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-3 py-1 font-mono font-bold text-blue-300">
              Readiness: {readinessScore}%
            </span>
          </div>
        </div>

        {/* Operational Metrics Header Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs text-center">
          <div className="bg-blue-950/60 p-3 rounded-xl border border-blue-800/60">
            <p className="text-[9px] font-bold text-blue-300 uppercase">Incoming Ambulances</p>
            <p className="text-xl font-black text-white mt-0.5">{incomingCases.length}</p>
            <p className="text-[9px] text-emerald-400 font-bold">
              {earliestEta !== null ? `Earliest ETA: ${earliestEta} min` : "No incoming cases"}
            </p>
          </div>

          <div className="bg-blue-950/60 p-3 rounded-xl border border-blue-800/60">
            <p className="text-[9px] font-bold text-blue-300 uppercase">ICU Capacity</p>
            <p className="text-xl font-black text-amber-400 mt-0.5">{beds.icuFree} / {beds.icuTotal}</p>
            <p className="text-[9px] text-gray-300 font-semibold">{beds.icuReserved} Reserved</p>
          </div>

          <div className="bg-blue-950/60 p-3 rounded-xl border border-blue-800/60">
            <p className="text-[9px] font-bold text-blue-300 uppercase">ER Bays Capacity</p>
            <p className="text-xl font-black text-blue-400 mt-0.5">{beds.erFree} / {beds.erTotal}</p>
            <p className="text-[9px] text-gray-300 font-semibold">{beds.erReserved} Reserved</p>
          </div>

          <div className="bg-blue-950/60 p-3 rounded-xl border border-blue-800/60">
            <p className="text-[9px] font-bold text-blue-300 uppercase">Operating Theatres</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">{beds.otFree} / {beds.otTotal}</p>
            <p className="text-[9px] text-emerald-400 font-bold">2 Ready for Surgery</p>
          </div>

          <div className="bg-blue-950/60 p-3 rounded-xl border border-blue-800/60">
            <p className="text-[9px] font-bold text-blue-300 uppercase">On-Duty Trauma Crew</p>
            <p className="text-xl font-black text-white mt-0.5">18</p>
            <p className="text-[9px] text-blue-300 font-semibold">4 Surgeons Ready</p>
          </div>

          <div className="bg-blue-950/60 p-3 rounded-xl border border-blue-800/60">
            <p className="text-[9px] font-bold text-blue-300 uppercase">Hospital Agent Status</p>
            <p className="text-xs font-extrabold text-emerald-400 mt-1">ACTIVE</p>
            <p className="text-[9px] text-gray-300">Bay 3 Pre-Allocated</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB 1: OVERVIEW & INCOMING CASES WORKFLOW
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Incoming Cases & Workflow Controls */}
          <SectionCard
            title="Incoming Ambulance Cases & Hospital Prep Workflow"
            description="Real-time telemetry and preparation steps for en-route ambulances"
            actions={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCommTarget("Command Center Dispatch")}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-slate-50"
                >
                  Contact Command Center
                </button>
              </div>
            }
          >
            {incomingCases.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <p className="text-sm font-bold text-gray-900">No incoming critical ambulance cases</p>
                <p className="text-xs text-gray-500">Hospital trauma bays are ready on standby.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {incomingCases.map((c) => {
                  const currentPrep = PREP_WORKFLOW_STEPS.find((s) => s.stage === c.stage) ?? PREP_WORKFLOW_STEPS[0];
                  const currentIdx = PREP_WORKFLOW_STEPS.findIndex((s) => s.stage === c.stage);
                  const isFinalStage = currentIdx >= PREP_WORKFLOW_STEPS.length - 1;

                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border-2 border-blue-200 bg-white p-5 shadow-sm space-y-4"
                    >
                      {/* Case Header */}
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-gray-900">{c.id}</span>
                            <SeverityBadge severity={c.severity} />
                            {c.isLiveFeed ? (
                              <span className="rounded bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                                LIVE TELEMETRY FEED
                              </span>
                            ) : (
                              <span className="rounded bg-gray-100 text-gray-600 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                                DEMO SIMULATION
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-extrabold text-gray-900">{c.type}</h3>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#E63946]" /> {c.location}
                          </p>
                        </div>

                        <div className="text-right space-y-1">
                          <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 text-xs font-extrabold flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> ETA {c.eta} min
                          </span>
                          <p className="text-[10px] text-gray-500 font-mono font-bold mt-1">
                            Ambulance: {c.ambulanceId} ({c.ambulanceDriver})
                          </p>
                        </div>
                      </div>

                      {/* Vitals & Requirements Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Live Vitals Telemetry</p>
                          <p className="font-mono font-bold text-gray-900 mt-0.5">
                            HR {c.vitals.hr} · SpO₂ {c.vitals.spo2}%
                          </p>
                          <p className="font-mono text-[10px] text-gray-600">BP {c.vitals.bp} · GCS {c.vitals.gcs}</p>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Required Resources</p>
                          <p className="font-semibold text-gray-900 mt-0.5">{c.requiredTreatment}</p>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">ICU &amp; Trauma Requirement</p>
                          <p className="font-bold text-amber-700 mt-0.5">{c.traumaLevelRequired}</p>
                          <p className="text-[10px] text-gray-600">{c.icuRequired ? "ICU Bed Reserved" : "General ER Bay"}</p>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">Ventilator Needed</p>
                          <p className={`font-bold mt-0.5 ${c.ventilatorRequired ? "text-red-600" : "text-gray-600"}`}>
                            {c.ventilatorRequired ? "YES (Unit Ready)" : "No"}
                          </p>
                        </div>
                      </div>

                      {/* Interactive Prep Stepper */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Hospital Preparation Workflow</p>
                          <span className="text-[10px] font-bold text-blue-600">Stage: {currentPrep.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                          {PREP_WORKFLOW_STEPS.map((s, idx) => (
                            <div
                              key={s.stage}
                              className={`shrink-0 rounded-lg px-2.5 py-1 text-[9px] font-extrabold border transition-all ${
                                currentIdx === idx
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : idx < currentIdx
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                  : "bg-gray-50 border-gray-200 text-gray-400"
                              }`}
                            >
                              {s.label}
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => handleAdvanceCaseWorkflow(c.id)}
                            disabled={isFinalStage}
                            aria-label={`Advance workflow for case ${c.id}`}
                            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span>
                              {isFinalStage ? "Case Admitted & Active" : `Action: ${currentPrep.actionLabel}`}
                            </span>
                            {!isFinalStage && <ChevronRight className="h-4 w-4" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => setCommTarget(`Ambulance ${c.ambulanceId}`)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-slate-50 flex items-center gap-1"
                          >
                            <Phone className="h-3.5 w-3.5 text-blue-600" /> Contact Driver
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDivertCase(c.id)}
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100"
                          >
                            Divert Case
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Hospital Readiness Breakdown & Agent Advice */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Readiness Score Calculation Explanation */}
            <SectionCard title="Hospital Readiness Score Breakdown" description={`Overall Score: ${readinessScore}%`}>
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>ICU Availability Weight (35%)</span>
                    <span className="text-amber-600">{icuFactor}% ({beds.icuFree} free)</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${icuFactor}%` }} />
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>ER Bays Availability Weight (30%)</span>
                    <span className="text-blue-600">{erFactor}% ({beds.erFree} free)</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${erFactor}%` }} />
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>Trauma Staff Readiness Weight (20%)</span>
                    <span className="text-emerald-600">{staffFactor}% (18 on duty)</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${staffFactor}%` }} />
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>Equipment &amp; Ventilators Weight (15%)</span>
                    <span className="text-purple-600">{equipmentFactor}% Ready</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${equipmentFactor}%` }} />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Hospital Agent Recommendations */}
            <SectionCard title="Hospital Agent AI Advice" description="Intelligent capacity management recommendations">
              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-600 animate-pulse" />
                    <span className="font-extrabold text-blue-900 uppercase">ER Bay 3 Pre-Allocation</span>
                  </div>
                  <p className="text-blue-950 leading-relaxed font-medium">
                    Hospital Agent automatically pre-allocated ER Bay 3 for incoming STEMI case EMG-1258 based on proximity to Cath Lab.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="font-extrabold text-amber-900 uppercase">ICU Bed Reservation Advisory</span>
                  </div>
                  <p className="text-amber-950 leading-relaxed font-medium">
                    Reserve ICU Bed 4 for polytrauma case EMG-1262 arriving in 8 min. 3 ICU beds remaining in Trauma Ward B.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 2: BEDS & ER BAYS CAPACITY
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "beds" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="ICU Total" value={beds.icuTotal} hint={`${beds.icuFree} Free · ${beds.icuReserved} Reserved`} icon={BedDouble} accent="warning" />
            <StatCard label="ER Bays Total" value={beds.erTotal} hint={`${beds.erFree} Free · ${beds.erCleaning} Sanitizing`} icon={Bed} accent="medical" />
            <StatCard label="Operating Theatres" value={beds.otTotal} hint={`${beds.otFree} Free for Emergency Surgery`} icon={Activity} accent="success" />
            <StatCard label="General Ward Beds" value="180" hint="32 Free" icon={Building2} accent="default" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="ER Bays Status Matrix" description="Real-time bay utilization">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 text-center text-xs">
                {Array.from({ length: beds.erTotal }, (_, i) => {
                  const bayNum = i + 1;
                  const isOccupied = i < beds.erOccupied;
                  const isReserved = !isOccupied && i < beds.erOccupied + beds.erReserved;
                  const isCleaning = !isOccupied && !isReserved && i < beds.erOccupied + beds.erReserved + beds.erCleaning;

                  return (
                    <div
                      key={bayNum}
                      className={`rounded-xl p-3 border font-bold transition-all ${
                        isOccupied
                          ? "bg-red-50 border-red-200 text-red-700"
                          : isReserved
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : isCleaning
                          ? "bg-purple-50 border-purple-200 text-purple-700"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700"
                      }`}
                    >
                      <p className="text-[10px] uppercase">Bay {bayNum}</p>
                      <p className="text-xs mt-1">
                        {isOccupied ? "Occupied" : isReserved ? "Reserved" : isCleaning ? "Cleaning" : "Free"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="ICU Beds Status Matrix" description="Trauma & Cardiac ICU Ward">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 text-center text-xs">
                {Array.from({ length: beds.icuTotal }, (_, i) => {
                  const bedNum = i + 1;
                  const isOccupied = i < beds.icuOccupied;
                  const isReserved = !isOccupied && i < beds.icuOccupied + beds.icuReserved;
                  const isFree = !isOccupied && !isReserved;

                  return (
                    <div
                      key={bedNum}
                      className={`rounded-xl p-3 border font-bold transition-all ${
                        isOccupied
                          ? "bg-red-50 border-red-200 text-red-700"
                          : isReserved
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700"
                      }`}
                    >
                      <p className="text-[10px] uppercase">ICU {bedNum}</p>
                      <p className="text-xs mt-1">
                        {isOccupied ? "Occupied" : isReserved ? "Reserved" : "Free"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 3: STAFF & ON-CALL TEAMS
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "staff" && (
        <SectionCard title="Emergency Trauma Staff & On-Call Roster" description="Personnel ready for incoming cases">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-[10px] font-bold uppercase text-[#525866]">
                <th className="pb-3">Name</th>
                <th className="pb-3">Specialty / Role</th>
                <th className="pb-3">Shift</th>
                <th className="pb-3">Assigned Case</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Dr. Karan Verma", role: "Lead Trauma Surgeon", shift: "06:00–14:00", assigned: "EMG-1262 (Polytrauma)", status: "In Surgery", ok: false },
                { name: "Dr. Meera Iyer", role: "ER Cardiologist", shift: "08:00–20:00", assigned: "EMG-1258 (STEMI)", status: "Team Ready", ok: true },
                { name: "S. Nurse Ananya Nair", role: "Trauma Coordinator", shift: "07:00–19:00", assigned: "ER Bay 3 Prep", status: "Available", ok: true },
                { name: "Dr. Rakesh Verma", role: "Triage Director", shift: "08:00–20:00", assigned: "Emergency Triage", status: "Available", ok: true },
              ].map((s) => (
                <tr key={s.name} className="border-b border-[#E5E7EB]">
                  <td className="py-3.5 font-bold text-[#111111]">{s.name}</td>
                  <td className="py-3.5 text-xs text-[#525866]">{s.role}</td>
                  <td className="py-3.5 font-mono text-xs text-[#525866]">{s.shift}</td>
                  <td className="py-3.5 text-xs font-semibold text-gray-900">{s.assigned}</td>
                  <td className="py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${s.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 4: EQUIPMENT & RESOURCES
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "resources" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Lifesaving Equipment Readiness">
            {[
              { name: "Ventilator Units", used: 12, total: 16 },
              { name: "Emergency Defibrillators", used: 4, total: 8 },
              { name: "Portable X-Ray & Scanners", used: 2, total: 3 },
              { name: "Cath Lab Angiography", used: 1, total: 2 },
            ].map((eq) => (
              <div key={eq.name} className="mb-4 last:mb-0 space-y-1">
                <div className="flex justify-between text-xs font-bold text-[#111111]">
                  <span>{eq.name}</span>
                  <span>{eq.used} / {eq.total} Active</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full bg-blue-600" style={{ width: `${(eq.used / eq.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </SectionCard>

          <SectionCard title="Blood Bank &amp; Oxygen Reserves">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-center">
                <p className="text-[10px] font-bold uppercase text-gray-500">O− Blood Units</p>
                <p className="text-3xl font-black text-red-600 mt-1">14</p>
                <p className="text-[10px] text-red-700 font-bold mt-1">Universal Supply Ready</p>
              </div>

              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                <p className="text-[10px] font-bold uppercase text-gray-500">Oxygen Central Supply</p>
                <p className="text-3xl font-black text-emerald-600 mt-1">88%</p>
                <p className="text-[10px] text-emerald-700 font-bold mt-1">Tank Pressure Normal</p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "patients" && (
        <div className="space-y-6">
          <SectionCard title="Active & Incoming Patients" description="Cases currently in transit or under hospital care">
            {incomingCases.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <HeartPulse className="mx-auto h-10 w-10 text-blue-600" />
                <p className="text-sm font-bold text-gray-900">No active patient cases</p>
                <p className="text-xs text-gray-500">Incoming and admitted patients will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomingCases.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
                    <div>
                      <p className="text-xs font-mono font-black text-gray-900">{c.id}</p>
                      <p className="text-sm font-bold text-gray-900">{c.type}</p>
                      <p className="text-xs text-gray-500">{c.victims} victim(s) · {c.location}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={c.severity} />
                      <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap">
                        {(PREP_WORKFLOW_STEPS.find((s) => s.stage === c.stage) ?? PREP_WORKFLOW_STEPS[0]).label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Readiness Score" value={`${readinessScore}%`} hint="Composite trauma readiness" icon={Activity} accent="medical" />
            <StatCard label="Incoming Cases" value={incomingCases.length} hint="Active ambulance handovers" icon={Ambulance} accent="warning" />
            <StatCard label="ICU Utilization" value={`${Math.round((beds.icuOccupied / beds.icuTotal) * 100)}%`} hint={`${beds.icuFree} beds free`} icon={BedDouble} accent="warning" />
            <StatCard label="ER Utilization" value={`${Math.round((beds.erOccupied / beds.erTotal) * 100)}%`} hint={`${beds.erFree} bays free`} icon={Bed} accent="success" />
          </div>

          <SectionCard title="Occupancy Trends (24h)" description="ER bays and ICU ward utilization">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={occupancyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="er" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} name="ER Bays %" />
                  <Area type="monotone" dataKey="icu" stroke="#D97706" fill="#D97706" fillOpacity={0.15} name="ICU Beds %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-6 max-w-2xl">
          <SectionCard title="Hospital Operations Settings" description="Configure trauma center alerts and capacity reporting">
            <div className="space-y-4 text-sm">
              {[
                { label: "Auto-reserve ICU for critical incoming cases", enabled: true },
                { label: "Push bed capacity updates to AEGIS grid", enabled: true },
                { label: "Enable ambulance live telemetry overlay", enabled: true },
                { label: "Trauma diversion auto-escalation at 90% ER occupancy", enabled: false },
              ].map((setting) => (
                <label key={setting.label} className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-slate-50 p-4">
                  <span className="text-xs font-semibold text-gray-900">{setting.label}</span>
                  <input
                    type="checkbox"
                    defaultChecked={setting.enabled}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label={setting.label}
                  />
                </label>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "profile" && (
        <div className="max-w-xl mx-auto space-y-4">
          <ProfileHeader
            name={displayName}
            subtitle={`${hospitalLabel} · ${profile.hospitalType || "Level 1 Trauma Center"}`}
            role="hospital"
          />
          <div className="space-y-3">
            {[
              { label: "Hospital / Facility", value: hospitalLabel },
              { label: "Registration ID", value: profile.registrationNumber || "Not provided" },
              { label: "Emergency Line", value: profile.emergencyNumber || profile.phone || user?.mobileNumber || "Not provided" },
              { label: "ICU Capacity", value: profile.icuCapacity ? `${profile.icuCapacity} beds` : `${beds.icuTotal} beds (configured)` },
              { label: "ER Capacity", value: profile.erCapacity ? `${profile.erCapacity} bays` : `${beds.erTotal} bays (configured)` },
            ].map((row) => (
              <div key={row.label} className="rounded-xl bg-white p-4 ring-1 ring-[#E5E7EB]">
                <p className="text-[10px] font-bold uppercase text-[#525866]">{row.label}</p>
                <p className="text-sm font-semibold text-[#111111]">{row.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Communication Channel Modal */}
      {commTarget && (
        <Dialog open={true} onOpenChange={() => setCommTarget(null)}>
          <DialogContent className="sm:max-w-md bg-white p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-600">
                <Phone className="h-5 w-5 animate-pulse" />
                <span>Connecting to {commTarget}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-xs text-gray-600">
                Opening direct voice &amp; data channel with {commTarget}...
              </p>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs font-mono text-emerald-600 text-center font-bold">
                ● AUDIO CHANNEL SECURED
              </div>
              <button
                type="button"
                onClick={() => {
                  toast.success(`Message transmitted to ${commTarget}`);
                  setCommTarget(null);
                }}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Transmit Audio Briefing
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </HospitalShell>
  );
}
