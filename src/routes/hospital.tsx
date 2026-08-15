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
  Filter,
  HeartPulse,
  History,
  LogOut,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";
import { SectionCard, SeverityBadge, StatCard } from "@/components/design-system";
import { HospitalShell, type HospitalTab } from "@/components/roles/hospital-shell";
import ProfileHeader from "@/components/profile/profile-header";
import ProfileEdit from "@/components/profile/profile-edit";
import ProfileSettings from "@/components/profile/profile-settings";
import NotificationPreferences from "@/components/profile/notification-preferences";
import SecuritySettings from "@/components/profile/security-settings";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { getProfile, getDisplayName, clearSession } from "@/lib/profile";
import { cn } from "@/lib/utils";
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

export type BedStatus = "free" | "reserved" | "occupied" | "cleaning" | "maintenance";

export interface IndividualBed {
  id: string;
  label: string;
  type: "ER" | "ICU";
  num: number;
  status: BedStatus;
  patientName?: string;
  admissionId?: string;
  assignedDoctor?: string;
  condition?: string;
  assignedTime?: string;
  reservationDate?: string;
  reservationTime?: string;
  expectedDuration?: string;
  cleaningStartedAt?: string;
}

const INITIAL_INDIVIDUAL_BEDS: IndividualBed[] = [
  // 24 ER Bays
  ...Array.from({ length: 24 }, (_, i) => {
    const num = i + 1;
    const isOccupied = i < 14;
    const isReserved = !isOccupied && i < 16;
    const isCleaning = !isOccupied && !isReserved && i < 18;
    const isMaintenance = !isOccupied && !isReserved && !isCleaning && i === 18;

    let status: BedStatus = "free";
    if (isOccupied) status = "occupied";
    else if (isReserved) status = "reserved";
    else if (isCleaning) status = "cleaning";
    else if (isMaintenance) status = "maintenance";

    const patientNames = [
      "Rahul Sharma",
      "Aarav Verma",
      "Priya Patel",
      "Vikram Malhotra",
      "Ananya Roy",
      "Sanjay Kumar",
      "Neha Gupta",
      "Rajesh Verma",
      "Sunita Devi",
      "Deepak Joshi",
      "Pooja Sharma",
      "Amit Kumar",
      "Rohan Kapoor",
      "Meera Reddy",
    ];
    const doctors = ["Dr. Karan Verma", "Dr. Meera Iyer", "Dr. Rakesh Verma", "Dr. A. K. Gupta"];

    return {
      id: `BAY-${num}`,
      label: `Bay ${num}`,
      type: "ER" as const,
      num,
      status,
      patientName: isOccupied
        ? patientNames[i % patientNames.length]
        : isReserved
          ? `Case EMG-12${58 + (i % 5)}`
          : undefined,
      admissionId: isOccupied ? `ADM-${1040 + num}` : undefined,
      assignedDoctor: isOccupied ? doctors[i % doctors.length] : undefined,
      condition: isOccupied ? (i % 2 === 0 ? "Cardiac Emergency" : "Polytrauma Triage") : undefined,
      assignedTime: isOccupied
        ? `${8 + (i % 4)}:${(i * 5) % 60 < 10 ? "0" : ""}${(i * 5) % 60} AM`
        : undefined,
      reservationDate: isReserved ? "15 Aug 2026" : undefined,
      reservationTime: isReserved ? "05:00 PM" : undefined,
      expectedDuration: isReserved ? "2 hrs" : undefined,
      cleaningStartedAt: isCleaning ? "04:15 PM" : undefined,
    };
  }),

  // 20 ICU Beds
  ...Array.from({ length: 20 }, (_, i) => {
    const num = i + 1;
    const isOccupied = i < 12;
    const isReserved = !isOccupied && i < 15;
    const isMaintenance = !isOccupied && !isReserved && i === 15;

    let status: BedStatus = "free";
    if (isOccupied) status = "occupied";
    else if (isReserved) status = "reserved";
    else if (isMaintenance) status = "maintenance";

    const icuPatients = [
      "Karan Singh",
      "Devendra Yadav",
      "Sarla Shah",
      "Vikas Nair",
      "Preeti Agarwal",
      "Manoj Pandey",
      "Geeta Sharma",
      "Alok Gupta",
      "Shalini Mishra",
      "Tarun Sethi",
      "Bhavna Patel",
      "Nitin Sharma",
    ];
    const doctors = ["Dr. Karan Verma", "Dr. Meera Iyer", "Dr. Rakesh Verma"];

    return {
      id: `ICU-${num}`,
      label: `ICU ${num}`,
      type: "ICU" as const,
      num,
      status,
      patientName: isOccupied
        ? icuPatients[i % icuPatients.length]
        : isReserved
          ? `ICU Reserve EMG-12${60 + (i % 3)}`
          : undefined,
      admissionId: isOccupied ? `ICU-ADM-${2010 + num}` : undefined,
      assignedDoctor: isOccupied ? doctors[i % doctors.length] : undefined,
      condition: isOccupied
        ? i % 3 === 0
          ? "Post-Op Cardiac"
          : i % 3 === 1
            ? "Trauma Ventilator Support"
            : "Acute Respiratory"
        : undefined,
      assignedTime: isOccupied ? `0${6 + (i % 3)}:30 AM` : undefined,
      reservationDate: isReserved ? "15 Aug 2026" : undefined,
      reservationTime: isReserved ? "06:30 PM" : undefined,
      expectedDuration: isReserved ? "24 hrs" : undefined,
    };
  }),
];

function HospitalPortal() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role?.toLowerCase() !== "hospital")) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  const [tab, setTab] = useState<HospitalTab>("overview");
  const [traumaAvailability, setTraumaAvailability] = useState<
    "accepting" | "caution" | "diversion"
  >("accepting");

  // Dynamic Bed List & Management State
  const [individualBeds, setIndividualBeds] = useState<IndividualBed[]>(INITIAL_INDIVIDUAL_BEDS);
  const [selectedBed, setSelectedBed] = useState<IndividualBed | null>(null);
  const [bedFilter, setBedFilter] = useState<"all" | BedStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModalAction, setActiveModalAction] = useState<
    "manage" | "reserve" | "occupy" | "free_confirm" | "disallocate_confirm" | null
  >(null);

  // Form states for bed modals
  const [formPatientName, setFormPatientName] = useState("");
  const [formAdmissionId, setFormAdmissionId] = useState("");
  const [formDoctor, setFormDoctor] = useState("Dr. Karan Verma");
  const [formCondition, setFormCondition] = useState("Emergency Trauma");
  const [formResDate, setFormResDate] = useState("15 Aug 2026");
  const [formResTime, setFormResTime] = useState("05:00 PM");
  const [formResDuration, setFormResDuration] = useState("2 hrs");

  // Dynamic Bed Totals (Automatically Computed from individualBeds)
  const erBedsList = individualBeds.filter((b) => b.type === "ER");
  const icuBedsList = individualBeds.filter((b) => b.type === "ICU");

  const beds = {
    icuTotal: icuBedsList.length,
    icuFree: icuBedsList.filter((b) => b.status === "free").length,
    icuReserved: icuBedsList.filter((b) => b.status === "reserved").length,
    icuOccupied: icuBedsList.filter((b) => b.status === "occupied").length,
    erTotal: erBedsList.length,
    erFree: erBedsList.filter((b) => b.status === "free").length,
    erReserved: erBedsList.filter((b) => b.status === "reserved").length,
    erOccupied: erBedsList.filter((b) => b.status === "occupied").length,
    erCleaning: erBedsList.filter((b) => b.status === "cleaning").length,
    otTotal: 6,
    otOccupied: 4,
    otFree: 2,
  };

  const updateBedStatus = (
    bedId: string,
    newStatus: BedStatus,
    extraData?: Partial<IndividualBed>,
  ) => {
    setIndividualBeds((prev) =>
      prev.map((b) => {
        if (b.id === bedId) {
          if (newStatus === "free") {
            return {
              ...b,
              status: "free",
              patientName: undefined,
              admissionId: undefined,
              assignedDoctor: undefined,
              condition: undefined,
              assignedTime: undefined,
              reservationDate: undefined,
              reservationTime: undefined,
              expectedDuration: undefined,
              cleaningStartedAt: undefined,
            };
          }
          return {
            ...b,
            status: newStatus,
            ...extraData,
          };
        }
        return b;
      }),
    );
  };

  const filterAndSearchBeds = (bedsArr: IndividualBed[]) => {
    return bedsArr.filter((b) => {
      const matchesFilter = bedFilter === "all" || b.status === bedFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.label.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q) ||
        (b.patientName && b.patientName.toLowerCase().includes(q)) ||
        (b.admissionId && b.admissionId.toLowerCase().includes(q)) ||
        (b.assignedDoctor && b.assignedDoctor.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  };

  const filteredErBeds = filterAndSearchBeds(erBedsList);
  const filteredIcuBeds = filterAndSearchBeds(icuBedsList);

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
  const readinessScore = Math.round(
    icuFactor * 0.35 + erFactor * 0.3 + staffFactor * 0.2 + equipmentFactor * 0.15,
  );
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
          toast.success(
            `${c.id}: Case workflow advanced to ${PREP_WORKFLOW_STEPS[currentIdx + 1].label}`,
          );
          return { ...c, stage: nextStage };
        }
        return c;
      }),
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
            <p className="text-xl font-black text-amber-400 mt-0.5">
              {beds.icuFree} / {beds.icuTotal}
            </p>
            <p className="text-[9px] text-gray-300 font-semibold">{beds.icuReserved} Reserved</p>
          </div>

          <div className="bg-blue-950/60 p-3 rounded-xl border border-blue-800/60">
            <p className="text-[9px] font-bold text-blue-300 uppercase">ER Bays Capacity</p>
            <p className="text-xl font-black text-blue-400 mt-0.5">
              {beds.erFree} / {beds.erTotal}
            </p>
            <p className="text-[9px] text-gray-300 font-semibold">{beds.erReserved} Reserved</p>
          </div>

          <div className="bg-blue-950/60 p-3 rounded-xl border border-blue-800/60">
            <p className="text-[9px] font-bold text-blue-300 uppercase">Operating Theatres</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">
              {beds.otFree} / {beds.otTotal}
            </p>
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
                <p className="text-sm font-bold text-gray-900">
                  No incoming critical ambulance cases
                </p>
                <p className="text-xs text-gray-500">Hospital trauma bays are ready on standby.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {incomingCases.map((c) => {
                  const currentPrep =
                    PREP_WORKFLOW_STEPS.find((s) => s.stage === c.stage) ?? PREP_WORKFLOW_STEPS[0];
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
                            <span className="text-xs font-mono font-black text-gray-900">
                              {c.id}
                            </span>
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
                          <p className="text-[9px] font-bold text-gray-400 uppercase">
                            Live Vitals Telemetry
                          </p>
                          <p className="font-mono font-bold text-gray-900 mt-0.5">
                            HR {c.vitals.hr} · SpO₂ {c.vitals.spo2}%
                          </p>
                          <p className="font-mono text-[10px] text-gray-600">
                            BP {c.vitals.bp} · GCS {c.vitals.gcs}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">
                            Required Resources
                          </p>
                          <p className="font-semibold text-gray-900 mt-0.5">
                            {c.requiredTreatment}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">
                            ICU &amp; Trauma Requirement
                          </p>
                          <p className="font-bold text-amber-700 mt-0.5">{c.traumaLevelRequired}</p>
                          <p className="text-[10px] text-gray-600">
                            {c.icuRequired ? "ICU Bed Reserved" : "General ER Bay"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">
                            Ventilator Needed
                          </p>
                          <p
                            className={`font-bold mt-0.5 ${c.ventilatorRequired ? "text-red-600" : "text-gray-600"}`}
                          >
                            {c.ventilatorRequired ? "YES (Unit Ready)" : "No"}
                          </p>
                        </div>
                      </div>

                      {/* Interactive Prep Stepper */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Hospital Preparation Workflow
                          </p>
                          <span className="text-[10px] font-bold text-blue-600">
                            Stage: {currentPrep.label}
                          </span>
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
                              {isFinalStage
                                ? "Case Admitted & Active"
                                : `Action: ${currentPrep.actionLabel}`}
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
            <SectionCard
              title="Hospital Readiness Score Breakdown"
              description={`Overall Score: ${readinessScore}%`}
            >
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>ICU Availability Weight (35%)</span>
                    <span className="text-amber-600">
                      {icuFactor}% ({beds.icuFree} free)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${icuFactor}%` }} />
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>ER Bays Availability Weight (30%)</span>
                    <span className="text-blue-600">
                      {erFactor}% ({beds.erFree} free)
                    </span>
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
                    <div
                      className="h-full bg-purple-500"
                      style={{ width: `${equipmentFactor}%` }}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Hospital Agent Recommendations */}
            <SectionCard
              title="Hospital Agent AI Advice"
              description="Intelligent capacity management recommendations"
            >
              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-600 animate-pulse" />
                    <span className="font-extrabold text-blue-900 uppercase">
                      ER Bay 3 Pre-Allocation
                    </span>
                  </div>
                  <p className="text-blue-950 leading-relaxed font-medium">
                    Hospital Agent automatically pre-allocated ER Bay 3 for incoming STEMI case
                    EMG-1258 based on proximity to Cath Lab.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="font-extrabold text-amber-900 uppercase">
                      ICU Bed Reservation Advisory
                    </span>
                  </div>
                  <p className="text-amber-950 leading-relaxed font-medium">
                    Reserve ICU Bed 4 for polytrauma case EMG-1262 arriving in 8 min. 3 ICU beds
                    remaining in Trauma Ward B.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 2: BEDS & ER BAYS INTERACTIVE MANAGEMENT SYSTEM
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "beds" && (
        <div className="space-y-6">
          {/* DYNAMIC AUTOMATED STAT CARDS */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="ICU Total"
              value={beds.icuTotal}
              hint={`${beds.icuFree} Free · ${beds.icuReserved} Reserved`}
              icon={BedDouble}
              accent="warning"
            />
            <StatCard
              label="ER Bays Total"
              value={beds.erTotal}
              hint={`${beds.erFree} Free · ${beds.erCleaning} Sanitizing`}
              icon={Bed}
              accent="medical"
            />
            <StatCard
              label="Operating Theatres"
              value={beds.otTotal}
              hint={`${beds.otFree} Free for Emergency Surgery`}
              icon={Activity}
              accent="success"
            />
            <StatCard
              label="General Ward Beds"
              value="180"
              hint="32 Free"
              icon={Building2}
              accent="default"
            />
          </div>

          {/* CONTROL BAR: SEARCH, LEGEND & STATUS FILTER CHIPS */}
          <div className="rounded-2xl bg-white p-4 border border-gray-200 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Field */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bed or patient (e.g. Bay 15, ICU 4, ADM-1048)..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-2 text-xs font-semibold text-gray-900 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>

              {/* Visual Status Legend */}
              <div className="flex items-center gap-3 text-[11px] font-bold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/80">
                <span className="text-[9px] uppercase tracking-wider text-gray-400">Legend:</span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Free
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Reserved
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Occupied
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-purple-500" /> Cleaning
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-gray-400" /> Maintenance
                </span>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100">
              <span className="text-[10px] font-extrabold uppercase text-gray-400 mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filter Status:
              </span>
              {[
                {
                  key: "all",
                  label: "All Beds",
                  count: individualBeds.length,
                  color: "bg-gray-100 text-gray-800",
                },
                {
                  key: "free",
                  label: "Free",
                  count: individualBeds.filter((b) => b.status === "free").length,
                  color: "bg-emerald-50 text-emerald-700 border-emerald-200",
                },
                {
                  key: "reserved",
                  label: "Reserved",
                  count: individualBeds.filter((b) => b.status === "reserved").length,
                  color: "bg-amber-50 text-amber-700 border-amber-200",
                },
                {
                  key: "occupied",
                  label: "Occupied",
                  count: individualBeds.filter((b) => b.status === "occupied").length,
                  color: "bg-red-50 text-red-700 border-red-200",
                },
                {
                  key: "cleaning",
                  label: "Cleaning",
                  count: individualBeds.filter((b) => b.status === "cleaning").length,
                  color: "bg-purple-50 text-purple-700 border-purple-200",
                },
                {
                  key: "maintenance",
                  label: "Maintenance",
                  count: individualBeds.filter((b) => b.status === "maintenance").length,
                  color: "bg-gray-100 text-gray-600 border-gray-200",
                },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setBedFilter(f.key as any)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                    bedFilter === f.key
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <span>{f.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[9px] font-mono font-bold",
                      bedFilter === f.key ? "bg-white/20 text-white" : f.color,
                    )}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* MATRICES GRID */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* ER BAYS MATRIX */}
            <SectionCard
              title="ER Bays Status Matrix"
              description="Click any bay to manage allocation, reserve, or mark status"
              actions={
                <span className="text-[10px] font-mono text-gray-500">
                  Showing {filteredErBeds.length} of {erBedsList.length} Bays
                </span>
              }
            >
              {filteredErBeds.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No ER Bays match current search or filter.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 text-center text-xs">
                  {filteredErBeds.map((bed) => (
                    <div
                      key={bed.id}
                      onClick={() => {
                        setSelectedBed(bed);
                        setActiveModalAction("manage");
                        setFormPatientName(bed.patientName || "");
                        setFormAdmissionId(
                          bed.admissionId || `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
                        );
                      }}
                      className={cn(
                        "rounded-xl p-3 border font-bold transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between min-h-[74px]",
                        bed.status === "occupied" &&
                          "bg-red-50/80 border-red-200 text-red-800 hover:border-red-300",
                        bed.status === "reserved" &&
                          "bg-amber-50/80 border-amber-200 text-amber-800 hover:border-amber-300",
                        bed.status === "cleaning" &&
                          "bg-purple-50/80 border-purple-200 text-purple-800 hover:border-purple-300",
                        bed.status === "maintenance" &&
                          "bg-gray-100/80 border-gray-300 text-gray-500 opacity-75",
                        bed.status === "free" &&
                          "bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:border-emerald-300",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono tracking-wider">
                          {bed.label}
                        </span>
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            bed.status === "occupied" && "bg-red-500",
                            bed.status === "reserved" && "bg-amber-500 animate-pulse",
                            bed.status === "cleaning" && "bg-purple-500",
                            bed.status === "maintenance" && "bg-gray-400",
                            bed.status === "free" && "bg-emerald-500",
                          )}
                        />
                      </div>

                      <p className="text-xs mt-1 capitalize font-black">{bed.status}</p>

                      <p className="text-[9px] font-normal text-gray-600 truncate mt-0.5">
                        {bed.patientName ||
                          (bed.status === "free"
                            ? "Available"
                            : bed.status === "cleaning"
                              ? "Sanitizing"
                              : "No Assignment")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* ICU BEDS MATRIX */}
            <SectionCard
              title="ICU Beds Status Matrix"
              description="Trauma & Cardiac ICU Ward Bed Allocation"
              actions={
                <span className="text-[10px] font-mono text-gray-500">
                  Showing {filteredIcuBeds.length} of {icuBedsList.length} Beds
                </span>
              }
            >
              {filteredIcuBeds.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No ICU Beds match current search or filter.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 text-center text-xs">
                  {filteredIcuBeds.map((bed) => (
                    <div
                      key={bed.id}
                      onClick={() => {
                        setSelectedBed(bed);
                        setActiveModalAction("manage");
                        setFormPatientName(bed.patientName || "");
                        setFormAdmissionId(
                          bed.admissionId || `ICU-ADM-${Math.floor(2000 + Math.random() * 8000)}`,
                        );
                      }}
                      className={cn(
                        "rounded-xl p-3 border font-bold transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between min-h-[74px]",
                        bed.status === "occupied" &&
                          "bg-red-50/80 border-red-200 text-red-800 hover:border-red-300",
                        bed.status === "reserved" &&
                          "bg-amber-50/80 border-amber-200 text-amber-800 hover:border-amber-300",
                        bed.status === "cleaning" &&
                          "bg-purple-50/80 border-purple-200 text-purple-800 hover:border-purple-300",
                        bed.status === "maintenance" &&
                          "bg-gray-100/80 border-gray-300 text-gray-500 opacity-75",
                        bed.status === "free" &&
                          "bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:border-emerald-300",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono tracking-wider">
                          {bed.label}
                        </span>
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            bed.status === "occupied" && "bg-red-500",
                            bed.status === "reserved" && "bg-amber-500 animate-pulse",
                            bed.status === "cleaning" && "bg-purple-500",
                            bed.status === "maintenance" && "bg-gray-400",
                            bed.status === "free" && "bg-emerald-500",
                          )}
                        />
                      </div>

                      <p className="text-xs mt-1 capitalize font-black">{bed.status}</p>

                      <p className="text-[9px] font-normal text-gray-600 truncate mt-0.5">
                        {bed.patientName ||
                          (bed.status === "free"
                            ? "Available"
                            : bed.status === "cleaning"
                              ? "Sanitizing"
                              : "No Assignment")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 3: STAFF & ON-CALL TEAMS
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "staff" && (
        <SectionCard
          title="Emergency Trauma Staff & On-Call Roster"
          description="Personnel ready for incoming cases"
        >
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
                {
                  name: "Dr. Karan Verma",
                  role: "Lead Trauma Surgeon",
                  shift: "06:00–14:00",
                  assigned: "EMG-1262 (Polytrauma)",
                  status: "In Surgery",
                  ok: false,
                },
                {
                  name: "Dr. Meera Iyer",
                  role: "ER Cardiologist",
                  shift: "08:00–20:00",
                  assigned: "EMG-1258 (STEMI)",
                  status: "Team Ready",
                  ok: true,
                },
                {
                  name: "S. Nurse Ananya Nair",
                  role: "Trauma Coordinator",
                  shift: "07:00–19:00",
                  assigned: "ER Bay 3 Prep",
                  status: "Available",
                  ok: true,
                },
                {
                  name: "Dr. Rakesh Verma",
                  role: "Triage Director",
                  shift: "08:00–20:00",
                  assigned: "Emergency Triage",
                  status: "Available",
                  ok: true,
                },
              ].map((s) => (
                <tr key={s.name} className="border-b border-[#E5E7EB]">
                  <td className="py-3.5 font-bold text-[#111111]">{s.name}</td>
                  <td className="py-3.5 text-xs text-[#525866]">{s.role}</td>
                  <td className="py-3.5 font-mono text-xs text-[#525866]">{s.shift}</td>
                  <td className="py-3.5 text-xs font-semibold text-gray-900">{s.assigned}</td>
                  <td className="py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${s.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}
                    >
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
                  <span>
                    {eq.used} / {eq.total} Active
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${(eq.used / eq.total) * 100}%` }}
                  />
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
                <p className="text-[10px] font-bold uppercase text-gray-500">
                  Oxygen Central Supply
                </p>
                <p className="text-3xl font-black text-emerald-600 mt-1">88%</p>
                <p className="text-[10px] text-emerald-700 font-bold mt-1">Tank Pressure Normal</p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "patients" && (
        <div className="space-y-6">
          <SectionCard
            title="Active & Incoming Patients"
            description="Cases currently in transit or under hospital care"
          >
            {incomingCases.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <HeartPulse className="mx-auto h-10 w-10 text-blue-600" />
                <p className="text-sm font-bold text-gray-900">No active patient cases</p>
                <p className="text-xs text-gray-500">
                  Incoming and admitted patients will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomingCases.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <div>
                      <p className="text-xs font-mono font-black text-gray-900">{c.id}</p>
                      <p className="text-sm font-bold text-gray-900">{c.type}</p>
                      <p className="text-xs text-gray-500">
                        {c.victims} victim(s) · {c.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={c.severity} />
                      <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap">
                        {
                          (
                            PREP_WORKFLOW_STEPS.find((s) => s.stage === c.stage) ??
                            PREP_WORKFLOW_STEPS[0]
                          ).label
                        }
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
            <StatCard
              label="Readiness Score"
              value={`${readinessScore}%`}
              hint="Composite trauma readiness"
              icon={Activity}
              accent="medical"
            />
            <StatCard
              label="Incoming Cases"
              value={incomingCases.length}
              hint="Active ambulance handovers"
              icon={Ambulance}
              accent="warning"
            />
            <StatCard
              label="ICU Utilization"
              value={`${Math.round((beds.icuOccupied / beds.icuTotal) * 100)}%`}
              hint={`${beds.icuFree} beds free`}
              icon={BedDouble}
              accent="warning"
            />
            <StatCard
              label="ER Utilization"
              value={`${Math.round((beds.erOccupied / beds.erTotal) * 100)}%`}
              hint={`${beds.erFree} bays free`}
              icon={Bed}
              accent="success"
            />
          </div>

          <SectionCard
            title="Occupancy Trends (24h)"
            description="ER bays and ICU ward utilization"
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={occupancyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="er"
                    stroke="#2563EB"
                    fill="#2563EB"
                    fillOpacity={0.15}
                    name="ER Bays %"
                  />
                  <Area
                    type="monotone"
                    dataKey="icu"
                    stroke="#D97706"
                    fill="#D97706"
                    fillOpacity={0.15}
                    name="ICU Beds %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-6 max-w-2xl">
          <SectionCard
            title="Hospital Operations Settings"
            description="Configure trauma center alerts and capacity reporting"
          >
            <div className="space-y-4 text-sm">
              {[
                { label: "Auto-reserve ICU for critical incoming cases", enabled: true },
                { label: "Push bed capacity updates to AEGIS grid", enabled: true },
                { label: "Enable ambulance live telemetry overlay", enabled: true },
                { label: "Trauma diversion auto-escalation at 90% ER occupancy", enabled: false },
              ].map((setting) => (
                <label
                  key={setting.label}
                  className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-slate-50 p-4"
                >
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
        <div className="max-w-6xl mx-auto space-y-6 pb-6">
          {/* ═══════════════════════════════════════════════════════════
              1. HOSPITAL PROFILE HEADER CARD
          ═══════════════════════════════════════════════════════════ */}
          <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left: Hospital Identity */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-600/10 border border-blue-600/20 text-2xl font-black text-blue-700 shrink-0 uppercase tracking-wider shadow-inner">
                    ah
                  </div>
                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                </div>

                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">
                      anand hospital
                    </h2>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">
                    Government Trauma Hub · Level 1 Trauma Center
                  </p>
                </div>
              </div>

              {/* Right: Compact Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <ProfileEdit role="hospital" />
                <ProfileSettings role="hospital" />
                <NotificationPreferences role="hospital" />
                <SecuritySettings role="hospital" />
                <button
                  type="button"
                  onClick={() => {
                    if (logout) logout();
                    clearSession();
                    localStorage.removeItem("aegis_user");
                    localStorage.removeItem("aegis_token");
                    toast.success("Logout successful");
                    window.location.href = "/login";
                  }}
                  className="rounded-2xl bg-[#E63946] px-4 py-2 text-xs font-bold text-white hover:bg-[#C32F3A] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <LogOut className="h-4 w-4 stroke-[2.5]" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              2-COLUMN MAIN CONTENT GRID
          ═══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 2. HOSPITAL INFORMATION CARD */}
            <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Hospital Information
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Core facility registration and identity parameters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Hospital / Facility
                  </span>
                  <p className="font-bold text-gray-900">anand hospital</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Hospital Type
                  </span>
                  <p className="font-bold text-gray-900">Government Trauma Hub</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Trauma Level
                  </span>
                  <div>
                    <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block text-[11px]">
                      Level 1
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Registration ID
                  </span>
                  <p className="font-mono font-bold text-gray-900">324443432</p>
                </div>

                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Established On
                  </span>
                  <p className="font-bold text-gray-900">12 Jan 2012</p>
                </div>
              </div>
            </div>

            {/* 3. CONTACT & LOCATION CARD */}
            <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#E63946]" />
                  Contact &amp; Location
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Emergency dispatch lines and geographic location
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Address
                  </span>
                  <p className="font-bold text-gray-900 leading-snug">
                    Sector 62, Noida, Uttar Pradesh 201309
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Phone
                  </span>
                  <p className="font-mono font-bold text-gray-900">+91 120 456 7890</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Email
                  </span>
                  <p className="font-medium text-gray-900 truncate">admin@anandhospital.in</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Emergency Line
                  </span>
                  <p className="font-mono font-extrabold text-[#E63946]">3244444444</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Emergency Contact
                  </span>
                  <p className="font-mono font-bold text-gray-900">+91 120 456 7899</p>
                </div>

                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Coordinates
                  </span>
                  <div>
                    <span className="font-mono font-bold text-gray-700 bg-gray-50 px-2.5 py-1 rounded border border-gray-200 inline-block text-[11px]">
                      28.66°N, 77.45°E
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. DEPARTMENTS CARD */}
            <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  Departments
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Core clinical units and department allocations
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  {
                    name: "Emergency",
                    badge: "24/7",
                    color: "bg-red-50 text-red-700 border-red-200",
                  },
                  {
                    name: "Trauma Care",
                    badge: "24/7",
                    color: "bg-red-50 text-red-700 border-red-200",
                  },
                  {
                    name: "Critical Care",
                    badge: "20 Beds",
                    color: "bg-blue-50 text-blue-700 border-blue-200",
                  },
                  {
                    name: "Orthopedics",
                    badge: "12 Beds",
                    color: "bg-gray-100 text-gray-700 border-gray-200",
                  },
                  {
                    name: "Neurosurgery",
                    badge: "8 Beds",
                    color: "bg-purple-50 text-purple-700 border-purple-200",
                  },
                ].map((dep) => (
                  <div
                    key={dep.name}
                    className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50/80 border border-gray-200"
                  >
                    <span className="font-bold text-gray-900">{dep.name}</span>
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded text-[10px] font-extrabold border",
                        dep.color,
                      )}
                    >
                      {dep.badge}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => toast.info("Navigating to full clinical department directory...")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Departments →</span>
                </button>
              </div>
            </div>

            {/* 5. SYSTEM & ACCOUNT CARD */}
            <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  System &amp; Account
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Portal telemetry and active agent session state
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Hospital Agent Status
                  </span>
                  <div>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Agent Version
                  </span>
                  <p className="font-mono font-bold text-gray-900">v4.6.2026d</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Last Login
                  </span>
                  <p className="font-bold text-gray-900">15 Aug 2026, 04:28 PM</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Login Device
                  </span>
                  <p className="font-semibold text-gray-900">Windows • Chrome</p>
                </div>

                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                    Session Status
                  </span>
                  <div>
                    <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase inline-block">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              6. RECENT ACTIVITY CARD (FULL-WIDTH)
          ═══════════════════════════════════════════════════════════ */}
          <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-4 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <History className="h-4 w-4 text-purple-600" />
                  Recent Activity
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Latest system audit logs and responder events
                </p>
              </div>

              <button
                type="button"
                onClick={() => toast.info("Opening complete system activity log...")}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>View All →</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-gray-50/90 border border-gray-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Ambulance Arrived</span>
                  <span className="text-[9px] text-gray-400 font-mono">10 min ago</span>
                </div>
                <p className="text-[11px] font-medium text-gray-600">
                  UP 14 0001 • Cardiac Distress
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50/90 border border-gray-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Patient Admitted</span>
                  <span className="text-[9px] text-gray-400 font-mono">25 min ago</span>
                </div>
                <p className="text-[11px] font-medium text-gray-600">Trauma • ER Bay 3</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50/90 border border-gray-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Surgery Scheduled</span>
                  <span className="text-[9px] text-gray-400 font-mono">1 hr ago</span>
                </div>
                <p className="text-[11px] font-medium text-gray-600">OT 2 • 06:00 PM</p>
              </div>
            </div>
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

      {/* ═══════════════════════════════════════════════════════════════
          BED & BAY MANAGEMENT MODAL DIALOG
      ═══════════════════════════════════════════════════════════════ */}
      {selectedBed && (
        <Dialog
          open={true}
          onOpenChange={() => {
            setSelectedBed(null);
            setActiveModalAction(null);
          }}
        >
          <DialogContent className="sm:max-w-md bg-white p-6 rounded-3xl border border-gray-200 shadow-xl space-y-4">
            <DialogHeader className="border-b border-gray-100 pb-3">
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-gray-900">{selectedBed.label}</span>
                  <span className="text-xs font-mono text-gray-500">
                    ({selectedBed.type === "ER" ? "ER Emergency Bay" : "Cardiac & Trauma ICU Bed"})
                  </span>
                </div>

                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border flex items-center gap-1",
                    selectedBed.status === "free" &&
                      "bg-emerald-50 text-emerald-700 border-emerald-200",
                    selectedBed.status === "reserved" &&
                      "bg-amber-50 text-amber-700 border-amber-200",
                    selectedBed.status === "occupied" && "bg-red-50 text-red-700 border-red-200",
                    selectedBed.status === "cleaning" &&
                      "bg-purple-50 text-purple-700 border-purple-200",
                    selectedBed.status === "maintenance" &&
                      "bg-gray-100 text-gray-700 border-gray-200",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      selectedBed.status === "free" && "bg-emerald-500",
                      selectedBed.status === "reserved" && "bg-amber-500 animate-pulse",
                      selectedBed.status === "occupied" && "bg-red-500",
                      selectedBed.status === "cleaning" && "bg-purple-500",
                      selectedBed.status === "maintenance" && "bg-gray-400",
                    )}
                  />
                  {selectedBed.status}
                </span>
              </DialogTitle>
            </DialogHeader>

            {/* CURRENT ASSIGNMENT / READOUT INFO */}
            <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200 text-xs space-y-2">
              {selectedBed.status === "occupied" && (
                <>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-500">Patient:</span>
                    <span className="font-bold text-gray-900">
                      {selectedBed.patientName || "Admitted Patient"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-500">Condition:</span>
                    <span className="font-bold text-amber-700">
                      {selectedBed.condition || "Emergency Triage"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-500">Admission ID:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {selectedBed.admissionId || "ADM-1048"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-500">Doctor:</span>
                    <span className="font-bold text-blue-700">
                      {selectedBed.assignedDoctor || "Dr. Mehta"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Assigned Since:</span>
                    <span className="font-mono text-gray-700">
                      {selectedBed.assignedTime || "10:42 AM"}
                    </span>
                  </div>
                </>
              )}

              {selectedBed.status === "reserved" && (
                <>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-500">Reserved For:</span>
                    <span className="font-bold text-amber-800">
                      {selectedBed.patientName || "Incoming Emergency Case"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-500">Reservation Date:</span>
                    <span className="font-bold text-gray-900">
                      {selectedBed.reservationDate || "15 Aug 2026"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                    <span className="text-gray-500">Reservation Time:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {selectedBed.reservationTime || "05:00 PM"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expected Duration:</span>
                    <span className="font-semibold text-gray-700">
                      {selectedBed.expectedDuration || "2 hrs"}
                    </span>
                  </div>
                </>
              )}

              {selectedBed.status === "cleaning" && (
                <div className="text-center py-2 space-y-1">
                  <p className="font-bold text-purple-900 font-mono uppercase tracking-wider">
                    Sanitization &amp; Disinfection In Progress
                  </p>
                  <p className="text-[11px] text-purple-700">
                    Cleaning started at: {selectedBed.cleaningStartedAt || "04:15 PM"}
                  </p>
                </div>
              )}

              {selectedBed.status === "maintenance" && (
                <div className="text-center py-2 space-y-1">
                  <p className="font-bold text-gray-700 font-mono uppercase tracking-wider">
                    Under Technical Maintenance
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Unavailable for patient allocation until cleared
                  </p>
                </div>
              )}

              {selectedBed.status === "free" && (
                <div className="text-center py-2 space-y-1">
                  <p className="font-bold text-emerald-800 font-mono uppercase tracking-wider">
                    Available for Immediate Allocation
                  </p>
                  <p className="text-[11px] text-emerald-600">
                    Sanitized &amp; ready for emergency incoming cases
                  </p>
                </div>
              )}
            </div>

            {/* MODAL STEP 1: ACTIONS GRID */}
            {activeModalAction === "manage" && (
              <div className="space-y-3 pt-1">
                <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                  Select Action:
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Mark Free */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedBed.status === "free") {
                        toast.info(`${selectedBed.label} is already FREE.`);
                      } else {
                        setActiveModalAction("free_confirm");
                      }
                    }}
                    className="rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 font-bold text-emerald-800 hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Mark Free
                  </button>

                  {/* Reserve */}
                  <button
                    type="button"
                    onClick={() => setActiveModalAction("reserve")}
                    className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 font-bold text-amber-800 hover:bg-amber-100 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Clock className="h-4 w-4 text-amber-600" />
                    Reserve Bed
                  </button>

                  {/* Mark Occupied */}
                  <button
                    type="button"
                    onClick={() => setActiveModalAction("occupy")}
                    className="rounded-xl border border-red-300 bg-red-50 p-2.5 font-bold text-red-800 hover:bg-red-100 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <UserCheck className="h-4 w-4 text-red-600" />
                    Mark Occupied
                  </button>

                  {/* Cleaning */}
                  <button
                    type="button"
                    onClick={() => {
                      updateBedStatus(selectedBed.id, "cleaning", {
                        cleaningStartedAt: new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                      });
                      toast.info(`${selectedBed.label} marked as CLEANING.`);
                      setSelectedBed(null);
                      setActiveModalAction(null);
                    }}
                    className="rounded-xl border border-purple-300 bg-purple-50 p-2.5 font-bold text-purple-800 hover:bg-purple-100 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Cleaning
                  </button>

                  {/* Under Maintenance */}
                  <button
                    type="button"
                    onClick={() => {
                      updateBedStatus(selectedBed.id, "maintenance");
                      toast.warning(`${selectedBed.label} marked UNDER MAINTENANCE.`);
                      setSelectedBed(null);
                      setActiveModalAction(null);
                    }}
                    className="rounded-xl border border-gray-300 bg-gray-100 p-2.5 font-bold text-gray-700 hover:bg-gray-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Wrench className="h-4 w-4 text-gray-600" />
                    Maintenance
                  </button>

                  {/* Disallocate */}
                  <button
                    type="button"
                    onClick={() => setActiveModalAction("disallocate_confirm")}
                    className="rounded-xl border border-red-200 bg-white p-2.5 font-bold text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                    Disallocate
                  </button>
                </div>
              </div>
            )}

            {/* MODAL FORM: RESERVE BED */}
            {activeModalAction === "reserve" && (
              <div className="space-y-3 text-xs pt-1">
                <h4 className="font-extrabold text-gray-900 border-b border-gray-100 pb-2">
                  Reserve {selectedBed.label}
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                      Search / Patient Name
                    </label>
                    <input
                      type="text"
                      value={formPatientName}
                      onChange={(e) => setFormPatientName(e.target.value)}
                      placeholder="e.g. Incoming STEMI Case EMG-1258"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs font-semibold text-gray-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                        Reservation Date
                      </label>
                      <input
                        type="text"
                        value={formResDate}
                        onChange={(e) => setFormResDate(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs font-semibold text-gray-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                        Reservation Time
                      </label>
                      <input
                        type="text"
                        value={formResTime}
                        onChange={(e) => setFormResTime(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs font-semibold text-gray-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                      Expected Duration
                    </label>
                    <input
                      type="text"
                      value={formResDuration}
                      onChange={(e) => setFormResDuration(e.target.value)}
                      placeholder="e.g. 2 hrs"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs font-semibold text-gray-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalAction("manage")}
                    className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateBedStatus(selectedBed.id, "reserved", {
                        patientName: formPatientName || "Reserved Emergency Case",
                        reservationDate: formResDate,
                        reservationTime: formResTime,
                        expectedDuration: formResDuration,
                      });
                      toast.success(`${selectedBed.label} is now RESERVED.`);
                      setSelectedBed(null);
                      setActiveModalAction(null);
                    }}
                    className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 py-2 text-xs font-bold text-black cursor-pointer shadow-sm"
                  >
                    Confirm Reservation
                  </button>
                </div>
              </div>
            )}

            {/* MODAL FORM: MARK OCCUPIED */}
            {activeModalAction === "occupy" && (
              <div className="space-y-3 text-xs pt-1">
                <h4 className="font-extrabold text-gray-900 border-b border-gray-100 pb-2">
                  Assign Patient to {selectedBed.label}
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                      Patient Name
                    </label>
                    <input
                      type="text"
                      value={formPatientName}
                      onChange={(e) => setFormPatientName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs font-semibold text-gray-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                      Admission ID
                    </label>
                    <input
                      type="text"
                      value={formAdmissionId}
                      onChange={(e) => setFormAdmissionId(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs font-semibold text-gray-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                        Assigned Doctor
                      </label>
                      <select
                        value={formDoctor}
                        onChange={(e) => setFormDoctor(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs font-semibold text-gray-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="Dr. Karan Verma">Dr. Karan Verma</option>
                        <option value="Dr. Meera Iyer">Dr. Meera Iyer</option>
                        <option value="Dr. Rakesh Verma">Dr. Rakesh Verma</option>
                        <option value="Dr. A. K. Gupta">Dr. A. K. Gupta</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                        Medical Condition
                      </label>
                      <input
                        type="text"
                        value={formCondition}
                        onChange={(e) => setFormCondition(e.target.value)}
                        placeholder="e.g. Cardiac Emergency"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2 text-xs font-semibold text-gray-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalAction("manage")}
                    className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateBedStatus(selectedBed.id, "occupied", {
                        patientName: formPatientName || "Admitted Patient",
                        admissionId: formAdmissionId,
                        assignedDoctor: formDoctor,
                        condition: formCondition,
                        assignedTime: new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                      });
                      toast.success(`${selectedBed.label} marked as OCCUPIED.`);
                      setSelectedBed(null);
                      setActiveModalAction(null);
                    }}
                    className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 py-2 text-xs font-bold text-white cursor-pointer shadow-sm"
                  >
                    Confirm Admission
                  </button>
                </div>
              </div>
            )}

            {/* CONFIRMATION: MARK FREE */}
            {activeModalAction === "free_confirm" && (
              <div className="space-y-3 text-xs text-center py-2">
                <p className="font-extrabold text-gray-900 text-sm">
                  Make {selectedBed.label} available?
                </p>
                <p className="text-gray-500 text-[11px]">
                  This will set bed status to FREE and clear existing patient or reservation data.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalAction("manage")}
                    className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateBedStatus(selectedBed.id, "free");
                      toast.success(`${selectedBed.label} marked FREE and available.`);
                      setSelectedBed(null);
                      setActiveModalAction(null);
                    }}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-bold text-white cursor-pointer shadow-sm"
                  >
                    Mark Free
                  </button>
                </div>
              </div>
            )}

            {/* CONFIRMATION: DISALLOCATE */}
            {activeModalAction === "disallocate_confirm" && (
              <div className="space-y-3 text-xs text-center py-2">
                <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <p className="font-extrabold text-gray-900 text-sm">
                  Disallocate {selectedBed.label}?
                </p>
                <p className="text-red-600 text-[11px] font-medium">
                  Warning: This will remove the current patient or reservation assignment
                  immediately.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalAction("manage")}
                    className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateBedStatus(selectedBed.id, "free");
                      toast.success(`${selectedBed.label} disallocated successfully.`);
                      setSelectedBed(null);
                      setActiveModalAction(null);
                    }}
                    className="flex-1 rounded-xl bg-[#E63946] hover:bg-[#C32F3A] py-2 text-xs font-bold text-white cursor-pointer shadow-sm"
                  >
                    Confirm Disallocate
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </HospitalShell>
  );
}
