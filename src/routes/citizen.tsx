import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  AlertTriangle,
  Brain,
  Building2,
  ChevronRight,
  Clock,
  Droplets,
  Heart,
  MapPin,
  MessageCircle,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  Pill,
  Share2,
  Shield,
  Siren,
  Users,
  Send,
  Check,
  Play,
  ChevronLeft,
  Navigation,
  Activity,
  MessageSquare,
  XCircle,
  CheckCircle2,
  Lock,
  Eye,
  Info,
  Zap,
  User,
  LogOut,
} from "lucide-react";
import { SectionCard, SeverityBadge } from "@/components/design-system";
import { CitizenShell, type CitizenTab } from "@/components/roles/citizen-shell";
import { LiveMap } from "@/components/live-map";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { getProfile, saveProfile, getDisplayName } from "@/lib/profile";
import ProfileHeader from "@/components/profile/profile-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/citizen")({
  head: () => ({ meta: [{ title: "Citizen SOS Portal · AEGIS" }] }),
  component: CitizenPortal,
});

const FIRST_AID_GUIDES: Record<
  string,
  { title: string; icon: any; steps: Array<{ title: string; desc: string }> }
> = {
  cpr: {
    title: "CPR (Cardiopulmonary Resuscitation)",
    icon: Activity,
    steps: [
      {
        title: "Check Safety & Status",
        desc: "Ensure the scene is safe. Shake the victim gently and shout 'Are you okay?' to check for responsiveness.",
      },
      {
        title: "Call for Rescue",
        desc: "Shout for nearby help. Activate the AEGIS SOS beacon immediately to alert nearby dispatch units.",
      },
      {
        title: "Position Your Hands",
        desc: "Place the heel of one hand in the center of the chest. Interlock your other hand on top. Keep your elbows locked.",
      },
      {
        title: "Push Hard & Fast",
        desc: "Compress the chest at least 2 inches at a rate of 100-120 compressions per minute (to the beat of 'Staying Alive').",
      },
    ],
  },
  choking: {
    title: "Choking Emergency",
    icon: AlertTriangle,
    steps: [
      {
        title: "Stand Behind the Victim",
        desc: "Lean the person slightly forward. Give 5 firm back blows between their shoulder blades using the heel of your hand.",
      },
      {
        title: "Perform Abdominal Thrusts",
        desc: "Make a fist with one hand, place it just above the navel, grab it with your other hand, and pull sharply upward and inward.",
      },
      {
        title: "Repeat Until Clear",
        desc: "Alternate between 5 back blows and 5 abdominal thrusts until the blockage is dislodged or the victim becomes unresponsive.",
      },
    ],
  },
  bleeding: {
    title: "Severe Bleeding Control",
    icon: Droplets,
    steps: [
      {
        title: "Apply Direct Pressure",
        desc: "Cover the wound with a clean bandage or cloth. Apply firm, constant pressure with both hands directly on the bleed.",
      },
      {
        title: "Elevate Above Heart",
        desc: "Keep pressure applied while elevating the injured limb above the level of the heart to slow down blood flow.",
      },
      {
        title: "Maintain Pressure",
        desc: "Do not remove the cloth if it gets soaked; wrap clean bandages firmly over it and continue manual pressure.",
      },
    ],
  },
  burns: {
    title: "Thermal Burns Care",
    icon: Heart,
    steps: [
      {
        title: "Cool Immediately",
        desc: "Run cool (not cold) running tap water over the burn site for 10-20 minutes. Never use ice or icy water.",
      },
      {
        title: "Remove Constricting Items",
        desc: "Gently remove rings, bracelets, or tight clothing from the burned area before swelling starts.",
      },
      {
        title: "Cover Loosely",
        desc: "Wrap the area loosely with sterile cling film or a clean plastic sheet to shield the raw skin and prevent infection.",
      },
    ],
  },
};

const HOSPITALS_LIST = [
  {
    name: "Fortis Hospital, Noida",
    distance: "1.2 km",
    eta: "4 mins",
    icuTotal: 20,
    icuFree: 12,
    erTotal: 16,
    erFree: 8,
    traumaStatus: "Level 1 Trauma Center · Accepting Critical Care",
    phone: "+91 120 240 0222",
    address: "Sector 62, Noida, UP",
  },
  {
    name: "Metro Hospital & Heart Institute",
    distance: "2.5 km",
    eta: "7 mins",
    icuTotal: 15,
    icuFree: 5,
    erTotal: 12,
    erFree: 4,
    traumaStatus: "Cardiac Specialty Hub · Accepting Cardiac Emergencies",
    phone: "+91 120 422 6666",
    address: "Sector 11, Noida, UP",
  },
  {
    name: "Kailash Hospital & Heart Institute",
    distance: "4.1 km",
    eta: "11 mins",
    icuTotal: 25,
    icuFree: 15,
    erTotal: 20,
    erFree: 10,
    traumaStatus: "Level 2 Trauma Center · Full Surgery Operations",
    phone: "+91 120 244 4444",
    address: "Sector 27, Noida, UP",
  },
  {
    name: "Max Super Speciality Hospital",
    distance: "5.8 km",
    eta: "15 mins",
    icuTotal: 30,
    icuFree: 19,
    erTotal: 24,
    erFree: 12,
    traumaStatus: "Multispecialty Emergency Hub · Active ER Team",
    phone: "+91 120 662 9999",
    address: "Sector 19, Noida, UP",
  },
];

function CitizenPortal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "citizen")) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  const [tab, setTab] = useState<CitizenTab>("home");
  const [activeModal, setActiveModal] = useState<
    "first-aid" | "hospitals" | "chat" | "share" | "help" | null
  >(null);
  const [sos, setSos] = useState(false);
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [activeSegment, setActiveSegment] = useState<"Accident" | "Medical" | "Fire" | null>(null);

  // Accidental activation countdown timer effect
  useEffect(() => {
    if (sosCountdown === null) return;
    if (sosCountdown <= 0) {
      setSosCountdown(null);
      setSos(true);
      toast.success(
        "🚨 EMERGENCY SOS BROADCASTED! Dispatching nearest ambulance & alerting trauma center.",
      );
      setTab("tracking");
      return;
    }
    const timer = setTimeout(() => {
      setSosCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [sosCountdown]);

  const triggerSosWithProtection = (segment?: "Accident" | "Medical" | "Fire") => {
    if (segment) setActiveSegment(segment);
    if (sos) {
      setTab("tracking");
      return;
    }
    setSosCountdown(5);
  };

  const cancelSosCountdown = () => {
    setSosCountdown(null);
    toast.info("SOS Activation Cancelled. No emergency dispatched.");
  };

  useEffect(() => {
    if (!listening) return;
    const phrases = [
      "I am reporting an emergency",
      "I am reporting a road accident near Sector 62 Crossing,",
      "I am reporting a road accident near Sector 62 Crossing, two cars crashed.",
      "I am reporting a road accident near Sector 62 Crossing, two cars crashed, driver has head injury.",
    ];
    let i = 0;
    const id = setInterval(() => {
      setTranscript(phrases[i]);
      i++;
      if (i >= phrases.length) {
        clearInterval(id);
        setListening(false);
        triggerSosWithProtection("Accident");
      }
    }, 1200);
    return () => clearTimeout(id);
  }, [listening]);

  if (isLoading || !isAuthenticated || user?.role !== "citizen") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-6 w-6 animate-ping bg-[#E63946] rounded-full" />
      </div>
    );
  }

  return (
    <CitizenShell activeTab={tab} onTabChange={setTab} onOpenModal={setActiveModal}>
      {tab === "home" && (
        <HomeView
          onTriggerSos={triggerSosWithProtection}
          onTrack={() => setTab("tracking")}
          onViewProfile={() => setTab("profile")}
          onViewHistory={() => setTab("history")}
          sos={sos}
          activeModal={activeModal}
          setActiveModal={setActiveModal}
          activeSegment={activeSegment}
        />
      )}
      {tab === "emergency" && (
        <EmergencyView
          sos={sos}
          setSos={setSos}
          onTriggerSos={triggerSosWithProtection}
          listening={listening}
          setListening={setListening}
          transcript={transcript}
          setTranscript={setTranscript}
          activeSegment={activeSegment}
          setActiveSegment={setActiveSegment}
          onTrack={() => setTab("tracking")}
        />
      )}
      {tab === "tracking" && <TrackingView sos={sos} setSos={setSos} />}
      {tab === "history" && <HistoryView />}
      {tab === "profile" && <ProfileView />}

      {/* Accidental Activation Protection Modal */}
      {sosCountdown !== null && (
        <Dialog open={true} onOpenChange={() => cancelSosCountdown()}>
          <DialogContent className="sm:max-w-md bg-white border-2 border-[#E63946] text-center p-6 space-y-4">
            <div className="mx-auto relative grid h-24 w-24 place-items-center rounded-full bg-red-50 border-4 border-[#E63946] animate-pulse">
              <span className="text-3xl font-black text-[#E63946] font-mono">{sosCountdown}</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Activating One-Tap SOS</h2>
              <p className="text-xs text-gray-500 mt-1">
                Broadcasting emergency location beacon and dispatching paramedics in {sosCountdown}{" "}
                seconds.
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 font-medium">
              ⚠️ Tap <strong>Cancel SOS</strong> immediately if this was pressed by mistake.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelSosCountdown}
                className="flex-1 rounded-xl bg-gray-900 py-3 text-xs font-bold text-white hover:bg-gray-800 transition-colors shadow-md cursor-pointer"
              >
                CANCEL SOS (Accidental Tap)
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </CitizenShell>
  );
}

function HomeView({
  onTriggerSos,
  onTrack,
  onViewProfile,
  onViewHistory,
  sos,
  activeModal,
  setActiveModal,
  activeSegment,
}: {
  onTriggerSos: (seg?: "Accident" | "Medical" | "Fire") => void;
  onTrack: () => void;
  onViewProfile: () => void;
  onViewHistory: () => void;
  sos: boolean;
  activeModal: "first-aid" | "hospitals" | "chat" | "share" | "help" | null;
  setActiveModal: (modal: "first-aid" | "hospitals" | "chat" | "share" | "help" | null) => void;
  activeSegment: "Accident" | "Medical" | "Fire" | null;
}) {
  const { user } = useAuth();
  const profile = getProfile("citizen");
  const name = getDisplayName("citizen", user);

  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Chat States
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: "ai" | "user"; text: string; time: string }>
  >([
    {
      sender: "ai",
      text: "Hello! I am the AEGIS AI Emergency Assistant. I have accessed your location (Sector 62 Noida) and medical profile. How can I assist you?",
      time: "Now",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Share States
  const [sharingLoading, setSharingLoading] = useState(false);

  useEffect(() => {
    if (activeModal === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isTyping, activeModal]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg, time: "Just now" }]);
    setChatInput("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let reply =
        "Responders are on standby. Please remain calm, keep the victim comfortable, and let me know if they are conscious.";
      const lower = userMsg.toLowerCase();
      if (lower.includes("accident") || lower.includes("crash") || lower.includes("car")) {
        reply =
          "Understood. Road traffic dispatch protocol active. Notifying Noida fleet. Check if victim is conscious and secure away from traffic.";
      } else if (
        lower.includes("heart") ||
        lower.includes("pain") ||
        lower.includes("chest") ||
        lower.includes("cpr")
      ) {
        reply =
          "Cardiac emergency flagged. Critical care ambulance dispatched. If victim is unconscious and not breathing, begin CPR (100-120 compressions/min).";
      } else if (lower.includes("bleed") || lower.includes("blood") || lower.includes("cut")) {
        reply =
          "For severe bleeding: Apply firm direct pressure with clean cloth. Elevate limb if possible. Keep pressure applied constant.";
      }
      setChatMessages((prev) => [...prev, { sender: "ai", text: reply, time: "Just now" }]);
    }, 1000);
  };

  const handleShareLocation = () => {
    setSharingLoading(true);
    setTimeout(() => {
      setSharingLoading(false);
      toast.success("Live GPS tracking link broadcasted to selected emergency contacts!");
      setActiveModal(null);
    }, 1200);
  };

  const truncate = (str: string, len: number = 16) => {
    if (!str) return "None";
    return str.length > len ? str.slice(0, len) + "..." : str;
  };

  const bloodGroup = profile.bloodGroup || "O Positive";
  const allergies = profile.allergies || "Penicillin, Sulfa drugs";
  const conditions = profile.conditions || "Hypertension (controlled)";

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* CITIZEN WELCOME & LOCATION HEADER */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-[#111111] tracking-tight">Welcome back, {name}</h1>
          <p className="mt-0.5 text-xs text-[#525866] flex items-center gap-1.5 font-medium">
            <MapPin className="h-3.5 w-3.5 text-[#E63946]" /> Sector 62, Noida, UP · GPS Beacon
            Active (28.6273° N, 77.3725° E)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Grid Active · Ready
          </span>
        </div>
      </div>

      {/* TOP STATUS SECTION METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white p-4 border border-[#E5E7EB] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">System Status</span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-base font-black text-gray-900">Grid Online</p>
          <p className="text-[10px] text-emerald-600 font-bold">100% Operational</p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-[#E5E7EB] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Response Time</span>
            <Clock className="h-4 w-4 text-[#E63946]" />
          </div>
          <p className="text-base font-black text-gray-900">~4.2 mins</p>
          <p className="text-[10px] text-gray-500 font-medium">Average Sector ETA</p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-[#E5E7EB] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Ambulances Nearby
            </span>
            <Siren className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-base font-black text-gray-900">4 Units Active</p>
          <p className="text-[10px] text-amber-600 font-bold">ALS &amp; BLS Ready</p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-[#E5E7EB] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Hospitals Nearby</span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-base font-black text-gray-900">{HOSPITALS_LIST.length} Centers</p>
          <p className="text-[10px] text-blue-600 font-bold">Level 1 &amp; 2 Trauma</p>
        </div>
      </div>

      {/* ACTIVE EMERGENCY BANNER OR READY STATUS */}
      {sos ? (
        <div className="rounded-2xl border-2 border-[#E63946] bg-red-50/50 p-5 shadow-md space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#E63946] animate-ping" />
              <span className="text-xs font-black uppercase tracking-widest text-[#E63946]">
                ACTIVE EMERGENCY IN PROGRESS
              </span>
            </div>
            <SeverityBadge severity="critical" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white rounded-xl p-3 border border-red-100">
            <div>
              <p className="text-[9px] font-bold uppercase text-gray-400">Incident ID</p>
              <p className="font-mono font-bold text-gray-900 mt-0.5">EMG-1258</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-gray-400">Assigned Unit</p>
              <p className="font-bold text-[#E63946] mt-0.5">Unit AMB-1083</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-gray-400">ETA</p>
              <p className="font-bold text-emerald-600 mt-0.5">4m 12s</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-gray-400">Destination</p>
              <p className="font-bold text-blue-600 mt-0.5">City Care Trauma Hub</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onTrack}
            className="w-full rounded-xl bg-[#E63946] hover:bg-[#C32F3A] py-2.5 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span>Track Response Live on Map</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">
                Emergency Dispatch System Monitoring Active
              </p>
              <p className="text-[10px] text-gray-600">
                AEGIS priority response grid is active across Sector 62 Noida. One-Tap SOS triggers
                instant dispatch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PROMINENT ONE-TAP SOS SECTION */}
      <div className="rounded-3xl bg-white p-6 border border-[#E5E7EB] shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <Siren className="h-5 w-5 text-[#E63946]" />
              <span>One-Tap SOS Dispatch</span>
            </h2>
            <p className="text-xs text-gray-500">
              Instant 5-second protected emergency beacon with GPS location streaming to paramedics.
            </p>
          </div>
          <span className="rounded-full bg-red-50 text-[#E63946] border border-red-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider">
            Protected Activation
          </span>
        </div>

        <button
          type="button"
          onClick={() => onTriggerSos()}
          className="flex w-full items-center gap-5 rounded-2xl bg-[#E63946] hover:bg-[#C32F3A] p-6 text-left text-white shadow-xl transition-all active:scale-[0.98] cursor-pointer group"
        >
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/20 group-hover:scale-105 transition-transform shrink-0">
            <Siren className="h-9 w-9 text-white animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-xl font-black tracking-tight">TRIGGER EMERGENCY SOS</p>
              <ChevronRight className="h-6 w-6 text-white/80 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-white/85 mt-1">
              Dispatches nearest ambulance unit, notifies hospital ER, and activates 6 green
              signals.
            </p>
          </div>
        </button>

        {/* Emergency Categories */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Select Specific Emergency Category (Optional):
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: "Accident" as const,
                label: "Road Accident",
                icon: AlertTriangle,
                color: "hover:border-red-300",
              },
              {
                id: "Medical" as const,
                label: "Medical Crisis",
                icon: Heart,
                color: "hover:border-blue-300",
              },
              {
                id: "Fire" as const,
                label: "Fire / Rescue",
                icon: Zap,
                color: "hover:border-amber-300",
              },
            ].map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeSegment === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onTriggerSos(cat.id)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl py-3 px-2 border text-xs font-bold transition-all cursor-pointer",
                    isSelected
                      ? "bg-[#E63946] text-white border-[#E63946] shadow-sm"
                      : "bg-[#F8F9FB] text-gray-700 border-gray-200 hover:bg-white",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* QUICK ACTION CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: Brain,
            label: "AI First Aid",
            sub: "Step-by-step CPR & Care",
            color: "text-[#E63946]",
            action: () => setActiveModal("first-aid"),
          },
          {
            icon: Building2,
            label: "Nearby Hospitals",
            sub: "Live ER & ICU Beds",
            color: "text-blue-600",
            action: () => setActiveModal("hospitals"),
          },
          {
            icon: MessageCircle,
            label: "Emergency Chat",
            sub: "AI Emergency Assistant",
            color: "text-purple-600",
            action: () => setActiveModal("chat"),
          },
          {
            icon: Share2,
            label: "Share Location",
            sub: "Broadcast Live GPS Link",
            color: "text-emerald-600",
            action: () => setActiveModal("share"),
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className="rounded-2xl bg-white p-4 text-left border border-[#E5E7EB] hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm group cursor-pointer"
            >
              <div className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Icon className={cn("h-5 w-5", item.color)} />
              </div>
              <p className="mt-3 text-xs font-extrabold text-[#111111]">{item.label}</p>
              <p className="text-[10px] text-[#525866] mt-0.5">{item.sub}</p>
            </button>
          );
        })}
      </div>

      {/* MEDICAL PROFILE SUMMARY & RECENT ACTIVITY GRID */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* MEDICAL PROFILE SUMMARY */}
        <div className="rounded-2xl bg-white p-5 border border-[#E5E7EB] shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#E63946]" />
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Medical Profile Summary
                </h2>
              </div>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Synced with SOS
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-red-50/50 border border-red-100 p-3">
                <Droplets className="mx-auto h-4 w-4 text-[#E63946]" />
                <p className="mt-1 font-extrabold text-[#111111]">{truncate(bloodGroup, 12)}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Blood Group</p>
              </div>
              <div className="rounded-xl bg-amber-50/50 border border-amber-100 p-3">
                <AlertTriangle className="mx-auto h-4 w-4 text-amber-600" />
                <p className="mt-1 font-extrabold text-[#111111]">{truncate(allergies, 12)}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Allergies</p>
              </div>
              <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-3">
                <Heart className="mx-auto h-4 w-4 text-blue-600" />
                <p className="mt-1 font-extrabold text-[#111111]">{truncate(conditions, 12)}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Conditions</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onViewProfile}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>View Full Medical Profile</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* RECENT EMERGENCY ACTIVITY */}
        <div className="rounded-2xl bg-white p-5 border border-[#E5E7EB] shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-700" />
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Recent Activity Log
                </h2>
              </div>
              <span className="text-[9px] font-bold text-gray-500">2 Incidents</span>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: "EMG-1180",
                  type: "Medical Emergency",
                  date: "Mar 2, 2026",
                  status: "Resolved",
                  facility: "City Care Hospital",
                },
                {
                  id: "EMG-1092",
                  type: "Road Accident Assistance",
                  date: "Jan 15, 2026",
                  status: "Resolved",
                  facility: "Fortis Hospital",
                },
              ].map((inc) => (
                <div
                  key={inc.id}
                  className="rounded-xl border border-gray-150 p-3 bg-gray-50/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-gray-900">{inc.id}</span>
                      <span className="text-gray-400">·</span>
                      <span className="font-bold text-gray-800">{inc.type}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {inc.date} · Admitted to {inc.facility}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold">
                    {inc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onViewHistory}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>View Complete Incident History</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* AI FIRST AID DIALOG */}
      <Dialog
        open={activeModal === "first-aid"}
        onOpenChange={(open) => {
          if (!open) {
            setActiveModal(null);
            setSelectedGuide(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto bg-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#E63946]">
              <Brain className="h-5 w-5 animate-pulse" />
              <span>AI First Aid Assistant</span>
            </DialogTitle>
          </DialogHeader>

          {/* Explicit Medical Care Disclaimer */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[10px] text-amber-900 font-medium flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Emergency Guidance Only:</strong> This AI assistant provides immediate
              first-aid instructions while emergency medical services are en route. It is not a
              replacement for professional medical care.
            </p>
          </div>

          {!selectedGuide ? (
            <div className="space-y-2 py-2">
              <p className="text-xs text-[#525866] mb-1">
                Select an emergency situation for guided instructions:
              </p>
              {Object.entries(FIRST_AID_GUIDES).map(([key, guide]) => {
                const Icon = guide.icon;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedGuide(key);
                      setCurrentStep(0);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-white p-3.5 text-left transition-all hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-red-50 p-2 text-[#E63946]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111111]">{guide.title}</p>
                        <p className="text-[10px] text-[#525866]">
                          {guide.steps.length} step guide
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#525866]" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2">
                <button
                  onClick={() => setSelectedGuide(null)}
                  className="rounded-lg p-1 hover:bg-slate-100"
                >
                  <ChevronLeft className="h-4 w-4 text-[#525866]" />
                </button>
                <p className="text-xs font-bold text-[#111111]">
                  {FIRST_AID_GUIDES[selectedGuide].title}
                </p>
              </div>

              <div className="rounded-2xl bg-red-50/60 border border-red-100 p-4 text-center space-y-2">
                <span className="rounded-full bg-[#E63946]/15 px-2.5 py-0.5 text-[10px] font-extrabold text-[#E63946] uppercase">
                  Step {currentStep + 1} of {FIRST_AID_GUIDES[selectedGuide].steps.length}
                </span>
                <h3 className="text-sm font-extrabold text-gray-900">
                  {FIRST_AID_GUIDES[selectedGuide].steps[currentStep].title}
                </h3>
                <p className="text-xs leading-relaxed text-[#525866]">
                  {FIRST_AID_GUIDES[selectedGuide].steps[currentStep].desc}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (currentStep > 0) setCurrentStep(currentStep - 1);
                    else setSelectedGuide(null);
                  }}
                  className="flex-1 rounded-xl border border-[#E5E7EB] py-2 text-xs font-bold text-gray-700 hover:bg-slate-50 cursor-pointer"
                >
                  {currentStep > 0 ? "Previous" : "Back"}
                </button>
                <button
                  onClick={() => {
                    if (currentStep < FIRST_AID_GUIDES[selectedGuide].steps.length - 1)
                      setCurrentStep(currentStep + 1);
                    else {
                      toast.success("First-aid guide review complete.");
                      setSelectedGuide(null);
                      setActiveModal(null);
                    }
                  }}
                  className="flex-1 rounded-xl bg-[#E63946] py-2 text-xs font-bold text-white hover:bg-[#C32F3A] cursor-pointer"
                >
                  {currentStep === FIRST_AID_GUIDES[selectedGuide].steps.length - 1
                    ? "Finish"
                    : "Next"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ENHANCED NEARBY HOSPITALS DIALOG */}
      <Dialog
        open={activeModal === "hospitals"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto bg-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#E63946]">
              <Building2 className="h-5 w-5" />
              <span>Nearby Emergency Hospitals</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-[#525866]">Live hospital readiness near Sector 62 Noida:</p>
            {HOSPITALS_LIST.map((hosp) => (
              <div
                key={hosp.name}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-4 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#111111]">{hosp.name}</h3>
                    <p className="text-[10px] text-[#525866] mt-0.5">
                      {hosp.address} · {hosp.distance}
                    </p>
                    <p className="text-[9px] text-emerald-600 font-bold mt-1">
                      {hosp.traumaStatus}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700 shrink-0">
                    ETA {hosp.eta}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-1.5 font-semibold">
                    ICU Beds:{" "}
                    <span className="font-bold text-emerald-600">
                      {hosp.icuFree}/{hosp.icuTotal} Free
                    </span>
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-1.5 font-semibold">
                    ER Bays:{" "}
                    <span className="font-bold text-blue-600">
                      {hosp.erFree}/{hosp.erTotal} Free
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`tel:${hosp.phone.replace(/\s+/g, "")}`}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-[#E5E7EB] py-2 text-[10px] font-bold text-gray-700 hover:bg-slate-50"
                  >
                    <Phone className="h-3 w-3 text-[#E63946]" /> Call Trauma Desk
                  </a>
                  <button
                    onClick={() => {
                      toast.success(`Critical care dispatch request sent to ${hosp.name}!`);
                      onTriggerSos();
                      setActiveModal(null);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-[#E63946] py-2 text-[10px] font-bold text-white hover:bg-[#C32F3A] cursor-pointer"
                  >
                    <Navigation className="h-3 w-3" /> Route Ambulance
                  </button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* EMERGENCY CHAT DIALOG */}
      <Dialog
        open={activeModal === "chat"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden flex flex-col h-[500px] bg-white">
          <div className="bg-[#E63946] text-white p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
                <Brain className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold leading-tight">AEGIS Emergency Assistant</h3>
                <p className="text-[9px] text-white/85">AI Dispatcher · Live Channel</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8F9FB]">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#E63946] text-white rounded-br-none"
                      : "bg-white text-[#111111] border border-[#E5E7EB] rounded-bl-none shadow-sm"
                  }`}
                >
                  <p>{msg.text}</p>
                  <span
                    className={`block text-[8px] mt-1 text-right ${msg.sender === "user" ? "text-white/60" : "text-[#525866]"}`}
                  >
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3 shadow-sm flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce bg-[#E63946] rounded-full" />
                  <span className="h-1.5 w-1.5 animate-bounce bg-[#E63946] rounded-full delay-75" />
                  <span className="h-1.5 w-1.5 animate-bounce bg-[#E63946] rounded-full delay-150" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-[#E5E7EB] bg-white flex gap-2 items-center">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendChat();
              }}
              placeholder="Describe emergency symptoms or location..."
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#E63946] focus:outline-none"
            />
            <button
              onClick={handleSendChat}
              className="h-8 w-8 grid place-items-center rounded-xl bg-[#E63946] text-white hover:bg-[#C32F3A] cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SHARE LOCATION DIALOG */}
      <Dialog
        open={activeModal === "share"}
        onOpenChange={(open) => {
          if (!open) setActiveModal(null);
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto bg-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#E63946]">
              <Share2 className="h-5 w-5" />
              <span>Share Live Location Link</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase">
                Current Coordinate Beacon
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-800">Sector 62, Noida, UP</span>
                <span className="rounded-md bg-[#E63946]/10 px-2 py-0.5 text-[10px] font-mono text-[#E63946] font-bold">
                  28.6273° N, 77.3725° E
                </span>
              </div>
            </div>
            <button
              onClick={handleShareLocation}
              disabled={sharingLoading}
              className="w-full rounded-xl bg-[#E63946] py-2.5 text-xs font-bold text-white hover:bg-[#C32F3A] flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {sharingLoading ? (
                <span className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Broadcast Live GPS Beacon</span>
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmergencyView({
  sos,
  setSos,
  onTriggerSos,
  listening,
  setListening,
  transcript,
  setTranscript,
  activeSegment,
  setActiveSegment,
  onTrack,
}: {
  sos: boolean;
  setSos: (v: boolean) => void;
  onTriggerSos: (seg?: "Accident" | "Medical" | "Fire") => void;
  listening: boolean;
  setListening: (v: boolean) => void;
  transcript: string;
  setTranscript: (v: string) => void;
  activeSegment: "Accident" | "Medical" | "Fire" | null;
  setActiveSegment: (v: "Accident" | "Medical" | "Fire" | null) => void;
  onTrack: () => void;
}) {
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  const handleToggleVoice = async () => {
    if (listening) {
      setListening(false);
      return;
    }

    setMicPermissionDenied(false);

    // Request microphone permission if supported by browser
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop stream tracks immediately since transcription simulation handles state
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn("Microphone permission denied:", err);
        setMicPermissionDenied(true);
        toast.error("Microphone permission denied. Voice SOS requires microphone access.");
        return;
      }
    }

    setTranscript("");
    setSos(false);
    setActiveSegment(null);
    setListening(true);
    toast.info("🎙️ Voice SOS active. Listening for emergency situation...");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* EMERGENCY DISPATCH HEADER STATUS BANNER */}
      <div className="rounded-2xl bg-white p-5 border border-[#E5E7EB] shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#E63946] animate-pulse" />
            <h1 className="text-base font-black text-gray-900 tracking-tight">
              AEGIS Priority SOS Command Center
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1 font-medium">
            <MapPin className="h-3.5 w-3.5 text-[#E63946]" /> Sector 62 Noida Grid · 5-Second
            Protected Broadcast
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sos ? (
            <span className="rounded-full bg-red-100 border border-red-300 px-3 py-1 text-[10px] font-black text-[#E63946] flex items-center gap-1.5 uppercase">
              <span className="h-2 w-2 rounded-full bg-[#E63946] animate-ping" />
              SOS Active · Dispatch En Route
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Grid Ready · Dispatch Standby
            </span>
          )}
        </div>
      </div>

      {/* MAIN SOS CONTROL CARD */}
      <div className="rounded-3xl bg-white p-8 border border-[#E5E7EB] shadow-md text-center space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">One-Tap SOS</h2>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Tap to initiate protected emergency SOS broadcast with instant GPS beacon streaming.
          </p>
        </div>

        {/* CENTERED LARGE CIRCULAR SOS BUTTON WITH SUBTLE RADAR RINGS */}
        <div className="relative py-4 grid place-items-center">
          {/* Subtle Outer Pulse/Radar Rings */}
          <div
            className={cn(
              "absolute h-64 w-64 rounded-full border border-red-200 opacity-40 transition-all",
              sos ? "animate-ping scale-110" : "scale-100",
            )}
          />
          <div
            className={cn(
              "absolute h-52 w-52 rounded-full border border-red-300 opacity-60 transition-all",
              sos ? "animate-pulse" : "",
            )}
          />

          <button
            type="button"
            onClick={() => onTriggerSos()}
            className={cn(
              "relative z-10 grid h-44 w-44 place-items-center rounded-full text-white shadow-2xl transition-all active:scale-95 cursor-pointer group focus:outline-none focus:ring-4 focus:ring-red-300",
              sos
                ? "bg-gradient-to-br from-[#E63946] to-red-700 pulse-emergency border-4 border-white"
                : "bg-[#E63946] hover:bg-[#C32F3A]",
            )}
          >
            <div className="space-y-1 text-center">
              <Siren className="mx-auto h-12 w-12 text-white animate-pulse group-hover:scale-110 transition-transform" />
              <div className="text-2xl font-black tracking-widest text-white">SOS</div>
              <div className="text-[10px] font-bold text-white/80 uppercase tracking-wider">
                {sos ? "ACTIVE" : "ONE-TAP"}
              </div>
            </div>
          </button>
        </div>

        {/* SOS STATUS INFORMATION */}
        <div className="max-w-lg mx-auto bg-gray-50 rounded-2xl p-4 border border-gray-200 text-xs">
          {sos ? (
            <div className="space-y-2">
              <p className="font-extrabold text-[#E63946] flex items-center justify-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#E63946] animate-ping" />
                Beacon Active · Paramedic Dispatch En Route
              </p>
              <p className="text-[11px] text-gray-600">
                Unit <strong>AMB-1083</strong> assigned with Green Signal Corridor. Estimated ETA:{" "}
                <strong>4m 12s</strong>.
              </p>
              <button
                type="button"
                onClick={onTrack}
                className="mt-1 inline-flex items-center gap-1 text-xs font-black text-[#E63946] hover:underline cursor-pointer"
              >
                <span>Track Emergency Response Live on Map</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-gray-600 font-medium">
              Tap the circular SOS button above to activate the 5-second protected emergency
              countdown. You can cancel within 5 seconds if tapped accidentally.
            </p>
          )}
        </div>

        {/* EMERGENCY TYPE SELECTION BUTTONS */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Specific Emergency Type (Optional)
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              {
                id: "Accident" as const,
                label: "Road Accident",
                icon: AlertTriangle,
              },
              {
                id: "Medical" as const,
                label: "Medical Crisis",
                icon: Heart,
              },
              {
                id: "Fire" as const,
                label: "Fire / Rescue",
                icon: Zap,
              },
            ].map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeSegment === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onTriggerSos(cat.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold transition-all border cursor-pointer",
                    isSelected
                      ? "bg-[#E63946] text-white border-[#E63946] shadow-sm"
                      : "bg-[#F8F9FB] text-gray-700 border-gray-200 hover:bg-white hover:border-gray-300",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* VOICE SOS CONTROL SECTION */}
      <div className="rounded-3xl bg-white p-6 border border-[#E5E7EB] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-red-50 text-[#E63946] flex items-center justify-center">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Voice SOS Hands-Free Assistant
              </h3>
              <p className="text-[10px] text-gray-500">
                Speak your emergency situation naturally for automated dispatch recognition.
              </p>
            </div>
          </div>
          {listening && (
            <span className="rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-[9px] font-extrabold text-[#E63946] flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E63946] animate-pulse" />
              Recording &amp; Transcribing
            </span>
          )}
        </div>

        {micPermissionDenied && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-medium">
            ⚠️ <strong>Microphone Permission Blocked:</strong> Please allow microphone access in
            your browser settings to use Voice SOS.
          </div>
        )}

        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <button
            type="button"
            onClick={handleToggleVoice}
            className={cn(
              "grid h-16 w-16 place-items-center rounded-full transition-all shrink-0 cursor-pointer shadow-md focus:outline-none",
              listening
                ? "bg-[#E63946] text-white pulse-emergency border-2 border-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100",
            )}
          >
            {listening ? (
              <Mic className="h-7 w-7 animate-pulse text-white" />
            ) : (
              <MicOff className="h-7 w-7 text-gray-500" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
              {listening ? "LISTENING TO VOICE INPUT..." : "TAP MICROPHONE TO START VOICE SOS"}
            </p>
            <div className="mt-1 min-h-[32px] rounded-xl bg-white p-2.5 border border-gray-200 text-xs font-mono text-gray-800">
              {transcript ? (
                <p className="text-[#E63946] font-semibold">{transcript}</p>
              ) : (
                <p className="text-gray-400 italic font-sans">
                  {listening
                    ? 'Listening... Try saying "I am reporting a road accident near Sector 62"'
                    : '"I am reporting a medical emergency near Sector 62..."'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EMERGENCY TYPE SELECTION BUTTONS */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Specific Emergency Type (Optional)
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            {
              id: "Accident" as const,
              label: "Road Accident",
              icon: AlertTriangle,
            },
            {
              id: "Medical" as const,
              label: "Medical Crisis",
              icon: Heart,
            },
            {
              id: "Fire" as const,
              label: "Fire / Rescue",
              icon: Zap,
            },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeSegment === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onTriggerSos(cat.id)}
                className={cn(
                  "flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold transition-all border cursor-pointer",
                  isSelected
                    ? "bg-[#E63946] text-white border-[#E63946] shadow-sm"
                    : "bg-[#F8F9FB] text-gray-700 border-gray-200 hover:bg-white hover:border-gray-300",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TrackingView({ sos, setSos }: { sos: boolean; setSos: (v: boolean) => void }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const handleRefreshStream = () => {
    setIsRefreshing(true);
    setConnectionError(false);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Live GPS tracking stream updated.");
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* COMMAND CENTER TRACKING HEADER */}
      <div className="rounded-2xl bg-white p-5 border border-[#E5E7EB] shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                connectionError
                  ? "bg-red-500"
                  : sos
                    ? "bg-[#E63946] animate-ping"
                    : "bg-emerald-500 animate-pulse",
              )}
            />
            <h1 className="text-base font-black text-gray-900 tracking-tight">
              Live Emergency GPS Tracking &amp; Corridor Command
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1.5 font-medium">
            <MapPin className="h-3.5 w-3.5 text-[#E63946]" /> Sector 62 Noida · Beacon ID: EMG-1258
            (28.6273° N, 77.3725° E)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshStream}
            disabled={isRefreshing}
            className="rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Activity className={cn("h-3.5 w-3.5 text-gray-600", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Stream"}</span>
          </button>
        </div>
      </div>

      {/* CONNECTION ERROR STATE ALERT */}
      {connectionError && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs text-red-900 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600 shrink-0" />
            <p>
              <strong>GPS Telemetry Warning:</strong> Live tracking stream lost signal connection.
              Attempting automatic reconnect to Noida Dispatch Network.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefreshStream}
            className="rounded-lg bg-red-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-red-700 cursor-pointer shrink-0"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* MAIN LIVE MAP CONTAINER */}
      <div className="rounded-3xl bg-white overflow-hidden border border-[#E5E7EB] shadow-md flex flex-col">
        {/* MAP HEADER BAR */}
        <div className="bg-gray-900 text-white px-5 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-gray-200">TACTICAL MAP BEACON · LIVE STREAM</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase">
            <span>Grid 62-NOIDA</span>
            <span>·</span>
            <span>ALS Unit Active</span>
          </div>
        </div>

        {/* REAL INTERACTIVE LIVE MAP */}
        <LiveMap
          className="min-h-[50vh] rounded-none border-0"
          showCorridor={sos}
          showGrid={true}
          dark={false}
          route={sos ? { from: [20, 75], via: [[40, 55]], to: [78, 22] } : undefined}
          markers={[
            {
              id: "me",
              type: "emergency",
              x: 20,
              y: 75,
              active: sos,
              label: "You (Sector 62)",
            },
            {
              id: "amb",
              type: "ambulance",
              x: sos ? 38 : 60,
              y: sos ? 58 : 65,
              active: sos,
              label: "Unit AMB-1083 (ALS)",
            },
            {
              id: "h1",
              type: "hospital",
              x: 78,
              y: 22,
              label: "City Care Trauma Hub",
            },
          ]}
        />
      </div>

      {/* AMBULANCE ETA & LOCATION METRICS CARD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white p-4 border border-[#E5E7EB] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ambulance ETA</span>
            <Clock className="h-4 w-4 text-[#E63946]" />
          </div>
          <p className="text-xl font-black text-gray-900">{sos ? "4m 12s" : "Standby"}</p>
          <p className="text-[10px] text-emerald-600 font-bold">
            {sos ? "Priority Corridor Active" : "Grid Ready"}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-[#E5E7EB] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Ambulance Distance
            </span>
            <Siren className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-gray-900">{sos ? "2.4 km" : "1.8 km"}</p>
          <p className="text-[10px] text-gray-500 font-medium">From your GPS beacon</p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-[#E5E7EB] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Assigned Unit</span>
            <Shield className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-base font-black text-gray-900">AMB-1083</p>
          <p className="text-[10px] text-purple-600 font-bold">ALS · Paramedic Vivaan</p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-[#E5E7EB] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Assigned Hospital
            </span>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-base font-black text-gray-900">City Care Hub</p>
          <p className="text-[10px] text-gray-500 font-medium">3.4 km · Level 1 Trauma</p>
        </div>
      </div>

      {/* RESPONSE PROGRESS STEPPER */}
      <div className="rounded-3xl bg-white p-6 border border-[#E5E7EB] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#E63946]" />
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Real-Time Emergency Response Progress
            </h2>
          </div>
          <span className="text-[10px] font-bold text-gray-500 font-mono">
            {sos ? "5/5 Stages Active" : "Monitoring Inactive"}
          </span>
        </div>

        <div className="space-y-3">
          {[
            {
              stage: "1. SOS Received & Coordinates Streamed",
              desc: "GPS location locked at 28.6273° N, 77.3725° E",
              time: "09:41:02 AM",
              status: sos ? "completed" : "pending",
            },
            {
              stage: "2. Ambulance Unit AMB-1083 Dispatched",
              desc: "Driver Vivaan Sharma & Senior Paramedic Team assigned",
              time: "09:41:18 AM",
              status: sos ? "completed" : "pending",
            },
            {
              stage: "3. Green Traffic Corridor Synchronized",
              desc: "6 Traffic signals locked green via Traffic Command Center",
              time: "09:41:45 AM",
              status: sos ? "completed" : "pending",
            },
            {
              stage: "4. Hospital Alerted & ER Trauma Bay Reserved",
              desc: "City Care Trauma Center prep team notified",
              time: "09:42:10 AM",
              status: sos ? "active" : "pending",
            },
            {
              stage: "5. Patient Pick-Up & ER Handover",
              desc: "Paramedics on site for immediate vital check & transport",
              time: "Pending",
              status: "pending",
            },
          ].map((step, idx) => {
            const isCompleted = step.status === "completed";
            const isActive = step.status === "active";

            return (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-4 rounded-2xl p-4 border transition-all text-xs",
                  isCompleted
                    ? "bg-emerald-50/50 border-emerald-200"
                    : isActive
                      ? "bg-red-50/50 border-red-200 shadow-sm"
                      : "bg-gray-50/50 border-gray-200 opacity-60",
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  ) : isActive ? (
                    <div className="h-6 w-6 rounded-full bg-[#E63946] text-white flex items-center justify-center font-bold animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <p
                      className={cn("font-extrabold text-[#111111]", isActive && "text-[#E63946]")}
                    >
                      {step.stage}
                    </p>
                    <span className="text-[10px] font-mono text-gray-500">{step.time}</span>
                  </div>
                  <p className="text-[11px] text-gray-600">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* EMERGENCY DIAL BUTTON */}
        <div className="pt-2">
          <a
            href="tel:108"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E63946] hover:bg-[#C32F3A] py-3.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
          >
            <PhoneCall className="h-4 w-4 animate-pulse" />
            <span>Dial National Emergency Desk 108</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function HistoryView() {
  const [selectedPeriod, setSelectedPeriod] = useState<"all" | "mar2026" | "jan2026" | "older">(
    "all",
  );
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "Resolved" | "Active" | "Cancelled" | "Pending"
  >("all");
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const incidentsData = [
    {
      id: "EMG-1258",
      type: "Medical Emergency",
      category: "Medical",
      date: "Mar 15, 2026",
      time: "09:41 AM",
      status: "Active",
      hospital: "City Care Emergency Trauma Hub",
      hospitalPhone: "+91 120 240 5555",
      location: "Sector 62, Noida, UP (28.6273° N, 77.3725° E)",
      ambulance: "Unit AMB-1083 (ALS Unit)",
      paramedic: "Vivaan Sharma & Emergency Team",
      vitalSummary: "BP: 120/80 · Pulse: 78 bpm · SpO2: 98%",
      timeline: [
        { time: "09:41 AM", label: "SOS Triggered via One-Tap" },
        { time: "09:41 AM", label: "Unit AMB-1083 Dispatched" },
        { time: "09:42 AM", label: "Green Corridor Synchronized (6 Signals)" },
      ],
      monthKey: "mar2026",
    },
    {
      id: "EMG-1180",
      type: "Cardiac Distress Care",
      category: "Medical",
      date: "Mar 2, 2026",
      time: "02:15 PM",
      status: "Resolved",
      hospital: "City Care Hospital",
      hospitalPhone: "+91 120 240 5555",
      location: "Sector 62 Crossing, Noida",
      ambulance: "Unit AMB-1042 (ALS Unit)",
      paramedic: "Dr. Ananya Roy & Paramedic Team",
      vitalSummary: "BP: 135/88 · Pulse: 84 bpm · SpO2: 96%",
      timeline: [
        { time: "02:15 PM", label: "SOS Received from Citizen Portal" },
        { time: "02:17 PM", label: "ALS Ambulance Arrived on Scene" },
        { time: "02:35 PM", label: "Patient Handover Completed at City Care ER" },
      ],
      monthKey: "mar2026",
    },
    {
      id: "EMG-1092",
      type: "Road Accident Assistance",
      category: "Accident",
      date: "Jan 15, 2026",
      time: "06:30 PM",
      status: "Resolved",
      hospital: "Fortis Hospital",
      hospitalPhone: "+91 120 430 0000",
      location: "Bypass Expressway, Sector 62 Noida",
      ambulance: "Unit AMB-1020 (BLS Unit)",
      paramedic: "Rahul Kumar & Response Crew",
      vitalSummary: "BP: 118/75 · Pulse: 72 bpm · SpO2: 99%",
      timeline: [
        { time: "06:30 PM", label: "Accident Priority Beacon Activated" },
        { time: "06:33 PM", label: "First Responder Unit Dispatched" },
        { time: "06:50 PM", label: "Admitted to Fortis Trauma Desk" },
      ],
      monthKey: "jan2026",
    },
    {
      id: "EMG-0941",
      type: "Kitchen Fire Smoke Hazard",
      category: "Fire",
      date: "Dec 10, 2025",
      time: "11:20 AM",
      status: "Cancelled",
      hospital: "Metro Hospital & Heart Institute",
      hospitalPhone: "+91 120 422 9999",
      location: "Apartment Block B, Sector 62 Noida",
      ambulance: "Unit AMB-1011",
      paramedic: "Sector 62 Emergency Response Desk",
      vitalSummary: "No injuries reported · False alarm cancelled by citizen",
      timeline: [
        { time: "11:20 AM", label: "Emergency Alert Triggered" },
        { time: "11:22 AM", label: "Cancelled by User within Protection Window" },
      ],
      monthKey: "older",
    },
  ];

  const handleRefreshHistory = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Emergency activity history synced with AEGIS Grid.");
    }, 600);
  };

  const filteredIncidents = incidentsData.filter((inc) => {
    if (selectedPeriod !== "all" && inc.monthKey !== selectedPeriod) return false;
    if (selectedStatus !== "all" && inc.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* MAIN HEADER & REFRESH BAR */}
      <div className="rounded-2xl bg-white p-5 border border-[#E5E7EB] shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">
            Emergency Activity History
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 font-medium">
            View all your past emergency requests, dispatch details, and hospital resolution logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshHistory}
            disabled={isRefreshing}
            className="rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3.5 py-1.5 text-xs font-bold text-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Activity className={cn("h-3.5 w-3.5 text-gray-600", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? "Syncing Logs..." : "Refresh History"}</span>
          </button>
        </div>
      </div>

      {/* FUNCTIONAL FILTER CONTROLS */}
      <div className="rounded-2xl bg-white p-4 border border-[#E5E7EB] shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="font-bold text-gray-700">Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-800 focus:border-[#E63946] focus:outline-none cursor-pointer"
            >
              <option value="all">All Time Records</option>
              <option value="mar2026">March 2026</option>
              <option value="jan2026">January 2026</option>
              <option value="older">Older Records (2025)</option>
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="font-bold text-gray-700">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-800 focus:border-[#E63946] focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Resolved">Resolved</option>
              <option value="Active">Active</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] font-bold text-gray-500 font-mono">
          Showing {filteredIncidents.length} of {incidentsData.length} records
        </div>
      </div>

      {/* EMERGENCY HISTORY CARDS LIST */}
      {filteredIncidents.length > 0 ? (
        <div className="space-y-3.5">
          {filteredIncidents.map((inc) => {
            const isResolved = inc.status === "Resolved";
            const isActive = inc.status === "Active";
            const isCancelled = inc.status === "Cancelled";

            const TypeIcon =
              inc.category === "Accident" ? AlertTriangle : inc.category === "Fire" ? Zap : Heart;

            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className={cn(
                  "relative rounded-2xl bg-white p-5 border border-[#E5E7EB] shadow-sm hover:shadow-md transition-all space-y-3 cursor-pointer group overflow-hidden",
                  // Subtle left status accent line
                  isResolved && "border-l-4 border-l-emerald-500",
                  isActive && "border-l-4 border-l-[#E63946]",
                  isCancelled && "border-l-4 border-l-gray-400",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                        isResolved && "bg-emerald-50 text-emerald-700",
                        isActive && "bg-red-50 text-[#E63946]",
                        isCancelled && "bg-gray-100 text-gray-600",
                      )}
                    >
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-gray-900">{inc.id}</span>
                        <span className="text-gray-300">·</span>
                        <span className="font-extrabold text-xs text-gray-800">{inc.type}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                        {inc.date} at {inc.time}
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "rounded-full px-3 py-0.5 text-[10px] font-extrabold uppercase border tracking-wider flex items-center gap-1",
                      isResolved && "bg-emerald-50 text-emerald-700 border-emerald-200",
                      isActive && "bg-red-50 text-[#E63946] border-red-200 animate-pulse",
                      isCancelled && "bg-gray-100 text-gray-700 border-gray-200",
                    )}
                  >
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#E63946]" />}
                    {inc.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-200/80">
                  <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                    <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span>Admitted to {inc.hospital}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700 font-medium truncate">
                    <MapPin className="h-3.5 w-3.5 text-[#E63946] shrink-0" />
                    <span className="truncate">{inc.location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-gray-500 font-mono">
                    Assigned: {inc.ambulance}
                  </span>
                  <span className="font-bold text-[#E63946] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                    View Full Incident Details →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* PROFESSIONAL EMPTY STATE */
        <div className="rounded-3xl bg-white p-10 text-center border border-[#E5E7EB] shadow-sm space-y-3">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gray-100 text-gray-400">
            <Clock className="h-7 w-7" />
          </div>
          <h3 className="text-sm font-extrabold text-gray-900">No Emergency Records Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            No incident logs match your selected date period or status filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedPeriod("all");
              setSelectedStatus("all");
            }}
            className="mt-2 inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* SECURITY FOOTER NOTE */}
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-slate-500 shrink-0" />
          <span>
            Emergency activity logs are securely stored in accordance with national health telemetry
            standards.
          </span>
        </div>
      </div>

      {/* EMERGENCY INCIDENT DETAILS DIALOG */}
      {selectedIncident && (
        <Dialog open={true} onOpenChange={() => setSelectedIncident(null)}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-white p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#E63946]" />
                  <span className="font-mono text-base font-black text-gray-900">
                    Incident Report {selectedIncident.id}
                  </span>
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold">
                  {selectedIncident.status}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Emergency Type</p>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedIncident.type}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">Date &amp; Time</p>
                  <p className="font-bold text-gray-900 mt-0.5">
                    {selectedIncident.date} · {selectedIncident.time}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase text-gray-400">
                  Assigned Emergency Care Unit &amp; Hospital
                </p>
                <div className="space-y-1">
                  <p className="font-extrabold text-gray-900">{selectedIncident.hospital}</p>
                  <p className="text-[11px] text-gray-600">
                    Ambulance: <strong>{selectedIncident.ambulance}</strong> (
                    {selectedIncident.paramedic})
                  </p>
                  <a
                    href={`tel:${selectedIncident.hospitalPhone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-1 text-[#E63946] font-bold hover:underline mt-1"
                  >
                    <Phone className="h-3 w-3" /> Call Hospital Desk (
                    {selectedIncident.hospitalPhone})
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3 space-y-1">
                <p className="text-[10px] font-bold uppercase text-gray-400">
                  Field Vitals &amp; Paramedic Care Summary
                </p>
                <p className="font-mono text-gray-800 font-semibold">
                  {selectedIncident.vitalSummary}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-gray-400">
                  Incident Event Timeline
                </p>
                <div className="space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  {selectedIncident.timeline?.map((t: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px]">
                      <span className="font-mono font-bold text-gray-500">{t.time}</span>
                      <span className="text-gray-300">·</span>
                      <span className="font-medium text-gray-800">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedIncident(null)}
              className="w-full rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Close Incident Details
            </button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ProfileView() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Load actual persisted profile state
  const [profileData, setProfileData] = useState(() => getProfile("citizen"));
  const name = getDisplayName("citizen", user);

  // Consent states persisted in localStorage
  const [shareBloodGroup, setShareBloodGroup] = useState(() => profileData.shareBloodGroup ?? true);
  const [shareAllergies, setShareAllergies] = useState(() => profileData.shareAllergies ?? true);
  const [shareConditions, setShareConditions] = useState(() => profileData.shareConditions ?? true);
  const [shareContacts, setShareContacts] = useState(() => profileData.shareContacts ?? true);

  // Modals state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editMedicalOpen, setEditMedicalOpen] = useState(false);
  const [editContactOpen, setEditContactOpen] = useState(false);

  // Edit Profile Form State
  const [editName, setEditName] = useState(name);
  const [editPhone, setEditPhone] = useState(profileData.phone || user?.mobileNumber || "");
  const [editEmail, setEditEmail] = useState(profileData.email || user?.email || "");

  // Edit Medical Form State
  const [editBloodGroup, setEditBloodGroup] = useState(profileData.bloodGroup || "O Positive");
  const [editAllergies, setEditAllergies] = useState(
    profileData.allergies || "Penicillin, Sulfa drugs",
  );
  const [editConditions, setEditConditions] = useState(
    profileData.conditions || profileData.medicalConditions || "Hypertension (controlled)",
  );

  // Edit Emergency Contact Form State
  const [editContactName, setEditContactName] = useState(
    profileData.emergencyName || "Priya Verma",
  );
  const [editContactRel, setEditContactRel] = useState(
    profileData.emergencyRelationship || "Spouse",
  );
  const [editContactPhone, setEditContactPhone] = useState(
    profileData.emergencyNumber || "+91 98765 43210",
  );

  const handleSaveProfileInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      fullName: editName,
      name: editName,
      phone: editPhone,
      mobileNumber: editPhone,
      email: editEmail,
    };
    saveProfile("citizen", updated);
    setProfileData(getProfile("citizen"));
    setEditProfileOpen(false);
    toast.success("Profile details updated successfully!");
  };

  const handleSaveMedicalInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      bloodGroup: editBloodGroup,
      allergies: editAllergies,
      conditions: editConditions,
      medicalConditions: editConditions,
    };
    saveProfile("citizen", updated);
    setProfileData(getProfile("citizen"));
    setEditMedicalOpen(false);
    toast.success("Medical profile information updated & synced!");
  };

  const handleSaveContactInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedContacts = `${editContactName} (${editContactRel}) - ${editContactPhone}`;
    const updated = {
      emergencyName: editContactName,
      emergencyRelationship: editContactRel,
      emergencyNumber: editContactPhone,
      emergencyContacts: formattedContacts,
    };
    saveProfile("citizen", updated);
    setProfileData(getProfile("citizen"));
    setEditContactOpen(false);
    toast.success("Emergency contact details saved!");
  };

  const handleToggleConsent = (key: string, currentVal: boolean, setFn: (v: boolean) => void) => {
    const newVal = !currentVal;
    setFn(newVal);
    saveProfile("citizen", { [key]: newVal });
    setProfileData(getProfile("citizen"));
    toast.success(`Consent preference ${newVal ? "enabled" : "disabled"}.`);
  };

  const handleUserLogout = () => {
    logout();
    toast.info("Logged out of AEGIS Citizen Portal.");
    navigate({ to: "/login" });
  };

  const bloodGroup = profileData.bloodGroup || "Not provided";
  const allergies = profileData.allergies || "Not provided";
  const conditions = profileData.conditions || profileData.medicalConditions || "Not provided";
  const emergencyContact =
    profileData.emergencyContacts ||
    (profileData.emergencyName
      ? `${profileData.emergencyName} (${profileData.emergencyRelationship || ""}) - ${profileData.emergencyNumber || ""}`
      : "Not provided");

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* HEADER PROFILE CARD */}
      <div className="rounded-3xl bg-white p-6 border border-[#E5E7EB] shadow-md space-y-4">
        <ProfileHeader
          name={name}
          subtitle={`Citizen ID · ${user?.id || "usr-citizen"}`}
          role="citizen"
        />

        {/* PROFILE HEADER ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
          <button
            type="button"
            onClick={() => setEditProfileOpen(true)}
            className="rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3.5 py-2 font-bold text-gray-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <User className="h-3.5 w-3.5 text-[#E63946]" />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setEditMedicalOpen(true)}
            className="rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3.5 py-2 font-bold text-gray-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Pill className="h-3.5 w-3.5 text-blue-600" />
            <span>Medical Info</span>
          </button>
          <button
            type="button"
            onClick={() => setEditContactOpen(true)}
            className="rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3.5 py-2 font-bold text-gray-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="h-3.5 w-3.5 text-purple-600" />
            <span>Emergency Contacts</span>
          </button>
          <button
            type="button"
            onClick={handleUserLogout}
            className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-3.5 py-2 font-bold text-[#E63946] transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            <LogOut className="h-3.5 w-3.5 text-[#E63946]" />
            <span>Logout Session</span>
          </button>
        </div>
      </div>

      {/* TWO COLUMN PROFILE & CONSENT GRID */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* COLUMN 1: MEDICAL DATA SHARING & CONSENT CONTROLS */}
        <div className="space-y-6">
          {/* CONSENT CONTROL CARD */}
          <div className="rounded-3xl bg-white p-6 border border-[#E5E7EB] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Medical Data Sharing &amp; Consent
                </h2>
                <p className="text-[10px] text-gray-500">
                  Controls info automatically streamed to responders during SOS.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-blue-50/60 border border-blue-200 p-4 text-xs text-blue-950 space-y-1.5 leading-relaxed">
              <p>
                <strong>Security Guarantee:</strong> Medical data is encrypted at rest in local
                session storage and transmitted exclusively to verified emergency dispatchers upon
                One-Tap SOS activation.
              </p>
            </div>

            {/* CONSENT SWITCHES */}
            <div className="space-y-2.5">
              {[
                {
                  key: "shareBloodGroup",
                  label: "Share Blood Group on SOS",
                  sub: "Allows trauma ER to prep compatible blood units",
                  state: shareBloodGroup,
                  setFn: setShareBloodGroup,
                },
                {
                  key: "shareAllergies",
                  label: "Share Severe Allergies on SOS",
                  sub: "Prevents adverse drug reactions during field care",
                  state: shareAllergies,
                  setFn: setShareAllergies,
                },
                {
                  key: "shareConditions",
                  label: "Share Medical Conditions on SOS",
                  sub: "Provides history of hypertension, diabetes, etc.",
                  state: shareConditions,
                  setFn: setShareConditions,
                },
                {
                  key: "shareContacts",
                  label: "Share Emergency Contacts on SOS",
                  sub: "Alerts designated contacts via SMS beacon",
                  state: shareContacts,
                  setFn: setShareContacts,
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-2xl bg-gray-50/60 p-3.5 border border-gray-200 text-xs"
                >
                  <div>
                    <p className="font-extrabold text-gray-900">{item.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{item.sub}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleConsent(item.key, item.state, item.setFn)}
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-black uppercase transition-all cursor-pointer border shrink-0 ml-2",
                      item.state
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-gray-200 text-gray-600 border-gray-300",
                    )}
                  >
                    {item.state ? "Consent Granted" : "Restricted"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* EMERGENCY CONTACT DETAILS CARD */}
          <div className="rounded-3xl bg-white p-6 border border-[#E5E7EB] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Designated Emergency Contact
                </h2>
              </div>
              <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-[9px] font-bold">
                Primary Contact
              </span>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold text-gray-900">
                    {profileData.emergencyName || "Priya Verma"}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Relationship: {profileData.emergencyRelationship || "Spouse"}
                  </p>
                </div>
                <a
                  href={`tel:${(profileData.emergencyNumber || "+91 98765 43210").replace(/\s+/g, "")}`}
                  className="rounded-xl bg-purple-600 text-white px-3 py-1.5 font-bold text-[11px] hover:bg-purple-700 transition-colors flex items-center gap-1"
                >
                  <Phone className="h-3 w-3" /> Call Contact
                </a>
              </div>
              <p className="font-mono text-gray-700 font-bold pt-1">
                {profileData.emergencyNumber || "+91 98765 43210"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setEditContactOpen(true)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 py-2.5 text-xs font-bold text-gray-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Manage &amp; Edit Emergency Contact</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* COLUMN 2: MEDICAL PROFILE OVERVIEW & QUICK ACTIONS */}
        <div className="space-y-6">
          {/* MEDICAL PROFILE OVERVIEW CARD */}
          <div className="rounded-3xl bg-white p-6 border border-[#E5E7EB] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#E63946]" />
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Medical Profile Overview
                </h2>
              </div>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live Synced
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3.5 border border-gray-200/80">
                <Droplets className="h-5 w-5 text-[#E63946] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Blood Group</p>
                  <p className="font-extrabold text-gray-900 text-sm mt-0.5">{bloodGroup}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3.5 border border-gray-200/80">
                <Pill className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase text-gray-400">Severe Allergies</p>
                  <p className="font-bold text-gray-900 mt-0.5">{allergies}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3.5 border border-gray-200/80">
                <Heart className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase text-gray-400">
                    Medical Conditions &amp; History
                  </p>
                  <p className="font-bold text-gray-900 mt-0.5">{conditions}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3.5 border border-gray-200/80">
                <Users className="h-5 w-5 text-purple-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase text-gray-400">
                    Emergency Contact Record
                  </p>
                  <p className="font-bold text-gray-900 mt-0.5 truncate">{emergencyContact}</p>
                </div>
              </div>
            </div>
          </div>

          {/* QUICK ACTIONS CARD */}
          <div className="rounded-3xl bg-white p-6 border border-[#E5E7EB] shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
              Profile Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditMedicalOpen(true)}
                className="rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 p-3 text-left transition-colors cursor-pointer space-y-1"
              >
                <Pill className="h-4 w-4 text-[#E63946]" />
                <p className="text-xs font-bold text-gray-900">Update Medical</p>
                <p className="text-[9px] text-gray-500">Edit blood, allergies &amp; conditions</p>
              </button>

              <button
                type="button"
                onClick={() => setEditContactOpen(true)}
                className="rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 p-3 text-left transition-colors cursor-pointer space-y-1"
              >
                <Users className="h-4 w-4 text-purple-600" />
                <p className="text-xs font-bold text-gray-900">Manage Contacts</p>
                <p className="text-[9px] text-gray-500">Update emergency phone &amp; name</p>
              </button>
            </div>
          </div>

          {/* SECURITY & TELEMETRY SECTION */}
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-5 space-y-2 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Shield className="h-4 w-4 text-slate-600" />
              <span>Security &amp; Local Persistence Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Your profile preferences and consent settings are stored securely in browser local
              storage under your unique citizen identifier (`aegis-profile:${user?.id || "citizen"}
              `). Consent toggles update immediately across active SOS dispatches.
            </p>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE DIALOG */}
      {editProfileOpen && (
        <Dialog open={true} onOpenChange={setEditProfileOpen}>
          <DialogContent className="sm:max-w-md bg-white p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900">
                <User className="h-5 w-5 text-[#E63946]" />
                <span>Edit Account Details</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveProfileInfo} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 font-semibold focus:border-[#E63946] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Mobile Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 font-semibold focus:border-[#E63946] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 font-semibold focus:border-[#E63946] focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#E63946] py-2.5 font-bold text-white hover:bg-[#C32F3A] cursor-pointer"
                >
                  Save Profile Details
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT MEDICAL INFORMATION DIALOG */}
      {editMedicalOpen && (
        <Dialog open={true} onOpenChange={setEditMedicalOpen}>
          <DialogContent className="sm:max-w-md bg-white p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900">
                <Pill className="h-5 w-5 text-blue-600" />
                <span>Update Medical Profile</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveMedicalInfo} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Blood Group</label>
                <select
                  value={editBloodGroup}
                  onChange={(e) => setEditBloodGroup(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 font-semibold focus:border-[#E63946] focus:outline-none bg-white cursor-pointer"
                >
                  <option value="O Positive">O Positive (O+)</option>
                  <option value="O Negative">O Negative (O-)</option>
                  <option value="A Positive">A Positive (A+)</option>
                  <option value="A Negative">A Negative (A-)</option>
                  <option value="B Positive">B Positive (B+)</option>
                  <option value="B Negative">B Negative (B-)</option>
                  <option value="AB Positive">AB Positive (AB+)</option>
                  <option value="AB Negative">AB Negative (AB-)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Severe Allergies</label>
                <input
                  type="text"
                  value={editAllergies}
                  onChange={(e) => setEditAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts, Sulfa drugs"
                  className="w-full rounded-xl border border-gray-200 p-2.5 font-semibold focus:border-[#E63946] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Chronic Medical Conditions
                </label>
                <input
                  type="text"
                  value={editConditions}
                  onChange={(e) => setEditConditions(e.target.value)}
                  placeholder="e.g. Hypertension, Asthma, Diabetes"
                  className="w-full rounded-xl border border-gray-200 p-2.5 font-semibold focus:border-[#E63946] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditMedicalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#E63946] py-2.5 font-bold text-white hover:bg-[#C32F3A] cursor-pointer"
                >
                  Save Medical Info
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT EMERGENCY CONTACT DIALOG */}
      {editContactOpen && (
        <Dialog open={true} onOpenChange={setEditContactOpen}>
          <DialogContent className="sm:max-w-md bg-white p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-900">
                <Users className="h-5 w-5 text-purple-600" />
                <span>Manage Emergency Contact</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveContactInfo} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Contact Person Name</label>
                <input
                  type="text"
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  placeholder="e.g. Priya Verma"
                  className="w-full rounded-xl border border-gray-200 p-2.5 font-semibold focus:border-[#E63946] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Relationship</label>
                <input
                  type="text"
                  value={editContactRel}
                  onChange={(e) => setEditContactRel(e.target.value)}
                  placeholder="e.g. Spouse / Parent / Sibling"
                  className="w-full rounded-xl border border-gray-200 p-2.5 font-semibold focus:border-[#E63946] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Emergency Phone Number</label>
                <input
                  type="text"
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full rounded-xl border border-gray-200 p-2.5 font-semibold focus:border-[#E63946] focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditContactOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#E63946] py-2.5 font-bold text-white hover:bg-[#C32F3A] cursor-pointer"
                >
                  Save Emergency Contact
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
