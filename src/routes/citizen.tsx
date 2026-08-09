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
} from "lucide-react";
import { SectionCard, SeverityBadge } from "@/components/design-system";
import { CitizenShell, type CitizenTab } from "@/components/roles/citizen-shell";
import { LiveMap } from "@/components/live-map";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { getProfile, saveProfile } from "@/lib/profile";
import ProfileHeader from "@/components/profile/profile-header";

export const Route = createFileRoute("/citizen")({
  head: () => ({ meta: [{ title: "Citizen SOS Portal · AEGIS" }] }),
  component: CitizenPortal,
});

const FIRST_AID_GUIDES: Record<string, { title: string; icon: any; steps: Array<{ title: string; desc: string }> }> = {
  cpr: {
    title: "CPR (Cardiopulmonary Resuscitation)",
    icon: Activity,
    steps: [
      { title: "Check Safety & Status", desc: "Ensure the scene is safe. Shake the victim gently and shout 'Are you okay?' to check for responsiveness." },
      { title: "Call for Rescue", desc: "Shout for nearby help. Activate the AEGIS SOS beacon immediately to alert nearby dispatch units." },
      { title: "Position Your Hands", desc: "Place the heel of one hand in the center of the chest. Interlock your other hand on top. Keep your elbows locked." },
      { title: "Push Hard & Fast", desc: "Compress the chest at least 2 inches at a rate of 100-120 compressions per minute (to the beat of 'Staying Alive')." },
    ],
  },
  choking: {
    title: "Choking Emergency",
    icon: AlertTriangle,
    steps: [
      { title: "Stand Behind the Victim", desc: "Lean the person slightly forward. Give 5 firm back blows between their shoulder blades using the heel of your hand." },
      { title: "Perform Abdominal Thrusts", desc: "Make a fist with one hand, place it just above the navel, grab it with your other hand, and pull sharply upward and inward." },
      { title: "Repeat Until Clear", desc: "Alternate between 5 back blows and 5 abdominal thrusts until the blockage is dislodged or the victim becomes unresponsive." },
    ],
  },
  bleeding: {
    title: "Severe Bleeding Control",
    icon: Droplets,
    steps: [
      { title: "Apply Direct Pressure", desc: "Cover the wound with a clean bandage or cloth. Apply firm, constant pressure with both hands directly on the bleed." },
      { title: "Elevate Above Heart", desc: "Keep pressure applied while elevating the injured limb above the level of the heart to slow down blood flow." },
      { title: "Maintain Pressure", desc: "Do not remove the cloth if it gets soaked; wrap clean bandages firmly over it and continue manual pressure." },
    ],
  },
  burns: {
    title: "Thermal Burns Care",
    icon: Heart,
    steps: [
      { title: "Cool Immediately", desc: "Run cool (not cold) running tap water over the burn site for 10-20 minutes. Never use ice or icy water." },
      { title: "Remove Constricting Items", desc: "Gently remove rings, bracelets, or tight clothing from the burned area before swelling starts." },
      { title: "Cover Loosely", desc: "Wrap the area loosely with sterile cling film or a clean plastic sheet to shield the raw skin and prevent infection." },
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
      toast.success("🚨 EMERGENCY SOS BROADCASTED! Dispatching nearest ambulance & alerting trauma center.");
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

  if (isLoading || !isAuthenticated || user?.role !== "citizen") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-6 w-6 animate-ping bg-[#E63946] rounded-full" />
      </div>
    );
  }

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
    return () => clearInterval(id);
  }, [listening]);

  return (
    <CitizenShell
      activeTab={tab}
      onTabChange={setTab}
      header={
        <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Verified Account
        </span>
      }
    >
      {tab === "home" && (
        <HomeView
          onTriggerSos={() => triggerSosWithProtection()}
          onTrack={() => setTab("tracking")}
          sos={sos}
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
                Broadcasting emergency location beacon and dispatching paramedics in {sosCountdown} seconds.
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 font-medium">
              ⚠️ Tap <strong>Cancel SOS</strong> immediately if this was pressed by mistake.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelSosCountdown}
                className="flex-1 rounded-xl bg-gray-900 py-3 text-xs font-bold text-white hover:bg-gray-800 transition-colors shadow-md"
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
  sos,
}: {
  onTriggerSos: () => void;
  onTrack: () => void;
  sos: boolean;
}) {
  const { user } = useAuth();
  const profile = getProfile("citizen");
  const name = profile.name || user?.name || "Citizen";

  const [activeModal, setActiveModal] = useState<"first-aid" | "hospitals" | "chat" | "share" | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Chat States
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "ai" | "user"; text: string; time: string }>>([
    {
      sender: "ai",
      text: "Hello! I am the AEGIS AI Emergency Assistant. I have accessed your location (Sector 62 Noida) and medical profile. How can I assist you?",
      time: "Now",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Share States
  const [customPhone, setCustomPhone] = useState("");
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
      let reply = "Responders are on standby. Please remain calm, keep the victim comfortable, and let me know if they are conscious.";
      const lower = userMsg.toLowerCase();
      if (lower.includes("accident") || lower.includes("crash") || lower.includes("car")) {
        reply = "Understood. Road traffic dispatch protocol active. Notifying Noida fleet. Check if victim is conscious and secure away from traffic.";
      } else if (lower.includes("heart") || lower.includes("pain") || lower.includes("chest") || lower.includes("cpr")) {
        reply = "Cardiac emergency flagged. Critical care ambulance dispatched. If victim is unconscious and not breathing, begin CPR (100-120 compressions/min).";
      } else if (lower.includes("bleed") || lower.includes("blood") || lower.includes("cut")) {
        reply = "For severe bleeding: Apply firm direct pressure with clean cloth. Elevate limb if possible. Keep pressure applied constant.";
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
      setCustomPhone("");
    }, 1200);
  };

  const truncate = (str: string, len: number = 14) => {
    if (!str) return "None";
    return str.length > len ? str.slice(0, len) + "..." : str;
  };

  const bloodGroup = profile.bloodGroup || "O Positive";
  const allergies = profile.allergies || "Penicillin, Sulfa drugs";
  const conditions = profile.conditions || "Hypertension (controlled)";

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Citizen Welcome Card */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#111111]">Welcome, {name}</h2>
          <p className="mt-0.5 text-xs text-[#525866] flex items-center gap-1.5 font-medium">
            <MapPin className="h-3.5 w-3.5 text-[#E63946]" /> Sector 62, Noida, UP · GPS Beacon Active
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-bold text-emerald-700">
          ● Grid Active · Response Ready
        </span>
      </div>

      {/* Active Emergency Banner OR No Active Emergency Banner */}
      {sos ? (
        <div className="rounded-2xl border-2 border-[#E63946] bg-red-50/50 p-5 shadow-md space-y-3">
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
            className="w-full rounded-xl bg-[#E63946] hover:bg-[#C32F3A] py-2.5 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>Track Response Live on Map</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">No active emergency</p>
              <p className="text-[10px] text-gray-500">AEGIS emergency network is active and monitoring Sector 62 Noida.</p>
            </div>
          </div>
        </div>
      )}

      {/* One-Tap SOS Button */}
      <button
        type="button"
        onClick={onTriggerSos}
        className="flex w-full items-center gap-4 rounded-3xl bg-[#E63946] hover:bg-[#C32F3A] p-6 text-left text-white shadow-xl transition-all active:scale-[0.98] cursor-pointer group"
      >
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/20 group-hover:scale-105 transition-transform shrink-0">
          <Siren className="h-8 w-8 text-white animate-pulse" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-extrabold tracking-tight">One-Tap SOS</p>
          <p className="text-xs text-white/80 mt-0.5">
            Instant dispatch with 5s accidental activation protection &amp; live location beacon.
          </p>
        </div>
      </button>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Brain, label: "AI First Aid", sub: "Step-by-step guidance", action: () => setActiveModal("first-aid") },
          { icon: Building2, label: "Nearby Hospitals", sub: "ICU & ER status", action: () => setActiveModal("hospitals") },
          { icon: MessageCircle, label: "Emergency Chat", sub: "Talk to AI Dispatcher", action: () => setActiveModal("chat") },
          { icon: Share2, label: "Share Location", sub: "Broadcast live GPS", action: () => setActiveModal("share") },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            className="rounded-2xl bg-white p-4 text-left border border-[#E5E7EB] hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm"
          >
            <item.icon className="h-5 w-5 text-[#E63946]" />
            <p className="mt-2 text-xs font-bold text-[#111111]">{item.label}</p>
            <p className="text-[10px] text-[#525866]">{item.sub}</p>
          </button>
        ))}
      </div>

      {/* Medical Profile Summary Card */}
      <SectionCard title="Medical Profile Summary" description="Shared securely with paramedics during SOS">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-red-50/50 border border-red-100 p-2.5">
            <Droplets className="mx-auto h-4 w-4 text-[#E63946]" />
            <p className="mt-1 font-bold text-[#111111]">{truncate(bloodGroup, 12)}</p>
            <p className="text-[9px] text-gray-400">Blood Group</p>
          </div>
          <div className="rounded-xl bg-amber-50/50 border border-amber-100 p-2.5">
            <AlertTriangle className="mx-auto h-4 w-4 text-amber-600" />
            <p className="mt-1 font-bold text-[#111111]">{truncate(allergies, 12)}</p>
            <p className="text-[9px] text-gray-400">Allergies</p>
          </div>
          <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-2.5">
            <Heart className="mx-auto h-4 w-4 text-blue-600" />
            <p className="mt-1 font-bold text-[#111111]">{truncate(conditions, 12)}</p>
            <p className="text-[9px] text-gray-400">Conditions</p>
          </div>
        </div>
      </SectionCard>

      {/* AI First Aid Dialog */}
      <Dialog open={activeModal === "first-aid"} onOpenChange={(open) => { if (!open) { setActiveModal(null); setSelectedGuide(null); } }}>
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
              <strong>Emergency Guidance Only:</strong> This AI assistant provides immediate first-aid instructions while emergency medical services are en route. It is not a replacement for professional medical care.
            </p>
          </div>

          {!selectedGuide ? (
            <div className="space-y-2 py-2">
              <p className="text-xs text-[#525866] mb-1">Select an emergency situation for guided instructions:</p>
              {Object.entries(FIRST_AID_GUIDES).map(([key, guide]) => {
                const Icon = guide.icon;
                return (
                  <button
                    key={key}
                    onClick={() => { setSelectedGuide(key); setCurrentStep(0); }}
                    className="flex w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-white p-3.5 text-left transition-all hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-red-50 p-2 text-[#E63946]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111111]">{guide.title}</p>
                        <p className="text-[10px] text-[#525866]">{guide.steps.length} step guide</p>
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
                <button onClick={() => setSelectedGuide(null)} className="rounded-lg p-1 hover:bg-slate-100">
                  <ChevronLeft className="h-4 w-4 text-[#525866]" />
                </button>
                <p className="text-xs font-bold text-[#111111]">{FIRST_AID_GUIDES[selectedGuide].title}</p>
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
                  className="flex-1 rounded-xl border border-[#E5E7EB] py-2 text-xs font-bold text-gray-700 hover:bg-slate-50"
                >
                  {currentStep > 0 ? "Previous" : "Back"}
                </button>
                <button
                  onClick={() => {
                    if (currentStep < FIRST_AID_GUIDES[selectedGuide].steps.length - 1) setCurrentStep(currentStep + 1);
                    else {
                      toast.success("First-aid guide review complete.");
                      setSelectedGuide(null);
                      setActiveModal(null);
                    }
                  }}
                  className="flex-1 rounded-xl bg-[#E63946] py-2 text-xs font-bold text-white hover:bg-[#C32F3A]"
                >
                  {currentStep === FIRST_AID_GUIDES[selectedGuide].steps.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Nearby Hospitals Dialog */}
      <Dialog open={activeModal === "hospitals"} onOpenChange={(open) => { if (!open) setActiveModal(null); }}>
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
              <div key={hosp.name} className="rounded-2xl border border-[#E5E7EB] bg-white p-4 space-y-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#111111]">{hosp.name}</h3>
                    <p className="text-[10px] text-[#525866] mt-0.5">{hosp.address} · {hosp.distance}</p>
                    <p className="text-[9px] text-emerald-600 font-bold mt-1">{hosp.traumaStatus}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700 shrink-0">
                    ETA {hosp.eta}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-1.5 font-semibold">
                    ICU Beds: <span className="font-bold text-emerald-600">{hosp.icuFree}/{hosp.icuTotal} Free</span>
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-1.5 font-semibold">
                    ER Bays: <span className="font-bold text-blue-600">{hosp.erFree}/{hosp.erTotal} Free</span>
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
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-[#E63946] py-2 text-[10px] font-bold text-white hover:bg-[#C32F3A]"
                  >
                    <Navigation className="h-3 w-3" /> Route Ambulance
                  </button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Emergency Chat Dialog */}
      <Dialog open={activeModal === "chat"} onOpenChange={(open) => { if (!open) setActiveModal(null); }}>
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
              <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.sender === "user" ? "bg-[#E63946] text-white rounded-br-none" : "bg-white text-[#111111] border border-[#E5E7EB] rounded-bl-none shadow-sm"
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className={`block text-[8px] mt-1 text-right ${msg.sender === "user" ? "text-white/60" : "text-[#525866]"}`}>
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
              onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
              placeholder="Describe emergency symptoms or location..."
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-[#E63946] focus:outline-none"
            />
            <button
              onClick={handleSendChat}
              className="h-8 w-8 grid place-items-center rounded-xl bg-[#E63946] text-white hover:bg-[#C32F3A]"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Location Dialog */}
      <Dialog open={activeModal === "share"} onOpenChange={(open) => { if (!open) setActiveModal(null); }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto bg-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#E63946]">
              <Share2 className="h-5 w-5" />
              <span>Share Live Location Link</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Current Coordinate Beacon</p>
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
              className="w-full rounded-xl bg-[#E63946] py-2.5 text-xs font-bold text-white hover:bg-[#C32F3A] flex items-center justify-center gap-1.5 disabled:opacity-50"
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
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="rounded-3xl bg-white p-6 text-center shadow-sm border border-[#E5E7EB]">
        <button
          type="button"
          onClick={() => onTriggerSos()}
          className={`relative mx-auto grid h-40 w-40 place-items-center rounded-full bg-gradient-emergency text-white shadow-xl transition-transform active:scale-95 cursor-pointer ${sos ? "pulse-emergency" : ""}`}
        >
          <div>
            <Siren className="mx-auto h-10 w-10 animate-pulse" />
            <div className="mt-1 text-xl font-black tracking-widest">SOS</div>
          </div>
        </button>
        <p className="mt-4 text-xs text-[#525866] font-medium">
          {sos
            ? "Beacon active. Unit AMB-1083 dispatched with Green Corridor."
            : "Tap to initiate 5-second protected emergency SOS broadcast."}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          {(["Accident", "Medical", "Fire"] as const).map((seg) => (
            <button
              key={seg}
              type="button"
              onClick={() => onTriggerSos(seg)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeSegment === seg ? "bg-[#E63946] text-white" : "bg-[#F8F9FB] text-[#525866] border border-[#E5E7EB]"
              }`}
            >
              {seg}
            </button>
          ))}
        </div>
        {sos && (
          <button type="button" onClick={onTrack} className="mt-4 text-xs font-bold text-[#E63946] underline">
            View Live Tracking on Map →
          </button>
        )}
      </div>

      <SectionCard title="Voice SOS" description="Describe emergency situation naturally">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setListening(!listening);
              if (!listening) {
                setTranscript("");
                setSos(false);
                setActiveSegment(null);
              }
            }}
            className={`grid h-14 w-14 place-items-center rounded-full transition-all shrink-0 ${listening ? "bg-[#E63946] text-white pulse-emergency" : "bg-[#F8F9FB] text-[#525866] border border-[#E5E7EB]"}`}
          >
            {listening ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase text-[#525866]">
              {listening ? "Listening to voice input..." : "Tap microphone to speak"}
            </p>
            <p className="mt-1 text-xs italic text-[#111111]">{transcript || '"I am reporting an emergency near Sector 62..."'}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function TrackingView({ sos, setSos }: { sos: boolean; setSos: (v: boolean) => void }) {
  return (
    <div className="flex flex-col max-w-4xl mx-auto bg-white rounded-3xl overflow-hidden border border-[#E5E7EB] shadow-sm">
      <LiveMap
        className="min-h-[45vh] rounded-none border-0"
        showCorridor={sos}
        route={sos ? { from: [20, 75], via: [[40, 55]], to: [78, 22] } : undefined}
        markers={[
          { id: "me", type: "emergency", x: 20, y: 75, active: sos, label: "You" },
          { id: "amb", type: "ambulance", x: sos ? 38 : 60, y: sos ? 58 : 65, active: sos, label: "AMB-1083" },
          { id: "h1", type: "hospital", x: 78, y: 22, label: "City Care" },
        ]}
      />
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-200">
          <div>
            <p className="text-[10px] font-bold uppercase text-[#525866]">Ambulance ETA</p>
            <p className="text-2xl font-black text-[#111111]">{sos ? "4m 12s" : "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-[#525866]">Assigned Hospital</p>
            <p className="text-sm font-extrabold text-[#111111]">City Care Trauma Hub · 3.4 km</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Response Progress Stepper</p>
          <ol className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            {[
              { t: "SOS Received & Coordinates Streamed", done: sos },
              { t: "Ambulance Unit AMB-1083 Dispatched (Driver Vivaan Sharma)", done: sos },
              { t: "Green Traffic Corridor Locked (6 Signals Green)", done: sos },
              { t: "Hospital ER Trauma Team Alerted & Bay Reserved", done: sos },
              { t: "Patient Delivery & ER Handover", done: false },
            ].map((step, i) => (
              <li key={i} className="flex items-center gap-3 text-xs">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${step.done ? "bg-emerald-500" : "bg-gray-300"}`} />
                <span className={step.done ? "font-bold text-gray-900" : "text-gray-500"}>{step.t}</span>
              </li>
            ))}
          </ol>
        </div>

        <a
          href="tel:108"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E63946] py-3 text-xs font-bold text-white shadow-md hover:bg-[#C32F3A] transition-colors"
        >
          <PhoneCall className="h-4 w-4" /> Dial National Emergency 108
        </a>
      </div>
    </div>
  );
}

function HistoryView() {
  const incidents = [
    { id: "EMG-1180", type: "Medical Emergency", date: "Mar 2, 2026", status: "Resolved", hospital: "City Care Hospital" },
    { id: "EMG-1092", type: "Road Accident Assistance", date: "Jan 15, 2026", status: "Resolved", hospital: "Fortis Hospital" },
  ];
  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <h2 className="text-sm font-bold text-[#111111]">Emergency Activity History</h2>
      {incidents.map((inc) => (
        <div key={inc.id} className="rounded-2xl bg-white p-4 border border-[#E5E7EB] shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111111]">{inc.id}</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-200">
              {inc.status}
            </span>
          </div>
          <p className="text-xs text-[#525866]">{inc.type} · {inc.date}</p>
          <p className="text-[10px] text-[#525866]">Admitted to {inc.hospital}</p>
        </div>
      ))}
    </div>
  );
}

function ProfileView() {
  const { user } = useAuth();
  const profile = getProfile("citizen");
  const name = profile.name || user?.name || "Citizen";

  const [shareConditions, setShareConditions] = useState(true);
  const [shareAllergies, setShareAllergies] = useState(true);
  const [shareBloodGroup, setShareBloodGroup] = useState(true);
  const [shareContacts, setShareContacts] = useState(true);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <ProfileHeader name={name} subtitle={`Citizen ID · ${user?.id || "usr-citizen"}`} role="citizen" />

      {/* Data Sharing & Privacy Explanation */}
      <div className="rounded-2xl bg-blue-50/60 border border-blue-200 p-5 space-y-3">
        <div className="flex items-center gap-2 text-blue-900">
          <Lock className="h-4 w-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Medical Data Sharing &amp; Consent Controls</h3>
        </div>
        <div className="space-y-2 text-xs text-blue-950 leading-relaxed">
          <p>
            <strong>What is shared:</strong> Your blood group, severe allergies, chronic medical conditions, and emergency contacts.
          </p>
          <p>
            <strong>Why it is shared:</strong> Automatically streams to responding paramedics and trauma ER doctors during an active SOS so they prepare correct blood units and medications prior to ambulance arrival.
          </p>
          <p>
            <strong>Who receives it:</strong> Encrypted transfer exclusively to assigned AEGIS ambulance crew &amp; receiving hospital trauma team.
          </p>
        </div>

        {/* Privacy Consent Toggles */}
        <div className="mt-3 pt-3 border-t border-blue-200 space-y-2">
          {[
            { label: "Share Blood Group on SOS", state: shareBloodGroup, set: setShareBloodGroup },
            { label: "Share Severe Allergies on SOS", state: shareAllergies, set: setShareAllergies },
            { label: "Share Medical Conditions on SOS", state: shareConditions, set: setShareConditions },
            { label: "Share Emergency Contacts on SOS", state: shareContacts, set: setShareContacts },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs bg-white rounded-xl px-3 py-2 border border-blue-100">
              <span className="font-semibold text-gray-800">{item.label}</span>
              <button
                type="button"
                onClick={() => {
                  item.set(!item.state);
                  toast.success(`Consent ${!item.state ? "granted" : "revoked"} for ${item.label.toLowerCase()}`);
                }}
                className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold transition-all ${
                  item.state ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
                }`}
              >
                {item.state ? "CONSENT GRANTED" : "RESTRICTED"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {[
          { icon: Droplets, label: "Blood Group", value: profile.bloodGroup || "O Positive" },
          { icon: Pill, label: "Allergies", value: profile.allergies || "Penicillin, Sulfa drugs" },
          { icon: Heart, label: "Medical Conditions", value: profile.conditions || "Hypertension (controlled)" },
          { icon: Users, label: "Emergency Contacts", value: profile.emergencyContacts || "Priya Sharma (Spouse) - +91 98765 43210" },
          { icon: Shield, label: "Insurance Policy", value: profile.insurance || "Star Health Comprehensive · Active" },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-4 rounded-2xl bg-white p-4 border border-[#E5E7EB] shadow-sm">
            <row.icon className="h-5 w-5 text-[#525866]" />
            <div>
              <p className="text-[9px] font-bold uppercase text-[#525866]">{row.label}</p>
              <p className="text-xs font-bold text-[#111111]">{row.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
