import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Activity,
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplets,
  Heart,
  HeartPulse,
  History,
  Inbox,
  MapPin,
  Phone,
  Pill,
  Play,
  Shield,
  Siren,
  Sparkles,
  Star,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { SectionCard, SeverityBadge } from "@/components/design-system";
import { VolunteerShell, type VolunteerTab } from "@/components/roles/volunteer-shell";
import { LiveMap } from "@/components/live-map";
import ProfileHeader from "@/components/profile/profile-header";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getProfile, getDisplayName } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/volunteer")({
  head: () => ({ meta: [{ title: "Volunteer Response · AEGIS" }] }),
  component: VolunteerPortal,
});

function VolunteerPortal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role?.toLowerCase() !== "volunteer")) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  const [tab, setTab] = useState<VolunteerTab>("incidents");
  const [accepted, setAccepted] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<any>(null);

  const [volStats, setVolStats] = useState({
    rating: 4.9,
    incidentsResponded: 14,
    communityScore: 880,
    skillRank: "Gold Responder",
    rewardPoints: 2450,
  });

  const [coursesState, setCoursesState] = useState([
    {
      id: "c1",
      title: "Bystander CPR & AED Basics",
      level: "Beginner",
      time: "15 mins",
      progress: 100,
      done: true,
      description:
        "Standard protocols for chest compressions and operating Automated External Defibrillators.",
      icon: HeartPulse,
    },
    {
      id: "c2",
      title: "Trauma Bleeding Control (STOP THE BLEED)",
      level: "Intermediate",
      time: "20 mins",
      progress: 100,
      done: true,
      description:
        "Tourniquet application, wound packing, and hemorrhage stabilization before ALS arrival.",
      icon: Droplets,
    },
    {
      id: "c3",
      title: "Overdose & Naloxone Response",
      level: "Advanced",
      time: "25 mins",
      progress: 45,
      done: false,
      description:
        "Recognizing respiratory depression, airway management, and intranasal Naloxone administration.",
      icon: Pill,
    },
    {
      id: "c4",
      title: "Crowd Control & Triage Communication",
      level: "Intermediate",
      time: "15 mins",
      progress: 0,
      done: false,
      description:
        "Securing accident perimeters, direct dispatcher handoffs, and bystander crowd management.",
      icon: Users,
    },
  ]);

  if (isLoading || !isAuthenticated || user?.role?.toLowerCase() !== "volunteer") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-6 w-6 animate-ping bg-purple-600 rounded-full" />
      </div>
    );
  }

  const handleComplete = () => {
    setCompleted(true);
    setVolStats((s) => ({
      ...s,
      incidentsResponded: s.incidentsResponded + 1,
      communityScore: s.communityScore + 50,
      rewardPoints: s.rewardPoints + 50,
    }));
    toast.success("Response completed! +50 XP and reward points awarded.");
  };

  return (
    <VolunteerShell activeTab={tab} onTabChange={setTab} onDuty>
      {/* INCIDENTS TAB */}
      {tab === "incidents" && (
        <div className="space-y-6">
          {/* HEADER BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-[#E5E7EB] shadow-sm">
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Siren className="h-5 w-5 text-[#E63946]" />
                Active Incidents
              </h1>
              <p className="text-xs font-medium text-gray-500 mt-0.5">
                Emergency situations requiring immediate volunteer response.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Monitoring Noida Grid
              </span>
            </div>
          </div>

          {/* TWO COLUMN INCIDENTS + MAP LAYOUT */}
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            {/* LEFT COLUMN: INCIDENT CARDS */}
            <div className="space-y-4">
              {/* CRITICAL INCIDENT CARD */}
              <div
                className={cn(
                  "group rounded-3xl bg-white p-6 border-2 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5",
                  accepted
                    ? "border-emerald-500 bg-emerald-50/20"
                    : "border-[#E63946]/40 hover:border-[#E63946]",
                )}
              >
                {/* CARD HEADER: SEVERITY & DISTANCE */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-red-100 text-[#E63946] px-3 py-0.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Siren className="h-3.5 w-3.5 text-[#E63946]" /> Critical Emergency
                    </span>
                    <span className="text-[10px] font-mono font-bold text-gray-400">EMG-1094</span>
                  </div>

                  <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 text-[10px] font-extrabold flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-blue-600" /> 800m away
                  </span>
                </div>

                {/* INCIDENT DETAILS */}
                <div className="pt-4 space-y-3">
                  <div>
                    <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <HeartPulse className="h-5 w-5 text-[#E63946] shrink-0" />
                      Cardiac Arrest — Sector 62
                    </h2>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Male patient (~56 yrs). ALS Ambulance AMB-1083 dispatched with 4 min ETA.
                      Immediate CPR &amp; bystander stabilization required.
                    </p>
                  </div>

                  {/* METRICS ROW */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/80 p-3 rounded-2xl border border-gray-200/80 font-medium text-gray-700">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">
                        Required Skill
                      </span>
                      <span className="font-extrabold text-purple-700">
                        CPR &amp; AED Certified
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">
                        Reported Time
                      </span>
                      <span className="font-extrabold text-gray-900">2 mins ago</span>
                    </div>
                  </div>

                  {/* DISPATCH ACTION BUTTON / PROGRESSION FLOW */}
                  {!accepted ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAccepted(true);
                        toast.success(
                          "Incident accepted! Route to victim highlighted on live map.",
                        );
                      }}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E63946] py-3.5 text-xs font-black text-white shadow-md hover:bg-[#C32F3A] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      <span>Respond Now (Accept Dispatch)</span>
                    </button>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {!arrived ? (
                        <button
                          type="button"
                          onClick={() => {
                            setArrived(true);
                            toast.info("Marked as arrived at victim location.");
                          }}
                          className="w-full rounded-2xl bg-amber-500 py-3 text-xs font-bold text-white shadow-sm hover:bg-amber-600 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                        >
                          Mark Arrived at Location
                        </button>
                      ) : !completed ? (
                        <button
                          type="button"
                          onClick={handleComplete}
                          className="w-full rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                        >
                          Complete Handover (+50 XP)
                        </button>
                      ) : (
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-center text-xs font-extrabold text-emerald-700 flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Response Complete · Handover Logged</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* NEARBY ACTIVE RESPONDERS & COMMUNITY METRICS CARD */}
              <div className="rounded-3xl bg-white p-5 border border-gray-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" /> Active Responders Nearby
                </h3>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-2xl border border-gray-200/60">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>3 CPR-certified volunteers active within 1km radius</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-2xl border border-gray-200/60">
                    <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                    <span>1 AED Unit available at Sector 62 Metro Station (300m)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: LIVE EMERGENCY MAP */}
            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col h-[480px] lg:h-auto min-h-[420px]">
              <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100 mb-3">
                <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#E63946]" /> Live Dispatch Map
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                  Telemetry
                </span>
              </div>

              <div className="flex-1 rounded-2xl overflow-hidden relative border border-gray-200">
                <LiveMap
                  center={[77.3649, 28.628]}
                  zoom={14}
                  markers={[
                    {
                      id: "vic",
                      type: "citizen",
                      x: 50,
                      y: 50,
                      label: "Victim (Sector 62)",
                      active: true,
                    },
                    {
                      id: "vol",
                      type: "volunteer",
                      x: 45,
                      y: 55,
                      label: "You (Volunteer)",
                      active: true,
                    },
                    { id: "amb", type: "ambulance", x: 70, y: 30, label: "AMB-1083", active: true },
                  ]}
                  showRoute
                  routeType="volunteer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REQUESTS TAB */}
      {tab === "requests" &&
        (() => {
          const requestsList = [
            {
              id: "REQ-4091",
              type: "Immediate CPR & AED Assistance",
              severity: "critical",
              location: "Sector 62 Crossing, Noida",
              distance: "800m away",
              skill: "CPR & AED Certified",
              time: "3 mins ago",
              status: accepted ? (completed ? "Completed" : "In Progress") : "New",
              description:
                "Male patient (~56 yrs) in cardiac arrest. Paramedic ETA 4 mins. CPR assistance requested.",
              ambulance: "Unit AMB-1083 (ALS)",
            },
            {
              id: "REQ-3820",
              type: "Bystander Trauma Bleeding Control",
              severity: "high",
              location: "Metro Station Gate 2, Sector 62",
              distance: "1.2 km away",
              skill: "Stop The Bleed / First Aid",
              time: "12 mins ago",
              status: "New",
              description:
                "Minor collision victim with leg hemorrhage. First aid pressure bandage required.",
              ambulance: "Unit AMB-1020 (BLS)",
            },
          ];

          return (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* MAIN HEADER */}
              <div className="rounded-3xl bg-white p-6 border border-[#E5E7EB] shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Inbox className="h-5 w-5 text-[#E63946]" />
                    Response Requests
                  </h1>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">
                    Review emergency requests that require volunteer assistance in your area.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 font-bold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    {requestsList.length} Active Broadcasts
                  </span>
                </div>
              </div>

              {/* REQUEST CARDS LIST */}
              <div className="space-y-4">
                {requestsList.map((req) => (
                  <div
                    key={req.id}
                    className="group rounded-3xl bg-white p-6 border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4"
                  >
                    {/* CARD TOP HEADER */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-1",
                            req.severity === "critical"
                              ? "bg-red-100 text-[#E63946]"
                              : "bg-amber-100 text-amber-800",
                          )}
                        >
                          <Siren className="h-3 w-3" /> {req.severity} priority
                        </span>
                        <span className="font-mono font-bold text-gray-400">{req.id}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-medium">{req.time}</span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border",
                            req.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : req.status === "In Progress"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-red-50 text-[#E63946] border-red-200",
                          )}
                        >
                          {req.status}
                        </span>
                      </div>
                    </div>

                    {/* CARD BODY CONTENT */}
                    <div className="space-y-2">
                      <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                        {req.type}
                      </h2>
                      <p className="text-xs text-gray-600 leading-relaxed">{req.description}</p>
                    </div>

                    {/* METRICS ROW */}
                    <div className="grid grid-cols-3 gap-2 text-xs bg-gray-50/80 p-3 rounded-2xl border border-gray-200/80">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">
                          Location
                        </span>
                        <span className="font-bold text-gray-900 truncate block">
                          {req.location}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">
                          Distance
                        </span>
                        <span className="font-bold text-blue-600 block">{req.distance}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">
                          Required Skill
                        </span>
                        <span className="font-bold text-purple-700 block truncate">
                          {req.skill}
                        </span>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setTab("incidents");
                          setAccepted(true);
                          toast.success(`Accepted request ${req.id}! Route loaded on Live Map.`);
                        }}
                        className="flex-1 rounded-2xl bg-[#E63946] py-3 text-xs font-black text-white hover:bg-[#C32F3A] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Play className="h-4 w-4 fill-white" />
                        <span>Accept Broadcast &amp; Respond</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      {/* TRAINING TAB */}
      {tab === "training" &&
        (() => {
          const completedCount = coursesState.filter((c) => c.done).length;
          const inProgressCount = coursesState.filter((c) => !c.done && c.progress > 0).length;
          const certsCount = completedCount;

          return (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* MAIN HEADER & COMPACT STATS BAR */}
              <div className="rounded-3xl bg-white p-6 border border-[#E5E7EB] shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <h1 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-[#E63946]" />
                      Training &amp; Certifications
                    </h1>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">
                      Certified responder training modules &amp; emergency medical accreditations.
                    </p>
                  </div>

                  <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 text-xs font-bold flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-purple-600" />
                    Verified Responder Portal
                  </span>
                </div>

                {/* COMPACT SUMMARY STATISTICS */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-3.5 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-emerald-800">Completed</p>
                      <p className="text-base font-black text-emerald-950">
                        {completedCount} Modules
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-blue-50/70 border border-blue-200/80 p-3.5 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-blue-800">In Progress</p>
                      <p className="text-base font-black text-blue-950">
                        {inProgressCount} Ongoing
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-purple-50/70 border border-purple-200/80 p-3.5 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-purple-800">
                        Certifications
                      </p>
                      <p className="text-base font-black text-purple-950">{certsCount} Active</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* COURSE CARDS GRID */}
              <div className="grid gap-4 md:grid-cols-2">
                {coursesState.map((m) => {
                  const CourseIcon = m.icon || BookOpen;

                  return (
                    <div
                      key={m.id}
                      className="group rounded-3xl bg-white p-5 border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* CARD HEADER */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-xl bg-red-50 text-[#E63946] flex items-center justify-center shrink-0">
                              <CourseIcon className="h-4 w-4" />
                            </div>
                            <span className="text-[10px] font-extrabold uppercase text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                              {m.level} · {m.time}
                            </span>
                          </div>

                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border",
                              m.done
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : m.progress > 0
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-gray-100 text-gray-600 border-gray-200",
                            )}
                          >
                            {m.done ? "COMPLETED" : m.progress > 0 ? "IN PROGRESS" : "UNSTARTED"}
                          </span>
                        </div>

                        {/* TITLE & DESCRIPTION */}
                        <div>
                          <h3 className="text-sm font-black text-gray-900 tracking-tight">
                            {m.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {m.description}
                          </p>
                        </div>
                      </div>

                      {/* PROGRESS BAR & ACTION BUTTON */}
                      <div className="space-y-3 pt-2">
                        {/* PROGRESS BAR */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-gray-500">
                            <span>Module Completion</span>
                            <span>{m.progress}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500 ease-out",
                                m.done
                                  ? "bg-emerald-500"
                                  : m.progress > 0
                                    ? "bg-blue-600"
                                    : "bg-gray-300",
                              )}
                              style={{ width: `${m.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* BUTTON */}
                        {m.done ? (
                          <div className="w-full rounded-2xl bg-emerald-50 border border-emerald-200 py-2.5 text-center text-xs font-bold text-emerald-700 flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span>Certified Module</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const newProg = m.progress === 0 ? 45 : 100;
                              const isNowDone = newProg === 100;
                              setCoursesState((prev) =>
                                prev.map((c) =>
                                  c.id === m.id ? { ...c, progress: newProg, done: isNowDone } : c,
                                ),
                              );
                              toast.success(
                                isNowDone
                                  ? `Completed course: ${m.title}! Certificate awarded.`
                                  : `Resumed module: ${m.title}`,
                              );
                            }}
                            className="w-full rounded-2xl bg-purple-600 py-2.5 text-xs font-bold text-white hover:bg-purple-700 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-sm"
                          >
                            {m.progress > 0 ? "Continue Training" : "Start Module"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      {/* ACHIEVEMENTS / REWARDS TAB */}
      {(tab === "achievements" || (tab as string) === "rewards") && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#E5E7EB]">
              <Trophy className="h-6 w-6 text-purple-600" />
              <p className="mt-2 text-2xl font-bold text-[#111111]">{volStats.skillRank}</p>
              <p className="text-xs text-[#525866]">Current rank</p>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#E5E7EB]">
              <Star className="h-6 w-6 text-amber-500" />
              <p className="mt-2 text-2xl font-bold text-[#111111]">{volStats.rating} ★</p>
              <p className="text-xs text-[#525866]">Community rating</p>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#E5E7EB]">
              <Award className="h-6 w-6 text-emerald-600" />
              <p className="mt-2 text-2xl font-bold text-[#111111]">{volStats.rewardPoints}</p>
              <p className="text-xs text-[#525866]">Reward points</p>
            </div>
          </div>
          <SectionCard title="Achievement Badges">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                "First Response",
                "CPR Hero",
                "10 Lives",
                "Night Owl",
                "Speed Responder",
                "Community Leader",
              ].map((badge) => (
                <div key={badge} className="rounded-xl bg-[#F8F9FB] p-4 text-center">
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-50">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-[#111111]">{badge}</p>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Impact Analytics">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-[#111111]">{volStats.incidentsResponded}</p>
                <p className="text-xs text-[#525866]">Incidents responded</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#111111]">#18</p>
                <p className="text-xs text-[#525866]">Noida grid rank</p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === "history" &&
        (() => {
          const historyItems = [
            {
              id: "EMG-1180",
              type: "CPR Assistance",
              date: "Mar 2, 2026",
              time: "02:15 PM",
              location: "Sector 62 Crossing, Noida",
              outcome: "Patient stabilized by field volunteer",
              status: "Completed",
              points: "+50 pts",
              paramedic: "ALS Unit AMB-1083 (Dr. Ananya Roy)",
            },
            {
              id: "EMG-1092",
              type: "First Aid & Bleeding Control",
              date: "Feb 18, 2026",
              time: "06:30 PM",
              location: "Metro Station Gate 2, Sector 62",
              outcome: "Successful ambulance handover",
              status: "Completed",
              points: "+50 pts",
              paramedic: "BLS Unit AMB-1020 (Rahul Kumar)",
            },
            {
              id: "EMG-1055",
              type: "AED Defibrillator Deployment",
              date: "Feb 5, 2026",
              time: "11:20 AM",
              location: "Apartment Complex, Sector 62",
              outcome: "Cardiac rhythm restored prior to ER arrival",
              status: "Completed",
              points: "+50 pts",
              paramedic: "ALS Unit AMB-1011 (Fortis Trauma Desk)",
            },
          ];

          if (completed) {
            historyItems.unshift({
              id: "EMG-1094",
              type: "Cardiac Arrest CPR",
              date: "Today",
              time: "10:58 AM",
              location: "Sector 62 Noida",
              outcome: "CPR & AED Handover Completed",
              status: "Completed",
              points: "+50 pts",
              paramedic: "Unit AMB-1083 (ALS Unit)",
            });
          }

          const totalPointsEarned = historyItems.length * 50;

          return (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* MAIN HEADER & SUMMARY CARD */}
              <div className="rounded-3xl bg-white p-6 border border-[#E5E7EB] shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <History className="h-5 w-5 text-[#E63946]" />
                    Emergency Response History
                  </h1>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">
                    View all past emergency calls, dispatch responses, and points awarded.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {historyItems.length} Completed Calls
                  </span>
                  <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-3.5 py-1.5 font-bold flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-purple-600" />+{totalPointsEarned} Pts Earned
                  </span>
                </div>
              </div>

              {/* HISTORY LIST CARDS */}
              {historyItems.length === 0 ? (
                <div className="rounded-3xl bg-white p-12 border border-gray-200 text-center space-y-3">
                  <Inbox className="h-10 w-10 text-gray-300 mx-auto" />
                  <h3 className="text-base font-bold text-gray-900">No response history yet</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Active responses and completed handovers will appear here once logged.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyItems.map((h) => (
                    <div
                      key={h.id}
                      className="group rounded-3xl bg-white p-6 border border-gray-200 shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-4"
                    >
                      {/* CARD TOP HEADER */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded-lg border border-gray-200">
                            {h.id}
                          </span>
                          <span className="font-bold text-gray-500">
                            {h.date} · {h.time}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> {h.status}
                          </span>
                          <span className="rounded-full bg-purple-100 text-purple-800 font-extrabold px-2.5 py-0.5 text-[10px]">
                            {h.points}
                          </span>
                        </div>
                      </div>

                      {/* CARD BODY CONTENT */}
                      <div className="space-y-1">
                        <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                          {h.type}
                        </h2>
                        <p className="text-xs text-gray-600 font-medium">
                          Outcome: <span className="text-emerald-700 font-bold">{h.outcome}</span>
                        </p>
                      </div>

                      {/* METRICS ROW */}
                      <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50/80 p-3 rounded-2xl border border-gray-200/80">
                        <div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase block">
                            Dispatch Location
                          </span>
                          <span className="font-bold text-gray-900 truncate block flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#E63946] shrink-0" />
                            {h.location}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase block">
                            Paramedic Unit Handover
                          </span>
                          <span className="font-bold text-gray-800 truncate block">
                            {h.paramedic}
                          </span>
                        </div>
                      </div>

                      {/* DETAILS BUTTON */}
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryRecord(h)}
                          className="rounded-xl bg-gray-100 hover:bg-gray-200 px-4 py-2 text-xs font-bold text-gray-800 transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Activity className="h-3.5 w-3.5 text-blue-600" />
                          <span>View Response Details</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* RESPONSE DETAILS MODAL */}
              <Dialog
                open={!!selectedHistoryRecord}
                onOpenChange={(open) => !open && setSelectedHistoryRecord(null)}
              >
                <DialogContent className="sm:max-w-md rounded-3xl p-6">
                  <DialogHeader>
                    <DialogTitle className="text-base font-black text-gray-900 flex items-center gap-2">
                      <History className="h-5 w-5 text-[#E63946]" />
                      Response Record Details
                    </DialogTitle>
                  </DialogHeader>

                  {selectedHistoryRecord && (
                    <div className="space-y-4 pt-2 text-xs">
                      <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                          <span className="font-mono font-bold text-gray-500">
                            {selectedHistoryRecord.id}
                          </span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {selectedHistoryRecord.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">
                          {selectedHistoryRecord.type}
                        </h4>
                        <p className="text-gray-600">Location: {selectedHistoryRecord.location}</p>
                        <p className="text-gray-600">
                          Date &amp; Time: {selectedHistoryRecord.date} at{" "}
                          {selectedHistoryRecord.time}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 font-medium">
                          <span>Patient Outcome:</span>
                          <span className="font-bold">{selectedHistoryRecord.outcome}</span>
                        </div>

                        <div className="flex justify-between p-3 rounded-2xl bg-purple-50/80 border border-purple-200 text-purple-900 font-medium">
                          <span>Points Awarded:</span>
                          <span className="font-bold">{selectedHistoryRecord.points}</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-900 space-y-0.5">
                          <span className="font-bold block">Handover Officer / Team:</span>
                          <span>{selectedHistoryRecord.paramedic}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedHistoryRecord(null)}
                        className="w-full rounded-2xl bg-gray-900 text-white py-3 font-bold hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        Close Details
                      </button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          );
        })()}

      {/* PROFILE TAB */}
      {tab === "profile" &&
        (() => {
          const profile = getProfile("volunteer");
          const name = getDisplayName("volunteer", user);
          const subtitle = `VOL-${user?.id?.substr(-4).toUpperCase() || "202"} · ${profile.skillRank || "Gold Responder"}`;
          const skillsList = Array.isArray(profile.skills)
            ? profile.skills.join(", ")
            : profile.skills || "CPR, First Aid, AED";
          const responseTypesList = Array.isArray(profile.preferredResponseTypes)
            ? profile.preferredResponseTypes.join(", ")
            : profile.preferredResponseTypes;

          return (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* TOP HEADER CARD WITH PROFILE HEADER & ACTION BUTTONS */}
              <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm">
                <ProfileHeader name={name} subtitle={subtitle} role="volunteer" />
              </div>

              {/* DESKTOP 2-COLUMN LAYOUT */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* LEFT COLUMN: ACTIVITY SUMMARY */}
                <div className="md:col-span-1 space-y-4">
                  {/* SUMMARY METRICS CARD */}
                  <div className="rounded-3xl bg-white p-5 border border-gray-200 shadow-sm space-y-3">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                      Responder Activity
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-2xl bg-red-50/70 p-3 border border-red-100 text-center">
                        <span className="text-[9px] font-extrabold text-red-700 uppercase block">
                          Responses
                        </span>
                        <span className="text-base font-black text-gray-900">
                          {volStats.incidentsResponded} Calls
                        </span>
                      </div>

                      <div className="rounded-2xl bg-purple-50/70 p-3 border border-purple-100 text-center">
                        <span className="text-[9px] font-extrabold text-purple-700 uppercase block">
                          Points
                        </span>
                        <span className="text-base font-black text-gray-900">
                          {volStats.rewardPoints} pts
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-xs font-bold text-gray-700 bg-gray-50 p-2.5 rounded-2xl border border-gray-200">
                      <span className="text-gray-500 font-medium">Rank Status:</span>
                      <span className="text-amber-700 font-black flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                        {volStats.skillRank}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: PROFILE INFORMATION CARDS & APPRECIATION */}
                <div className="md:col-span-2 space-y-4">
                  <div className="rounded-3xl bg-white p-6 border border-gray-200 shadow-sm space-y-4">
                    <h2 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2 border-b border-gray-100 pb-3">
                      <User className="h-4 w-4 text-[#E63946]" />
                      Emergency Responder Profile Details
                    </h2>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: "Full Name", value: name || "Not provided" },
                        { label: "Active Skills", value: skillsList || "Not provided" },
                        {
                          label: "Preferred Response Types",
                          value: responseTypesList || "Medical Emergency, Road Accident",
                        },
                        {
                          label: "Government / Volunteer ID",
                          value: profile.idNumber || profile.idProofName || "Verified ID",
                        },
                        {
                          label: "Emergency Contact",
                          value: profile.emergencyContactName
                            ? `${profile.emergencyContactName} (${profile.relationship || "Contact"}) - +91 ${profile.emergencyContactNumber}`
                            : "Registered Contact",
                        },
                        {
                          label: "Dispatch Availability",
                          value: profile.emergencyDispatchAvailable
                            ? `Available (${profile.emergencyDispatchAvailable})`
                            : "Available On Duty",
                        },
                        {
                          label: "Primary Response Radius",
                          value: profile.availabilityRadius || "2 km",
                        },
                        { label: "Blood Group", value: profile.bloodGroup || "O+" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl bg-gray-50/80 p-3.5 border border-gray-200/90 hover:border-gray-300 hover:shadow-xs transition-all"
                        >
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            {item.label}
                          </span>
                          <span className="text-xs font-bold text-gray-900 mt-0.5 block truncate">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* APPRECIATION SECTION */}
                  <div className="rounded-3xl bg-gradient-to-r from-red-50/90 via-purple-50/60 to-blue-50/90 p-5 border border-red-100 shadow-sm flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-[#E63946] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Heart className="h-5 w-5 fill-white" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900">
                        Thank you for your service.
                      </h4>
                      <p className="text-[11px] font-medium text-gray-600 mt-0.5">
                        Your emergency responder readiness and rapid action help protect lives
                        across your community.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </VolunteerShell>
  );
}
