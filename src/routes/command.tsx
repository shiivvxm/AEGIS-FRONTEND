import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import {
  Ambulance,
  Brain,
  Building2,
  Server,
  Siren,
  Timer,
  Wifi,
  Zap,
  Shield,
  Activity,
  Heart,
  Droplets,
  AlertTriangle,
  Play,
  Share2,
  Phone,
  Check,
  CheckCircle2,
  Compass,
  Cpu,
  Clock,
  Sparkles,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Layers,
  Volume2,
  VolumeX,
  // AEGIS NEW IMPORTS
  Eye,
  Camera,
  Bell,
  X,
  FileCheck,
  Navigation,
  Users,
  Radio,
  RefreshCw,
  Flame,
  ChevronDown,
  AlertCircle,
  UserCheck,
  Signal,
  XCircle,
  ClipboardCheck,
  Crosshair,
  MessageSquare,
  ArrowRight,
  CheckCheck,
  VideoOff,
  Car,
  PersonStanding,
  CloudFog,
  FlameKindling,
  ChevronsRight,
  ShieldCheck,
  ShieldX,
  BarChart2,
  TrafficCone,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionCard, SeverityBadge, StatCard } from "@/components/design-system";
import { AdminShell, type AdminTab } from "@/components/roles/admin-shell";
import ProfileHeader from "@/components/profile/profile-header";
import { LiveMap, type MapMarker } from "@/components/live-map";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  heatmapZones,
  livesSavedData,
  responseTimeData,
  utilizationData,
  generateEmergencies,
  generateAmbulances,
  generateHospitals,
  generateVolunteers,
  cctvCameras,
  getAgentStates,
  type CCTVCamera,
  type AegisAgent,
} from "@/lib/mock-data";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { getProfile, getDisplayName } from "@/lib/profile";
import { toast } from "sonner";

export const Route = createFileRoute("/command")({
  head: () => ({
    meta: [{ title: "Admin Command Center · AEGIS" }],
  }),
  component: AdminPortal,
});

// Module-level deterministic mock data (seeded generators — same output every call)
const ALL_INCIDENTS = generateEmergencies(12);
const ALL_AMBULANCES = generateAmbulances(16);
const ALL_HOSPITALS = generateHospitals(8);
const ALL_VOLUNTEERS = generateVolunteers(6);

interface ActiveIncident {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  location: string;
  status: string;
  assignedUnit?: string;
  eta?: string;
}

interface CommandNotification {
  id: string;
  type: "emergency" | "ambulance" | "hospital" | "volunteer" | "traffic" | "plan" | "system";
  message: string;
  time: string;
  icon: string;
}

// ─────────────────────────── Sub-components ───────────────────────────

function AnimatedCounter({ value, duration = 1500, suffix = "" }: { value: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }
    const incrementTime = Math.abs(Math.floor(duration / end));
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, Math.max(incrementTime, 16));
    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}{suffix}</span>;
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-[#00E5FF] text-xs font-bold tracking-wider">
      {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
    </span>
  );
}

function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
      height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    window.addEventListener("resize", handleResize);
    canvas.parentElement?.addEventListener("mousemove", handleMouseMove);

    const nodeCount = 40;
    const nodes: Array<{ x: number; y: number; vx: number; vy: number; radius: number; glow: boolean }> = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1.5,
        glow: Math.random() > 0.8,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const mx = (mouseRef.current.x - width / 2) * 0.03;
      const my = (mouseRef.current.y - height / 2) * 0.03;
      ctx.strokeStyle = "rgba(230, 57, 70, 0.08)";
      ctx.lineWidth = 0.8;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x + mx - (nodes[j].x + mx);
          const dy = nodes[i].y + my - (nodes[j].y + my);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x + mx, nodes[i].y + my);
            ctx.lineTo(nodes[j].x + mx, nodes[j].y + my);
            ctx.stroke();
          }
        }
      }
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
        const nx = node.x + mx;
        const ny = node.y + my;
        ctx.beginPath();
        ctx.arc(nx, ny, node.radius, 0, Math.PI * 2);
        if (node.glow) {
          ctx.fillStyle = "#E63946";
          ctx.shadowColor = "#E63946";
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.parentElement?.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0 opacity-40 rounded-3xl" />;
}

function FuturisticMap({ step, routeProgress }: { step: string; routeProgress: number }) {
  return (
    <div className="relative w-full h-[320px] bg-[#0A0D18] rounded-2xl overflow-hidden border border-[#242E42] shadow-inner">
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(0,229,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
      <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00E5FF]/40 to-transparent animate-scan-beam" />
      <svg className="w-full h-full p-4" viewBox="0 0 400 300">
        <defs>
          <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E63946" />
            <stop offset="50%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#00E676" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <path d="M 20,50 L 380,50" stroke="rgba(255,255,255,0.04)" strokeWidth="3" fill="none" />
        <path d="M 20,150 L 380,150" stroke="rgba(255,255,255,0.04)" strokeWidth="3" fill="none" />
        <path d="M 20,250 L 380,250" stroke="rgba(255,255,255,0.04)" strokeWidth="3" fill="none" />
        <path d="M 80,20 L 80,280" stroke="rgba(255,255,255,0.04)" strokeWidth="3" fill="none" />
        <path d="M 200,20 L 200,280" stroke="rgba(255,255,255,0.04)" strokeWidth="3" fill="none" />
        <path d="M 320,20 L 320,280" stroke="rgba(255,255,255,0.04)" strokeWidth="3" fill="none" />
        {(step === "green-corridor" || step === "success") && (
          <motion.path
            d="M 60,220 L 160,220 L 160,110 L 300,110"
            stroke="url(#routeGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="400"
            initial={{ strokeDashoffset: 400 }}
            animate={{ strokeDashoffset: 400 - 400 * routeProgress }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            filter="url(#glow)"
            fill="none"
          />
        )}
        {step !== "idle" && (
          <g transform="translate(60, 220)">
            <circle r="14" fill="none" stroke="#E63946" strokeWidth="2" className="animate-ping" />
            <circle r="6" fill="#E63946" filter="url(#glow)" />
            <text x="14" y="4" fill="#E63946" className="text-[9px] font-mono font-bold tracking-wider">INCIDENT SEC-62</text>
          </g>
        )}
        {(step === "match-unit" || step === "green-corridor" || step === "success") && (
          <motion.g
            initial={{ x: 60, y: 220 }}
            animate={
              step === "green-corridor"
                ? [{ x: 60, y: 220 }, { x: 160, y: 220 }, { x: 160, y: 110 }, { x: 300, y: 110 }][Math.min(3, Math.floor(routeProgress * 4))]
                : step === "success"
                ? { x: 300, y: 110 }
                : { x: 60, y: 220 }
            }
            transition={{ type: "spring", stiffness: 60 }}
          >
            <circle r="8" fill="#00E5FF" filter="url(#glow)" />
            <circle r="3" fill="#FFFFFF" />
            <text x="-24" y="-12" fill="#00E5FF" className="text-[8px] font-mono font-bold tracking-widest">AMB-1083</text>
          </motion.g>
        )}
        <g transform="translate(300, 110)">
          <circle r="12" fill="none" stroke="#00E676" strokeWidth="1.5" className="animate-pulse" />
          <rect x="-6" y="-6" width="12" height="12" rx="2" fill="#00E676" filter="url(#glow)" />
          <path d="M-3,0 L3,0 M0,-3 L0,3" stroke="white" strokeWidth="1.5" />
          <text x="14" y="4" fill="#00E676" className="text-[9px] font-mono font-bold tracking-wider">CITY CARE TRAUMA</text>
        </g>
      </svg>
    </div>
  );
}

// CCTV Detection overlay SVG (demo simulation — clearly labeled)
function CCTVDemoViewer({ camera }: { camera: CCTVCamera }) {
  const [scanY, setScanY] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setScanY((y) => (y + 2) % 100), 80);
    return () => clearInterval(id);
  }, []);

  const detectionColors = {
    accident: "#E63946",
    vehicle: "#00E5FF",
    person: "#22C55E",
    fire: "#FF4500",
    smoke: "#8F9BB3",
    crowd: "#F59E0B",
  };

  const detectionBoxes = [
    { x: 12, y: 35, w: 30, h: 20, type: "accident" as const, label: "Accident" },
    { x: 55, y: 45, w: 18, h: 14, type: "vehicle" as const, label: "Vehicle" },
    { x: 28, y: 52, w: 10, h: 16, type: "person" as const, label: "Person" },
    { x: 70, y: 30, w: 14, h: 10, type: "vehicle" as const, label: "Vehicle" },
  ];

  if (camera.status === "offline") {
    return (
      <div className="relative w-full h-[200px] bg-[#0A0D18] rounded-xl border border-[#242E42] flex items-center justify-center">
        <div className="text-center space-y-2">
          <VideoOff className="h-8 w-8 text-gray-600 mx-auto" />
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Camera Offline</p>
          <p className="text-[10px] text-gray-600">{camera.id} · {camera.location}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[200px] bg-[#080C14] rounded-xl border border-[#242E42] overflow-hidden">
      {/* Dark scene base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1A] via-[#0D1220] to-[#080C14]" />
      {/* Grid lines (scene texture) */}
      <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:12px_12px]" />
      {/* Road / scene elements */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Road */}
        <rect x="0" y="48" width="100" height="22" fill="rgba(30,35,50,0.8)" />
        <line x1="0" y1="59" x2="100" y2="59" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" strokeDasharray="4 4" />
        {/* Sky/background */}
        <rect x="0" y="0" width="100" height="48" fill="rgba(10,15,30,0.6)" />
        {/* Buildings */}
        <rect x="5" y="18" width="12" height="30" fill="rgba(25,30,45,0.9)" />
        <rect x="82" y="22" width="10" height="26" fill="rgba(25,30,45,0.9)" />
        {/* Detection boxes */}
        {detectionBoxes.map((box, i) => {
          const col = detectionColors[box.type];
          return (
            <g key={i}>
              <rect x={box.x} y={box.y} width={box.w} height={box.h}
                fill="none" stroke={col} strokeWidth="0.5" opacity={0.9}
                strokeDasharray="2 1"
              />
              {/* Corner markers */}
              <line x1={box.x} y1={box.y} x2={box.x + 3} y2={box.y} stroke={col} strokeWidth="1" />
              <line x1={box.x} y1={box.y} x2={box.x} y2={box.y + 3} stroke={col} strokeWidth="1" />
              <line x1={box.x + box.w} y1={box.y} x2={box.x + box.w - 3} y2={box.y} stroke={col} strokeWidth="1" />
              <line x1={box.x + box.w} y1={box.y} x2={box.x + box.w} y2={box.y + 3} stroke={col} strokeWidth="1" />
              <line x1={box.x} y1={box.y + box.h} x2={box.x + 3} y2={box.y + box.h} stroke={col} strokeWidth="1" />
              <line x1={box.x} y1={box.y + box.h} x2={box.x} y2={box.y + box.h - 3} stroke={col} strokeWidth="1" />
              {/* Label */}
              <rect x={box.x} y={box.y - 5} width={box.label.length * 2.2 + 2} height="5" fill={col} opacity="0.85" rx="0.5" />
              <text x={box.x + 1} y={box.y - 1} fill="white" fontSize="3" fontWeight="bold" fontFamily="monospace">{box.label}</text>
            </g>
          );
        })}
        {/* Scan line */}
        <line x1="0" y1={scanY} x2="100" y2={scanY} stroke="rgba(0,229,255,0.15)" strokeWidth="0.5" />
      </svg>
      {/* Overlays */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#E63946] animate-blink" />
        <span className="text-[9px] font-bold text-[#E63946] font-mono uppercase tracking-widest">REC</span>
        <span className="text-[9px] text-[#8F9BB3] font-mono ml-1">{camera.id}</span>
      </div>
      <div className="absolute top-2 right-2 text-[8px] font-mono text-[#8F9BB3]">
        <span className="bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/30 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">
          DEMO SIMULATION
        </span>
      </div>
      <div className="absolute bottom-2 left-2 text-[8px] font-mono text-[#8F9BB3]">
        {camera.location} · {camera.zone}
      </div>
      <div className="absolute bottom-2 right-2 text-[8px] font-mono text-[#00E5FF]">
        VISION AGENT ACTIVE
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
};

// ─────────────────────────── Main Component ───────────────────────────

function AdminPortal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const mainEl = document.querySelector("main");
    const parentEl = mainEl?.parentElement;
    if (parentEl) {
      parentEl.style.backgroundColor = "#080C14";
      parentEl.style.minHeight = "100vh";
    }
    if (mainEl) {
      mainEl.style.backgroundColor = "#080C14";
      mainEl.style.color = "#FFFFFF";
    }
    return () => {
      if (parentEl) parentEl.style.backgroundColor = "";
      if (mainEl) {
        mainEl.style.backgroundColor = "";
        mainEl.style.color = "";
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user?.role !== "admin" && user?.role !== "command"))) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  const [tab, setTab] = useState<AdminTab>("operations");

  // ── Simulator state (preserved from original) ──
  const [simMode, setSimMode] = useState(false);
  const [simStep, setSimStep] = useState<"idle" | "radar-scan" | "match-unit" | "green-corridor" | "success">("idle");
  const [severity, setSeverity] = useState(0);
  const [activeSignals, setActiveSignals] = useState<number[]>([]);
  const [ambulanceFlicker, setAmbulanceFlicker] = useState("AMB-1102");
  const [countdown, setCountdown] = useState(10);
  const [routeProgress, setRouteProgress] = useState(0);

  // ── AEGIS Command Center state ──
  const [selectedIncidentId, setSelectedIncidentId] = useState(ALL_INCIDENTS[0].id);
  const [planStatus, setPlanStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [selectedCameraId, setSelectedCameraId] = useState("CAM-001");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cmdNotifications, setCmdNotifications] = useState<CommandNotification[]>([
    { id: "n1", type: "emergency", message: "🚨 Critical incident detected: Road accident NH-24 · Sector 62", time: "16:22", icon: "🚨" },
    { id: "n2", type: "ambulance", message: "🚑 AMB-100 selected by Ambulance Agent (96% match)", time: "16:22", icon: "🚑" },
    { id: "n3", type: "hospital", message: "🏥 Apollo Hospital matched by Hospital Agent · ICU: 8 free", time: "16:21", icon: "🏥" },
    { id: "n4", type: "volunteer", message: "👥 2 volunteers notified by Volunteer Agent · ETA 3 min", time: "16:21", icon: "👥" },
    { id: "n5", type: "plan", message: "🤖 Command Agent: Response plan ready for approval", time: "16:22", icon: "🤖" },
  ]);

  // ── Derived/computed values ──
  const selectedIncident = ALL_INCIDENTS.find((i) => i.id === selectedIncidentId) ?? ALL_INCIDENTS[0];
  const aiAmbulance = ALL_AMBULANCES.find((a) => a.status === "available") ?? ALL_AMBULANCES[0];
  const aiHospital = ALL_HOSPITALS.reduce((best, h) => (h.icuFree > best.icuFree ? h : best), ALL_HOSPITALS[0]);
  const agentStatuses = getAgentStates(selectedIncident.status);
  const selectedCamera = cctvCameras.find((c) => c.id === selectedCameraId) ?? cctvCameras[0];

  // KPI values
  const activeEmergenciesCount = ALL_INCIDENTS.filter((i) => ["active", "dispatched", "en-route"].includes(i.status)).length;
  const pendingPlansCount = ALL_INCIDENTS.filter((i) => i.status === "active").length;
  const availableAmbulancesCount = ALL_AMBULANCES.filter((a) => a.status === "available").length;
  const onMissionAmbulancesCount = ALL_AMBULANCES.filter((a) => a.status === "on-mission" || a.status === "dispatched").length;
  const totalICUFree = ALL_HOSPITALS.reduce((sum, h) => sum + h.icuFree, 0);
  const activeVolunteersCount = ALL_VOLUNTEERS.filter((v) => v.status !== "off-duty").length;

  // Map markers
  const mapMarkers: MapMarker[] = [
    { id: selectedIncident.id, type: "emergency", x: 35, y: 45, label: selectedIncident.id, active: true },
    { id: aiAmbulance.id, type: "ambulance", x: 22, y: 62, label: aiAmbulance.id, active: planStatus === "approved" },
    { id: aiHospital.id, type: "hospital", x: 68, y: 28, label: aiHospital.name.split(" ")[0], active: false },
    ...ALL_INCIDENTS.slice(1, 4).map((inc, i) => ({
      id: inc.id,
      type: "emergency" as const,
      x: 52 + i * 12,
      y: 55 + i * 8,
      label: inc.id,
      active: false,
    })),
    { id: ALL_VOLUNTEERS[0].id, type: "volunteer", x: 30, y: 38, label: ALL_VOLUNTEERS[0].name.split(" ")[0] },
    { id: ALL_VOLUNTEERS[1].id, type: "volunteer", x: 44, y: 72, label: ALL_VOLUNTEERS[1].name.split(" ")[0] },
    { id: ALL_HOSPITALS[1].id, type: "hospital", x: 78, y: 60, label: ALL_HOSPITALS[1].name.split(" ")[0] },
  ];

  // ── Event handlers ──
  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    setPlanStatus("pending");
    setShowRejectForm(false);
    setRejectReason("");
    toast.info(`Incident ${id} selected for review`);
  };

  const handleApprove = () => {
    setPlanStatus("approved");
    toast.success("✅ Response plan approved — Mission is now ACTIVE!", { duration: 5000 });
    setCmdNotifications((prev) => [
      {
        id: `n${Date.now()}`,
        type: "plan",
        message: `✅ Plan APPROVED for ${selectedIncident.id} · Mission active · AMB dispatched`,
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        icon: "✅",
      },
      ...prev,
    ]);
  };

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) {
      toast.error("Please enter a reason for rejection.");
      return;
    }
    setPlanStatus("rejected");
    setShowRejectForm(false);
    toast.error("Response plan rejected. Manual override required.", { duration: 5000 });
    setCmdNotifications((prev) => [
      {
        id: `n${Date.now()}`,
        type: "system",
        message: `⚠️ Plan REJECTED for ${selectedIncident.id}: ${rejectReason}`,
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        icon: "⚠️",
      },
      ...prev,
    ]);
    setRejectReason("");
  };

  const handleResetPlan = () => {
    setPlanStatus("pending");
    setShowRejectForm(false);
    setRejectReason("");
    toast.info("Plan status reset. Ready for review.");
  };

  // ── Simulator sequence ──
  const triggerSimulation = () => {
    setSimStep("radar-scan");
    setSeverity(0);
    setActiveSignals([]);
    setRouteProgress(0);
    setCountdown(10);

    let score = 0;
    const severityTimer = setInterval(() => {
      score += 3;
      if (score >= 94) {
        score = 94;
        clearInterval(severityTimer);
        setTimeout(() => {
          setSimStep("match-unit");
          const ambulancesList = ["AMB-1102", "AMB-1094", "AMB-1057", "AMB-1083"];
          let i = 0;
          const matchTimer = setInterval(() => {
            setAmbulanceFlicker(ambulancesList[i % ambulancesList.length]);
            i++;
            if (i >= 8) {
              clearInterval(matchTimer);
              setAmbulanceFlicker("AMB-1083");
              setTimeout(() => {
                setSimStep("green-corridor");
                let sig = 1;
                const signalTimer = setInterval(() => {
                  setActiveSignals((prev) => [...prev, sig]);
                  sig++;
                  if (sig > 6) clearInterval(signalTimer);
                }, 600);
                let ticks = 10;
                const progressTimer = setInterval(() => {
                  ticks -= 1;
                  setCountdown(ticks);
                  setRouteProgress((p) => Math.min(1, p + 0.125));
                  if (ticks <= 0) {
                    clearInterval(progressTimer);
                    setSimStep("success");
                    toast.success("Simulation sequence successfully completed. Life saved!");
                  }
                }, 1000);
              }, 1800);
            }
          }, 150);
        }, 1000);
      }
      setSeverity(score);
    }, 50);
  };

  const activeCount = ALL_INCIDENTS.filter((e) => e.status !== "resolved").length;

  if (isLoading || !isAuthenticated || (user?.role !== "admin" && user?.role !== "command")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080C14]">
        <div className="h-6 w-6 animate-ping bg-[#E63946] rounded-full" />
      </div>
    );
  }

  // ── Severity color helper ──
  const severityColor = {
    critical: { text: "#E63946", bg: "bg-[#E63946]/10", border: "border-[#E63946]/30" },
    high: { text: "#F59E0B", bg: "bg-[#F59E0B]/10", border: "border-[#F59E0B]/30" },
    medium: { text: "#0284C7", bg: "bg-[#0284C7]/10", border: "border-[#0284C7]/30" },
    low: { text: "#22C55E", bg: "bg-[#22C55E]/10", border: "border-[#22C55E]/30" },
  };

  const agentIcons: Record<string, React.ElementType> = {
    "incident-agent": Siren,
    "vision-agent": Eye,
    "ambulance-agent": Ambulance,
    "hospital-agent": Building2,
    "traffic-agent": TrafficCone,
    "volunteer-agent": Users,
    "command-agent": Brain,
  };

  const detectionTypeIcon: Record<string, React.ElementType> = {
    accident: AlertTriangle,
    vehicle: Car,
    person: PersonStanding,
    fire: FlameKindling,
    smoke: CloudFog,
    crowd: Users,
  };

  const notifColor: Record<CommandNotification["type"], string> = {
    emergency: "text-[#E63946]",
    ambulance: "text-[#00E5FF]",
    hospital: "text-[#22C55E]",
    volunteer: "text-purple-400",
    traffic: "text-[#F59E0B]",
    plan: "text-[#00E5FF]",
    system: "text-[#8F9BB3]",
  };

  const incidentSourceLabel = (status: string) => {
    if (status === "active") return "AI-CCTV + Citizen Report";
    if (status === "dispatched") return "AI-CCTV";
    return "AI-CCTV + Citizen Report";
  };

  const statusStageMap: Record<string, string> = {
    active: "Detected · Assessing",
    dispatched: "Pending Approval",
    "en-route": "Approved · On Mission",
    "at-hospital": "Completed",
    resolved: "Resolved",
  };

  return (
    <AdminShell activeTab={tab} onTabChange={setTab} alertCount={activeCount}>
      <style>{`
        @keyframes scan-beam { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }
        .animate-scan-beam { animation: scan-beam 5s infinite linear; }
        .glow-cyan { text-shadow: 0 0 10px rgba(0,229,255,0.6); }
        .glow-red { text-shadow: 0 0 10px rgba(230,57,70,0.6); }
        .glow-green { text-shadow: 0 0 10px rgba(0,230,118,0.6); }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: rgba(230,57,70,0.3); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(230,57,70,0.6); }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════
          OPERATIONS TAB — AEGIS COMMAND CENTER
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "operations" && (
        <div className="space-y-5">

          {/* ── Command Center Header Bar ── */}
          <div className="rounded-2xl bg-[#0D1220] border border-[#242E42] px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#E63946]/10 border border-[#E63946]/30 flex items-center justify-center">
                <Shield className="h-4 w-4 text-[#E63946]" />
              </div>
              <div>
                <h1 className="text-xs font-black uppercase tracking-widest text-white">AEGIS Command Center</h1>
                <p className="text-[9px] text-[#8F9BB3] mt-0.5">Delhi NCR Emergency Response Network · Operator Clearance Level 3</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[8px] text-[#8F9BB3] uppercase tracking-wider">Local Time</p>
                <LiveClock />
              </div>
              <div className="h-6 w-px bg-[#242E42]" />
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                All Systems Operational
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FF9F0A]">
                <span className="h-2 w-2 rounded-full bg-[#FF9F0A] animate-pulse" />
                {activeEmergenciesCount} Active Incidents
              </div>
              {/* Simulator toggle */}
              <button
                onClick={() => {
                  setSimMode(!simMode);
                  if (!simMode) triggerSimulation();
                }}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  simMode
                    ? "bg-[#E63946]/10 border-[#E63946]/40 text-[#E63946]"
                    : "bg-white/5 border-white/10 text-[#8F9BB3] hover:text-white hover:border-white/20"
                }`}
              >
                <Cpu className="h-3 w-3 inline mr-1" />
                {simMode ? "Exit Sim" : "Simulator"}
              </button>
            </div>
          </div>

          {/* ── Simulator Panel (collapsible) ── */}
          <AnimatePresence>
            {simMode && (
              <motion.div
                key="simulator"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid gap-6 xl:grid-cols-[1.6fr_1.10fr] relative rounded-3xl bg-[#0D1220] border border-[#242E42] p-5">
                  <NetworkBackground />
                  {/* Left panel */}
                  <div className="space-y-5 z-10">
                    <div className="rounded-2xl bg-[#131926]/90 border border-[#242E42] p-4 relative overflow-hidden">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-[#E63946] flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-[#E63946] animate-ping" />
                            Emergency Network Map Grid
                          </h3>
                          <p className="text-[9px] text-[#8F9BB3] mt-0.5">Tactical HUD node assessment overlay · Noida-NCR</p>
                        </div>
                      </div>
                      <FuturisticMap step={simStep} routeProgress={routeProgress} />
                    </div>
                    <div className="rounded-2xl bg-[#131926]/90 border border-[#242E42] p-4">
                      <h3 className="text-[10px] font-bold text-white tracking-wide uppercase mb-3">AI Green Corridor Telemetry</h3>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {[1, 2, 3, 4, 5, 6].map((n) => {
                          const active = activeSignals.includes(n);
                          return (
                            <motion.div
                              key={n}
                              animate={active ? { scale: [1, 1.03, 1] } : {}}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className={`rounded-xl p-3 text-center border transition-all ${
                                active ? "border-green-500/30 bg-green-500/5 text-green-400" : "border-[#242E42] bg-[#161D2D]/60 text-gray-500"
                              }`}
                            >
                              <Zap className={`mx-auto h-4 w-4 ${active ? "text-green-400 animate-pulse" : "text-gray-600"}`} />
                              <p className="mt-1 text-[9px] font-bold tracking-wider uppercase">Signal {n}</p>
                              <p className="text-[8px] font-extrabold tracking-widest uppercase mt-0.5">{active ? "GREEN" : "HOLD"}</p>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {/* Right panel — diagnostics */}
                  <div className="space-y-5 z-10">
                    <div className="rounded-2xl bg-[#131926]/90 border border-[#242E42] p-4 flex flex-col justify-between min-h-[420px]">
                      <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-[#E63946] border-b border-[#242E42] pb-2 flex items-center gap-1.5 mb-4">
                          <Cpu className="h-3.5 w-3.5" /> AI Diagnostics Console
                        </h3>
                        <div className="space-y-1.5">
                          {[
                            { label: "Trigger SOS Beacon", step: "radar-scan", icon: Siren },
                            { label: "AI Threat Classification", step: "radar-scan", icon: Brain },
                            { label: "Ambulance Selector Mapping", step: "match-unit", icon: Ambulance },
                            { label: "Transit Green Corridor Lock", step: "green-corridor", icon: Zap },
                            { label: "Hospital Handover Target", step: "success", icon: CheckCircle2 },
                          ].map((s, idx) => {
                            const stepsOrder = ["idle", "radar-scan", "match-unit", "green-corridor", "success"];
                            const active = simStep === s.step;
                            const done = stepsOrder.indexOf(simStep) > stepsOrder.indexOf(s.step) || (s.step === "radar-scan" && simStep !== "idle");
                            return (
                              <div key={idx} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 border transition-all text-xs ${
                                active ? "border-[#E63946]/30 bg-[#E63946]/5 text-white" : done ? "border-green-500/20 bg-green-500/5 text-green-400" : "border-transparent text-gray-500"
                              }`}>
                                <s.icon className="h-3.5 w-3.5" />
                                <span className="font-bold flex-1">{s.label}</span>
                                {done && <Check className="h-3.5 w-3.5 text-green-400" />}
                                {active && <span className="h-1.5 w-1.5 rounded-full bg-[#E63946] animate-ping" />}
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 min-h-[120px] rounded-xl border border-[#242E42] bg-[#0A0D18]/60 p-3 font-mono text-[10px] text-[#00E5FF] space-y-1">
                          <p className="text-[8px] font-bold text-[#8F9BB3] uppercase border-b border-[#242E42]/60 pb-1 flex justify-between">
                            <span>System Console</span><span className="animate-pulse">● online</span>
                          </p>
                          {simStep === "idle" && <p className="text-gray-400 animate-pulse">&gt; READY FOR SOS SIMULATION</p>}
                          {simStep === "radar-scan" && (
                            <div className="space-y-1">
                              <p className="text-red-400">&gt; WARNING: CITIZEN SOS TRIGGER RECEIVED</p>
                              <p>&gt; ANCHOR LOCATION: Noida Sector 62</p>
                              <p className="flex justify-between"><span>&gt; AI THREAT SCAN:</span><span className="font-bold text-[#E63946]">{severity}% CRITICAL</span></p>
                            </div>
                          )}
                          {simStep === "match-unit" && (
                            <div className="space-y-1">
                              <p className="text-[#8F9BB3]">&gt; Incident classified as CRITICAL CARDIAC DISTRESS</p>
                              <p>&gt; QUERYING NEAREST ALS AMBULANCES...</p>
                              <p className="text-[#FF9F0A] animate-pulse">&gt; SCANNING: {ambulanceFlicker}</p>
                              {ambulanceFlicker === "AMB-1083" && <p className="text-green-400 font-bold">&gt; MATCH LOCKED: AMB-1083 ALS (96%)</p>}
                            </div>
                          )}
                          {simStep === "green-corridor" && (
                            <div className="space-y-1 text-green-400">
                              <p>&gt; VEHICLE ASSIGNED: AMB-1083</p>
                              <p>&gt; TARGET: City Care Trauma Hub</p>
                              <p className="text-yellow-400 font-bold">&gt; SIGNALS {activeSignals.join(", ")} → GREEN</p>
                              <p className="text-[#00E5FF]">&gt; CORRIDOR ACTIVE · ETA {countdown}s</p>
                            </div>
                          )}
                          {simStep === "success" && (
                            <div className="space-y-1 text-green-400 font-bold animate-pulse">
                              <p>&gt; DISPATCH HANDOVER: COMPLETE</p>
                              <p>&gt; PATIENT SECURED AT CITY CARE TRAUMA HUB</p>
                              <p className="text-white">&gt; RESULT: LIFE SAVED ✓</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="pt-3 border-t border-[#242E42]">
                        <button
                          onClick={() => { if (simStep === "idle" || simStep === "success") triggerSimulation(); }}
                          disabled={simStep !== "idle" && simStep !== "success"}
                          className="w-full rounded-xl bg-[#E63946] hover:bg-[#C32F3A] py-2 text-[10px] font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                        >
                          <Siren className="h-3.5 w-3.5" />
                          {simStep === "success" ? "Re-launch Simulation" : "Trigger SOS Simulation"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════
              KPI CARDS — 6 REAL METRICS
          ═══════════════════════════════ */}
          <div className="grid gap-3 grid-cols-2 xl:grid-cols-6">
            {/* Active Emergencies */}
            <motion.div variants={cardVariants} className="rounded-2xl bg-[#131926]/60 border border-[#E63946]/20 p-4 flex items-center gap-3 hover:border-[#E63946]/40 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-[#E63946]/10 border border-[#E63946]/20 flex items-center justify-center shrink-0">
                <Siren className="h-4 w-4 text-[#E63946] animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[#8F9BB3] uppercase tracking-wider">Active</p>
                <p className="text-xl font-black text-white tracking-tight"><AnimatedCounter value={activeEmergenciesCount} /></p>
                <p className="text-[8px] text-[#E63946] font-bold">Emergencies</p>
              </div>
            </motion.div>
            {/* Pending Plans */}
            <motion.div variants={cardVariants} className="rounded-2xl bg-[#131926]/60 border border-[#F59E0B]/20 p-4 flex items-center gap-3 hover:border-[#F59E0B]/40 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-4 w-4 text-[#F59E0B]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[#8F9BB3] uppercase tracking-wider">Pending</p>
                <p className="text-xl font-black text-[#F59E0B] tracking-tight"><AnimatedCounter value={pendingPlansCount} /></p>
                <p className="text-[8px] text-[#F59E0B] font-bold">AI Plans</p>
              </div>
            </motion.div>
            {/* Ambulances */}
            <motion.div variants={cardVariants} className="rounded-2xl bg-[#131926]/60 border border-[#00E5FF]/20 p-4 flex items-center gap-3 hover:border-[#00E5FF]/40 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center shrink-0">
                <Ambulance className="h-4 w-4 text-[#00E5FF]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[#8F9BB3] uppercase tracking-wider">Ambulances</p>
                <p className="text-xl font-black text-[#00E5FF] tracking-tight">
                  <AnimatedCounter value={availableAmbulancesCount} /><span className="text-sm text-[#8F9BB3]">/{onMissionAmbulancesCount + availableAmbulancesCount}</span>
                </p>
                <p className="text-[8px] text-[#00E5FF] font-bold">Available/Total</p>
              </div>
            </motion.div>
            {/* ICU Beds */}
            <motion.div variants={cardVariants} className="rounded-2xl bg-[#131926]/60 border border-[#22C55E]/20 p-4 flex items-center gap-3 hover:border-[#22C55E]/40 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-[#22C55E]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[#8F9BB3] uppercase tracking-wider">ICU Beds</p>
                <p className="text-xl font-black text-[#22C55E] tracking-tight"><AnimatedCounter value={totalICUFree} /></p>
                <p className="text-[8px] text-[#22C55E] font-bold">Available</p>
              </div>
            </motion.div>
            {/* Volunteers */}
            <motion.div variants={cardVariants} className="rounded-2xl bg-[#131926]/60 border border-purple-500/20 p-4 flex items-center gap-3 hover:border-purple-500/40 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[#8F9BB3] uppercase tracking-wider">Volunteers</p>
                <p className="text-xl font-black text-purple-400 tracking-tight"><AnimatedCounter value={activeVolunteersCount} /></p>
                <p className="text-[8px] text-purple-400 font-bold">Active/Ready</p>
              </div>
            </motion.div>
            {/* Avg Response Time */}
            <motion.div variants={cardVariants} className="rounded-2xl bg-[#131926]/60 border border-white/10 p-4 flex items-center gap-3 hover:border-white/20 transition-colors">
              <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Timer className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[#8F9BB3] uppercase tracking-wider">Avg Response</p>
                <p className="text-xl font-black text-white tracking-tight">6m 52s</p>
                <p className="text-[8px] text-green-400 font-bold">↓ 34% baseline</p>
              </div>
            </motion.div>
          </div>

          {/* ═══════════════════════════════
              MAIN 2-COLUMN GRID
          ═══════════════════════════════ */}
          <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">

            {/* ── LEFT COLUMN ── */}
            <div className="space-y-5">

              {/* ── Active Incident Panel ── */}
              <div className="rounded-2xl bg-[#131926]/60 border border-[#242E42] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#242E42]">
                  <div>
                    <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#E63946] animate-ping" />
                      Active Incident
                    </h2>
                    <p className="text-[9px] text-[#8F9BB3] mt-0.5">Select incident to review</p>
                  </div>
                  <span className="rounded-full bg-[#E63946]/10 border border-[#E63946]/30 px-2 py-0.5 text-[9px] font-bold text-[#E63946] uppercase">
                    {statusStageMap[selectedIncident.status] ?? selectedIncident.status}
                  </span>
                </div>
                <div className="p-5">
                  {/* Selected Incident Detail */}
                  <div className={`rounded-xl border ${severityColor[selectedIncident.severity].border} ${severityColor[selectedIncident.severity].bg} p-4 mb-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-black" style={{ color: severityColor[selectedIncident.severity].text }}>
                            {selectedIncident.id}
                          </span>
                          <SeverityBadge severity={selectedIncident.severity} />
                        </div>
                        <h3 className="text-sm font-black text-white">{selectedIncident.type}</h3>
                        <p className="text-[10px] text-[#8F9BB3] flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {selectedIncident.location}
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <p className="text-[9px] text-[#8F9BB3]">{selectedIncident.reportedAt}</p>
                        <p className="text-[9px] font-bold text-[#00E5FF]">Est. Victims: {selectedIncident.victims}</p>
                        {selectedIncident.eta && (
                          <p className="text-[9px] font-bold text-[#22C55E]">ETA: {selectedIncident.eta} min</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-[9px]">
                      <div>
                        <span className="text-[#8F9BB3]">Source: </span>
                        <span className="text-white font-bold">{incidentSourceLabel(selectedIncident.status)}</span>
                      </div>
                      <div>
                        <span className="text-[#8F9BB3]">Assigned: </span>
                        <span className="font-mono font-bold text-[#00E5FF]">{selectedIncident.ambulanceId ?? "Pending"}</span>
                      </div>
                      <div>
                        <span className="text-[#8F9BB3]">AI Detection: </span>
                        <span className="text-green-400 font-bold">Confirmed ✓</span>
                      </div>
                      <div>
                        <span className="text-[#8F9BB3]">Hospital: </span>
                        <span className="font-bold text-[#22C55E]">{selectedIncident.hospitalId ?? "Matching…"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Incident selector list */}
                  <p className="text-[9px] font-bold text-[#8F9BB3] uppercase tracking-wider mb-2">All Active Incidents — Click to Select</p>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {ALL_INCIDENTS.filter((i) => i.status !== "resolved").slice(0, 8).map((inc) => (
                      <button
                        key={inc.id}
                        onClick={() => handleSelectIncident(inc.id)}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left border transition-all ${
                          inc.id === selectedIncidentId
                            ? "border-[#E63946]/40 bg-[#E63946]/5 text-white"
                            : "border-[#242E42] bg-[#161D2D]/40 text-gray-400 hover:border-gray-500 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold">{inc.id}</span>
                          <SeverityBadge severity={inc.severity} />
                          <span className="text-[10px] font-semibold">{inc.type}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] text-[#8F9BB3]">{inc.location.split(",")[0]}</span>
                          {inc.id === selectedIncidentId && <ChevronRight className="h-3.5 w-3.5 text-[#E63946]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Live City Map ── */}
              <div className="rounded-2xl bg-[#131926]/60 border border-[#242E42] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#242E42]">
                  <div>
                    <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-white">Live Emergency Map</h2>
                    <p className="text-[9px] text-[#8F9BB3] mt-0.5">Delhi NCR · All active entities</p>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] font-bold">
                    <span className="flex items-center gap-1 text-[#E63946]"><span className="h-2 w-2 rounded-full bg-[#E63946]" /> Incident</span>
                    <span className="flex items-center gap-1 text-[#00E5FF]"><span className="h-2 w-2 rounded-full bg-[#00E5FF]" /> Ambulance</span>
                    <span className="flex items-center gap-1 text-[#22C55E]"><span className="h-2 w-2 rounded-full bg-[#22C55E]" /> Hospital</span>
                    <span className="flex items-center gap-1 text-purple-400"><span className="h-2 w-2 rounded-full bg-purple-400" /> Volunteer</span>
                  </div>
                </div>
                <div className="p-3">
                  <LiveMap
                    dark
                    className="h-[280px]"
                    markers={mapMarkers}
                    route={{ from: [22, 62], via: [[35, 45]], to: [68, 28] }}
                    showCorridor={planStatus === "approved"}
                  />
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="rounded-xl bg-[#161D2D]/60 border border-[#242E42] p-2.5 text-center">
                      <p className="text-[8px] text-[#8F9BB3] uppercase font-bold">Incident → AMB</p>
                      <p className="text-[10px] font-black text-white mt-0.5">2.1 km</p>
                    </div>
                    <div className="rounded-xl bg-[#161D2D]/60 border border-[#242E42] p-2.5 text-center">
                      <p className="text-[8px] text-[#8F9BB3] uppercase font-bold">AMB → Hospital</p>
                      <p className="text-[10px] font-black text-white mt-0.5">3.2 km</p>
                    </div>
                    <div className={`rounded-xl border p-2.5 text-center ${planStatus === "approved" ? "bg-green-500/5 border-green-500/30" : "bg-[#161D2D]/60 border-[#242E42]"}`}>
                      <p className="text-[8px] text-[#8F9BB3] uppercase font-bold">Corridor</p>
                      <p className={`text-[10px] font-black mt-0.5 ${planStatus === "approved" ? "text-green-400" : "text-[#F59E0B]"}`}>
                        {planStatus === "approved" ? "ACTIVE ✓" : "Pending"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── CCTV Section ── */}
              <div className="rounded-2xl bg-[#131926]/60 border border-[#242E42] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#242E42]">
                  <div className="flex items-center gap-2">
                    <Camera className="h-3.5 w-3.5 text-[#00E5FF]" />
                    <div>
                      <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-white">CCTV · Vision Agent</h2>
                      <p className="text-[9px] text-[#8F9BB3] mt-0.5">AI detection overlay · Detection flow DETECT → ASSESS → INCIDENT</p>
                    </div>
                  </div>
                  <span className="rounded bg-[#FF9F0A]/20 border border-[#FF9F0A]/30 px-2 py-0.5 text-[8px] font-bold text-[#FF9F0A] uppercase tracking-wider">
                    DEMO / SIMULATION
                  </span>
                </div>
                <div className="p-4">
                  {/* Camera selector */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                    {cctvCameras.map((cam) => (
                      <button
                        key={cam.id}
                        onClick={() => setSelectedCameraId(cam.id)}
                        className={`shrink-0 rounded-xl px-3 py-2 text-[9px] font-bold border transition-all flex items-center gap-1.5 ${
                          cam.id === selectedCameraId
                            ? "border-[#00E5FF]/40 bg-[#00E5FF]/5 text-[#00E5FF]"
                            : "border-[#242E42] bg-[#161D2D]/40 text-gray-400 hover:text-white"
                        }`}
                      >
                        {cam.status === "live" ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#E63946] animate-pulse" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
                        )}
                        {cam.id}
                        <span className="text-[8px] text-[#8F9BB3]">{cam.zone}</span>
                      </button>
                    ))}
                  </div>

                  {/* CCTV Viewer */}
                  <CCTVDemoViewer camera={selectedCamera} />

                  {/* Detection results */}
                  {selectedCamera.status === "live" && selectedCamera.detections.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[9px] font-bold text-[#8F9BB3] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Eye className="h-3 w-3 text-[#00E5FF]" />
                        Vision Agent Detections — {selectedCamera.id} · {selectedCamera.location}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedCamera.detections.map((det, i) => {
                          const DIcon = detectionTypeIcon[det.type] ?? AlertTriangle;
                          const col = {
                            accident: "text-[#E63946] bg-[#E63946]/5 border-[#E63946]/20",
                            vehicle: "text-[#00E5FF] bg-[#00E5FF]/5 border-[#00E5FF]/20",
                            person: "text-[#22C55E] bg-[#22C55E]/5 border-[#22C55E]/20",
                            fire: "text-orange-400 bg-orange-400/5 border-orange-400/20",
                            smoke: "text-gray-400 bg-gray-400/5 border-gray-400/20",
                            crowd: "text-[#F59E0B] bg-[#F59E0B]/5 border-[#F59E0B]/20",
                          }[det.type];
                          return (
                            <div key={i} className={`rounded-xl border p-2.5 ${col}`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <DIcon className="h-3 w-3" />
                                <span className="text-[9px] font-bold uppercase tracking-wider capitalize">{det.type}</span>
                              </div>
                              <p className="text-[10px] font-black">{det.confidence}%</p>
                              <p className="text-[8px] opacity-70 font-mono">{det.timestamp}</p>
                            </div>
                          );
                        })}
                      </div>
                      {/* Detection flow */}
                      <div className="mt-3 flex items-center gap-2 text-[9px] font-bold text-[#8F9BB3] flex-wrap">
                        <span className="bg-[#161D2D] border border-[#242E42] rounded px-2 py-1">CCTV VIDEO</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="bg-[#161D2D] border border-[#00E5FF]/30 rounded px-2 py-1 text-[#00E5FF]">VISION AGENT</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="bg-[#161D2D] border border-[#E63946]/30 rounded px-2 py-1 text-[#E63946]">AI DETECTION</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="bg-[#161D2D] border border-[#F59E0B]/30 rounded px-2 py-1 text-[#F59E0B]">INCIDENT</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="bg-[#161D2D] border border-[#22C55E]/30 rounded px-2 py-1 text-[#22C55E]">RESPONSE</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="space-y-5">

              {/* ── AI Agents Status ── */}
              <div className="rounded-2xl bg-[#131926]/60 border border-[#242E42] overflow-hidden">
                <div className="px-5 py-3 border-b border-[#242E42]">
                  <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5 text-[#00E5FF]" />
                    AI Agent Status — 7 Agents
                  </h2>
                  <p className="text-[9px] text-[#8F9BB3] mt-0.5">Real-time coordination status for {selectedIncident.id}</p>
                </div>
                <div className="p-4 space-y-2">
                  {agentStatuses.map((agent) => {
                    const AgIcon = agentIcons[agent.id] ?? Cpu;
                    const statusConfig = {
                      done: { dot: "bg-[#22C55E]", text: "text-[#22C55E]", label: "✓ Done", badge: "bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]" },
                      processing: { dot: "bg-[#F59E0B] animate-pulse", text: "text-[#F59E0B]", label: "⟳ Processing", badge: "bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]" },
                      idle: { dot: "bg-gray-600", text: "text-gray-500", label: "● Idle", badge: "bg-gray-800 border-gray-700 text-gray-500" },
                      error: { dot: "bg-[#E63946]", text: "text-[#E63946]", label: "✗ Error", badge: "bg-[#E63946]/10 border-[#E63946]/20 text-[#E63946]" },
                    }[agent.status];
                    return (
                      <div key={agent.id} className={`rounded-xl border p-3 flex items-start gap-3 transition-all ${
                        agent.status === "done" ? "border-[#22C55E]/15 bg-[#22C55E]/3" :
                        agent.status === "processing" ? "border-[#F59E0B]/20 bg-[#F59E0B]/5" :
                        "border-[#242E42] bg-[#161D2D]/30"
                      }`}>
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center border shrink-0 ${
                          agent.status === "done" ? "bg-[#22C55E]/10 border-[#22C55E]/20" :
                          agent.status === "processing" ? "bg-[#F59E0B]/10 border-[#F59E0B]/20" :
                          "bg-white/3 border-white/5"
                        }`}>
                          <AgIcon className={`h-3.5 w-3.5 ${statusConfig.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-white">{agent.name}</span>
                            <span className={`rounded-full border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider shrink-0 ${statusConfig.badge}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-[9px] text-[#8F9BB3] mt-0.5 leading-relaxed truncate">{agent.currentTask}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── AI Response Plan + Approval ── */}
              <div className="rounded-2xl bg-[#131926]/60 border border-[#242E42] overflow-hidden">
                <div className="px-5 py-3 border-b border-[#242E42] flex items-center justify-between">
                  <div>
                    <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
                      <FileCheck className="h-3.5 w-3.5 text-[#22C55E]" />
                      AI Response Plan
                    </h2>
                    <p className="text-[9px] text-[#8F9BB3] mt-0.5">Generated by Command Agent · {selectedIncident.id}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                    planStatus === "approved" ? "bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]" :
                    planStatus === "rejected" ? "bg-[#E63946]/10 border-[#E63946]/30 text-[#E63946]" :
                    "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B] animate-pulse"
                  }`}>
                    {planStatus === "approved" ? "✓ Approved" : planStatus === "rejected" ? "✗ Rejected" : "⏳ Pending Approval"}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {/* Plan Details */}
                  <div className="space-y-2">
                    {/* Ambulance */}
                    <div className="rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/3 p-3 flex items-center gap-3">
                      <Ambulance className="h-4 w-4 text-[#00E5FF] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-[#8F9BB3] uppercase font-bold">Selected Ambulance</p>
                        <p className="text-xs font-black text-white">{aiAmbulance.id} · {aiAmbulance.callsign}</p>
                        <p className="text-[9px] text-[#00E5FF] font-bold">Driver: {aiAmbulance.driver} · Zone: {aiAmbulance.zone}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] text-[#8F9BB3]">ETA</p>
                        <p className="text-sm font-black text-[#22C55E]">4 min</p>
                      </div>
                    </div>
                    {/* Hospital */}
                    <div className="rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/3 p-3 flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-[#22C55E] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-[#8F9BB3] uppercase font-bold">Matched Hospital</p>
                        <p className="text-xs font-black text-white">{aiHospital.name}</p>
                        <p className="text-[9px] text-[#22C55E] font-bold">ICU Free: {aiHospital.icuFree} · ER Free: {aiHospital.emergencyFree} · {aiHospital.distanceKm} km</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] text-[#8F9BB3]">Distance</p>
                        <p className="text-sm font-black text-[#22C55E]">{aiHospital.distanceKm} km</p>
                      </div>
                    </div>
                    {/* Traffic */}
                    <div className="rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/3 p-3 flex items-center gap-3">
                      <TrafficCone className="h-4 w-4 text-[#F59E0B] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-[#8F9BB3] uppercase font-bold">Traffic Action</p>
                        <p className="text-xs font-black text-white">Emergency Corridor</p>
                        <p className="text-[9px] text-[#F59E0B] font-bold">6 signals overridden · Route: NH-24 → Ring Road</p>
                      </div>
                      <div className={`shrink-0 text-[9px] font-bold px-2 py-1 rounded border ${planStatus === "approved" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]"}`}>
                        {planStatus === "approved" ? "ACTIVE" : "READY"}
                      </div>
                    </div>
                    {/* Volunteers */}
                    <div className="rounded-xl border border-purple-500/20 bg-purple-500/3 p-3 flex items-center gap-3">
                      <Users className="h-4 w-4 text-purple-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-[#8F9BB3] uppercase font-bold">Volunteer Assignment</p>
                        <p className="text-xs font-black text-white">{ALL_VOLUNTEERS[0].name} · {ALL_VOLUNTEERS[1].name}</p>
                        <p className="text-[9px] text-purple-400 font-bold">Skills: {ALL_VOLUNTEERS[0].skill} · {ALL_VOLUNTEERS[1].skill}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] text-[#8F9BB3]">ETA</p>
                        <p className="text-sm font-black text-purple-400">3 min</p>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl bg-[#0A0D18] border border-[#242E42] p-3 text-[9px] space-y-1.5">
                    <p className="font-bold text-[#8F9BB3] uppercase tracking-wider border-b border-[#242E42] pb-1 flex items-center gap-1">
                      <Brain className="h-3 w-3 text-[#00E5FF]" /> Command Agent Summary
                    </p>
                    <p className="text-[#ECEEF2] leading-relaxed">
                      Priority: <span className="font-bold text-[#E63946] uppercase">{selectedIncident.severity}</span> · 
                      {" "}Victims: {selectedIncident.victims} · 
                      {" "}Total ETA: <span className="font-bold text-[#22C55E]">~7 min</span>
                    </p>
                    <p className="text-[#8F9BB3] leading-relaxed">
                      AMB-{aiAmbulance.id} dispatched via optimized corridor. {aiHospital.name} pre-alerted. 2 certified volunteers en-route.
                    </p>
                  </div>

                  {/* ── Human-in-the-Loop Approval ── */}
                  {planStatus === "pending" && !showRejectForm && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-[#F59E0B] text-center uppercase tracking-wider flex items-center justify-center gap-1.5">
                        <AlertCircle className="h-3 w-3" />
                        AWAITING COMMAND OPERATOR APPROVAL
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          id="approve-plan-btn"
                          onClick={handleApprove}
                          className="rounded-xl bg-[#22C55E] hover:bg-[#16A34A] py-3 text-xs font-black text-white transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-green-500/20"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          APPROVE PLAN
                        </button>
                        <button
                          id="reject-plan-btn"
                          onClick={() => setShowRejectForm(true)}
                          className="rounded-xl border border-[#E63946]/40 bg-[#E63946]/5 hover:bg-[#E63946]/10 py-3 text-xs font-black text-[#E63946] transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <ShieldX className="h-4 w-4" />
                          MODIFY / REJECT
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reject form */}
                  {showRejectForm && planStatus === "pending" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                      <p className="text-[9px] font-bold text-[#E63946] uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldX className="h-3 w-3" /> Reject / Modify Plan
                      </p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Enter reason for rejection or modification required..."
                        className="w-full rounded-xl bg-[#0A0D18] border border-[#E63946]/30 text-white text-xs p-3 resize-none outline-none focus:border-[#E63946]/60 placeholder-gray-600"
                        rows={3}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setShowRejectForm(false)} className="rounded-xl border border-[#242E42] py-2 text-xs font-bold text-[#8F9BB3] hover:text-white transition-all">
                          Cancel
                        </button>
                        <button onClick={handleRejectSubmit} className="rounded-xl bg-[#E63946] hover:bg-[#C32F3A] py-2 text-xs font-black text-white transition-all flex items-center justify-center gap-1.5">
                          <XCircle className="h-3.5 w-3.5" /> Confirm Reject
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Approved state */}
                  {planStatus === "approved" && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-[#22C55E]/40 bg-[#22C55E]/5 p-4 text-center space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <CheckCheck className="h-5 w-5 text-[#22C55E]" />
                        <span className="text-sm font-black text-[#22C55E] uppercase tracking-wider">MISSION ACTIVE</span>
                      </div>
                      <p className="text-[9px] text-[#8F9BB3]">Plan approved · All units deployed · Corridor active</p>
                      <button onClick={handleResetPlan} className="text-[9px] text-[#8F9BB3] hover:text-white underline transition-colors">
                        Reset Plan Status
                      </button>
                    </motion.div>
                  )}

                  {/* Rejected state */}
                  {planStatus === "rejected" && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-[#E63946]/40 bg-[#E63946]/5 p-4 text-center space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <XCircle className="h-5 w-5 text-[#E63946]" />
                        <span className="text-sm font-black text-[#E63946] uppercase tracking-wider">PLAN REJECTED</span>
                      </div>
                      <p className="text-[9px] text-[#8F9BB3]">Manual override required. Awaiting operator action.</p>
                      <button onClick={handleResetPlan} className="text-[9px] text-[#8F9BB3] hover:text-white underline transition-colors">
                        Review Plan Again
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* ── Notifications Feed ── */}
              <div className="rounded-2xl bg-[#131926]/60 border border-[#242E42] overflow-hidden">
                <div className="px-5 py-3 border-b border-[#242E42] flex items-center justify-between">
                  <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-white flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-[#F59E0B]" />
                    Alerts & Notifications
                  </h2>
                  <span className="rounded-full bg-[#E63946]/10 border border-[#E63946]/30 px-2 py-0.5 text-[9px] font-bold text-[#E63946]">
                    {cmdNotifications.length}
                  </span>
                </div>
                <div className="divide-y divide-[#242E42]/60 max-h-[220px] overflow-y-auto">
                  {cmdNotifications.map((n) => (
                    <div key={n.id} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-white/2 transition-colors">
                      <span className="text-base shrink-0 mt-0.5">{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[10px] font-semibold leading-relaxed ${notifColor[n.type]}`}>{n.message}</p>
                        <p className="text-[8px] text-[#8F9BB3] font-mono mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════
              RECENT INCIDENTS TABLE
          ═══════════════════════════════ */}
          <div className="rounded-2xl bg-[#131926]/60 border border-[#242E42] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#242E42] flex items-center justify-between">
              <div>
                <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-white">Incident Registry</h2>
                <p className="text-[9px] text-[#8F9BB3] mt-0.5">Click row to select incident for review</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#242E42] text-left text-[9px] font-extrabold uppercase tracking-wider text-[#8F9BB3]">
                    <th className="px-5 py-3">ID</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Severity</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">Time</th>
                    <th className="px-3 py-3">Victims</th>
                    <th className="px-3 py-3">Unit</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ALL_INCIDENTS.map((inc) => (
                    <tr
                      key={inc.id}
                      onClick={() => handleSelectIncident(inc.id)}
                      className={`border-b border-[#242E42]/60 cursor-pointer transition-colors ${
                        inc.id === selectedIncidentId ? "bg-[#E63946]/5 border-[#E63946]/20" : "hover:bg-[#161D2D]/35"
                      }`}
                    >
                      <td className="px-5 py-3 font-mono font-bold text-white text-[10px]">{inc.id}</td>
                      <td className="px-3 py-3 text-[#ECEEF2] font-semibold">{inc.type}</td>
                      <td className="px-3 py-3"><SeverityBadge severity={inc.severity} /></td>
                      <td className="px-3 py-3 text-[#8F9BB3]">{inc.location}</td>
                      <td className="px-3 py-3 font-mono text-[9px] text-[#8F9BB3]">{inc.reportedAt}</td>
                      <td className="px-3 py-3 text-center text-white font-bold">{inc.victims}</td>
                      <td className="px-3 py-3 font-mono text-[9px] text-[#00E5FF] font-bold">{inc.ambulanceId ?? "—"}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[8px] uppercase tracking-wider font-bold ${
                          inc.status === "active" ? "bg-[#E63946]/10 text-[#E63946]" :
                          inc.status === "dispatched" ? "bg-[#F59E0B]/10 text-[#F59E0B]" :
                          inc.status === "en-route" ? "bg-[#00E5FF]/10 text-[#00E5FF]" :
                          inc.status === "at-hospital" ? "bg-purple-500/10 text-purple-400" :
                          "bg-[#22C55E]/10 text-[#22C55E]"
                        }`}>
                          {inc.status.replace("-", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          RESPONSE PLAN TAB — Detailed plan view
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "response-plan" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="rounded-2xl bg-[#131926]/60 border border-[#242E42] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">AI Response Plan — Full Detail</h2>
                <p className="text-[10px] text-[#8F9BB3] mt-1">Command Agent output for {selectedIncident.id} · {selectedIncident.type}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-wider ${
                planStatus === "approved" ? "bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]" :
                planStatus === "rejected" ? "bg-[#E63946]/10 border-[#E63946]/30 text-[#E63946]" :
                "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]"
              }`}>
                {planStatus === "approved" ? "✓ Approved — Mission Active" : planStatus === "rejected" ? "✗ Rejected" : "⏳ Awaiting Operator Approval"}
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Incident summary */}
              <div className="rounded-2xl border border-[#E63946]/20 bg-[#E63946]/3 p-5 space-y-3">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-[#E63946] flex items-center gap-1.5">
                  <Siren className="h-4 w-4" /> Incident Summary
                </h3>
                <div className="space-y-2 text-xs">
                  {[
                    ["Incident ID", selectedIncident.id],
                    ["Type", selectedIncident.type],
                    ["Severity", selectedIncident.severity.toUpperCase()],
                    ["Location", selectedIncident.location],
                    ["Reported", selectedIncident.reportedAt],
                    ["Estimated Victims", String(selectedIncident.victims)],
                    ["Source", incidentSourceLabel(selectedIncident.status)],
                    ["Current Status", statusStageMap[selectedIncident.status] ?? selectedIncident.status],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-[#8F9BB3] font-semibold">{k}</span>
                      <span className="font-bold text-white text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resource assignment */}
              <div className="space-y-3">
                <div className="rounded-2xl border border-[#00E5FF]/20 bg-[#00E5FF]/3 p-4">
                  <h4 className="text-[9px] font-extrabold uppercase tracking-widest text-[#00E5FF] mb-3">Ambulance Assignment</h4>
                  <div className="space-y-1.5 text-xs">
                    {[
                      ["Unit ID", aiAmbulance.id],
                      ["Callsign", aiAmbulance.callsign],
                      ["Driver", aiAmbulance.driver],
                      ["Zone", aiAmbulance.zone],
                      ["Speed", `${aiAmbulance.speed} km/h`],
                      ["ETA to Incident", "4 min"],
                      ["Match Score", "96%"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-[#8F9BB3]">{k}</span>
                        <span className="font-bold text-white">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#22C55E]/20 bg-[#22C55E]/3 p-4">
                  <h4 className="text-[9px] font-extrabold uppercase tracking-widest text-[#22C55E] mb-3">Hospital Assignment</h4>
                  <div className="space-y-1.5 text-xs">
                    {[
                      ["Hospital", aiHospital.name],
                      ["ICU Free", String(aiHospital.icuFree)],
                      ["ER Free", String(aiHospital.emergencyFree)],
                      ["Distance", `${aiHospital.distanceKm} km`],
                      ["Specialties", aiHospital.specialties.join(", ")],
                      ["Rating", `${aiHospital.rating} / 5.0`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-[#8F9BB3]">{k}</span>
                        <span className="font-bold text-white text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Traffic + Volunteers */}
              <div className="rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/3 p-5">
                <h3 className="text-[9px] font-extrabold uppercase tracking-widest text-[#F59E0B] mb-3 flex items-center gap-1.5">
                  <TrafficCone className="h-3.5 w-3.5" /> Traffic Agent Action
                </h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-[#8F9BB3]">Status</span><span className={`font-bold ${planStatus === "approved" ? "text-green-400" : "text-[#F59E0B]"}`}>{planStatus === "approved" ? "GREEN CORRIDOR ACTIVE" : "Ready to Activate"}</span></div>
                  <div className="flex justify-between"><span className="text-[#8F9BB3]">Signals Overridden</span><span className="font-bold text-white">6</span></div>
                  <div className="flex justify-between"><span className="text-[#8F9BB3]">Route</span><span className="font-bold text-white">NH-24 → Ring Road → Apollo</span></div>
                  <div className="flex justify-between"><span className="text-[#8F9BB3]">Time Saved</span><span className="font-bold text-green-400">↓ ~6 min (estimated)</span></div>
                </div>
              </div>

              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/3 p-5">
                <h3 className="text-[9px] font-extrabold uppercase tracking-widest text-purple-400 mb-3 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Volunteer Assignment
                </h3>
                <div className="space-y-2">
                  {ALL_VOLUNTEERS.slice(0, 3).map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{v.name}</p>
                        <p className="text-[9px] text-[#8F9BB3]">{v.skill} · {v.distance} km away</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[8px] uppercase font-bold ${v.status === "responding" ? "bg-[#E63946]/10 text-[#E63946]" : "bg-green-500/10 text-green-400"}`}>
                        {v.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Human-in-the-Loop Approval — large format */}
            <div className="mt-6 border-t border-[#242E42] pt-6">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#E63946]" /> Human-in-the-Loop — Operator Decision Required
              </h3>
              {planStatus === "pending" && !showRejectForm && (
                <div className="flex gap-4">
                  <button onClick={handleApprove} className="flex-1 rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] py-4 text-sm font-black text-white transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
                    <ShieldCheck className="h-5 w-5" /> APPROVE PLAN — DEPLOY ALL RESOURCES
                  </button>
                  <button onClick={() => setShowRejectForm(true)} className="flex-1 rounded-2xl border-2 border-[#E63946]/50 bg-[#E63946]/5 hover:bg-[#E63946]/10 py-4 text-sm font-black text-[#E63946] transition-all active:scale-95 flex items-center justify-center gap-2">
                    <ShieldX className="h-5 w-5" /> MODIFY / REJECT PLAN
                  </button>
                </div>
              )}
              {showRejectForm && planStatus === "pending" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 max-w-2xl">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection or required modifications..."
                    className="w-full rounded-xl bg-[#0A0D18] border border-[#E63946]/30 text-white text-sm p-4 resize-none outline-none focus:border-[#E63946]/60 placeholder-gray-600"
                    rows={4}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setShowRejectForm(false)} className="px-6 rounded-xl border border-[#242E42] py-2.5 text-sm font-bold text-[#8F9BB3] hover:text-white transition-all">Cancel</button>
                    <button onClick={handleRejectSubmit} className="flex-1 rounded-xl bg-[#E63946] hover:bg-[#C32F3A] py-2.5 text-sm font-black text-white flex items-center justify-center gap-2">
                      <XCircle className="h-4 w-4" /> Confirm Rejection
                    </button>
                  </div>
                </motion.div>
              )}
              {planStatus === "approved" && (
                <div className="rounded-2xl border border-[#22C55E]/40 bg-[#22C55E]/5 p-6 text-center space-y-2">
                  <CheckCheck className="h-8 w-8 text-[#22C55E] mx-auto" />
                  <p className="text-lg font-black text-[#22C55E] uppercase tracking-wider">Mission Active</p>
                  <p className="text-sm text-[#8F9BB3]">All resources deployed · Emergency corridor active · Volunteers en-route</p>
                  <button onClick={handleResetPlan} className="text-xs text-[#8F9BB3] hover:text-white underline transition-colors mt-2">Reset plan status</button>
                </div>
              )}
              {planStatus === "rejected" && (
                <div className="rounded-2xl border border-[#E63946]/40 bg-[#E63946]/5 p-6 text-center space-y-2">
                  <XCircle className="h-8 w-8 text-[#E63946] mx-auto" />
                  <p className="text-lg font-black text-[#E63946] uppercase tracking-wider">Plan Rejected</p>
                  <p className="text-sm text-[#8F9BB3]">Manual operator override required. Awaiting further instructions.</p>
                  <button onClick={handleResetPlan} className="text-xs text-[#8F9BB3] hover:text-white underline transition-colors mt-2">Review plan again</button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          EMERGENCIES TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "emergencies" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-[#131926]/60 border border-[#242E42] p-6 shadow-sm">
          <div className="mb-4 border-b border-[#242E42] pb-3">
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">Active Incident Registry</h3>
            <p className="text-[10px] text-[#8F9BB3] mt-0.5">Audit log of ongoing rescue nodes</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#242E42] text-left text-[10px] font-extrabold uppercase tracking-wider text-[#8F9BB3]">
                  <th className="pb-3">ID</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Unit</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {ALL_INCIDENTS.map((e) => (
                  <tr key={e.id} className="border-b border-[#242E42]/60 hover:bg-[#161D2D]/35 transition-colors">
                    <td className="py-3 font-mono font-bold text-white text-xs">{e.id}</td>
                    <td className="py-3 text-xs text-[#ECEEF2] font-semibold">{e.type}</td>
                    <td className="py-3 text-xs"><SeverityBadge severity={e.severity} /></td>
                    <td className="py-3 text-xs text-[#8F9BB3] font-semibold">{e.location}</td>
                    <td className="py-3 font-mono text-[10px] text-[#00E5FF] font-bold">{e.ambulanceId ?? "—"}</td>
                    <td className="py-3 capitalize text-xs text-green-400 font-bold">{e.status.replace("-", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          AMBULANCES TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "ambulances" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl bg-[#131926]/60 border border-[#242E42] p-6 shadow-sm">
          <div className="mb-4 border-b border-[#242E42] pb-3">
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">Ambulance Fleet Status</h3>
            <p className="text-[10px] text-[#8F9BB3] mt-0.5">ALS & BLS responder telemetry tracker</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ALL_AMBULANCES.map((a) => (
              <div key={a.id} className="rounded-2xl border border-[#242E42] bg-[#161D2D]/60 p-4 space-y-3 hover:border-gray-600 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${
                      a.status === "available" ? "border-green-500/20 bg-green-500/5 text-green-400" :
                      a.status === "offline" ? "border-gray-700 bg-gray-800 text-gray-500" :
                      "border-[#E63946]/20 bg-[#E63946]/5 text-[#E63946]"
                    }`}>
                      <Ambulance className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-extrabold text-white">{a.callsign}</h4>
                      <p className="text-[9px] text-[#8F9BB3] font-semibold">{a.driver}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[8px] uppercase tracking-wider font-extrabold ${
                    a.status === "available" ? "bg-green-500/10 text-green-400" :
                    a.status === "offline" ? "bg-gray-800 text-gray-500" :
                    "bg-[#E63946]/10 text-[#E63946]"
                  }`}>
                    {a.status.replace("-", " ")}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs font-bold">
                  <div className="flex justify-between"><span className="text-gray-400">Zone</span><span className="text-white">{a.zone}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Speed</span><span className="font-mono text-white">{a.speed > 0 ? `${a.speed} km/h` : "—"}</span></div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          HOSPITALS TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "hospitals" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ALL_HOSPITALS.map((h) => (
            <motion.div key={h.id} whileHover={{ y: -3 }} className="rounded-2xl bg-[#131926]/60 border border-[#242E42] p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#00E5FF]/10 text-[#00E5FF] flex items-center justify-center border border-[#00E5FF]/20">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white">{h.name}</h4>
                  <p className="text-[9px] text-[#8F9BB3]">{h.distanceKm} km · Rating {h.rating}/5</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-center">
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-2 text-green-400">ER: {h.emergencyFree} free</div>
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2 text-yellow-400">ICU: {h.icuFree} free</div>
              </div>
              <div className="text-[9px] text-[#8F9BB3]">
                Specialties: <span className="text-white">{h.specialties.join(", ")}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VOLUNTEERS TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "volunteers" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl bg-[#131926]/60 border border-[#242E42] p-6 shadow-sm">
          <div className="mb-4 border-b border-[#242E42] pb-3">
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">Volunteer Network Matrix</h3>
            <p className="text-[10px] text-[#8F9BB3] mt-0.5">CPR certified civilian responders active</p>
          </div>
          <div className="space-y-2">
            {ALL_VOLUNTEERS.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl border border-[#242E42] bg-[#161D2D]/60 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-[#E63946]/10 border border-[#E63946]/20 text-xs font-extrabold text-[#E63946]">
                    {v.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-white">{v.name}</p>
                    <p className="text-[9px] text-[#8F9BB3] font-semibold">{v.skill} · {v.distance} km away</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[8px] uppercase tracking-wider font-extrabold ${
                  v.status === "responding" ? "bg-[#E63946]/10 text-[#E63946]" : "bg-green-500/10 text-green-400"
                }`}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          AI INSIGHTS TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "ai" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="AI Recommendations" description="Live dispatch matching optimization" className="bg-[#131926]/60 border border-[#242E42] text-white">
            <div className="rounded-xl border border-[#E63946]/20 bg-[#E63946]/5 p-4 mb-4">
              <p className="text-xs font-extrabold text-[#E63946] uppercase tracking-wider">Active trigger · {selectedIncident.id}</p>
              <p className="mt-1 text-xs text-[#ECEEF2] font-semibold">Match Recommendation: {aiAmbulance.id} (Score 96%) · ETA 4m 12s</p>
            </div>
            <div className="space-y-2">
              {[
                { unit: `${aiAmbulance.id} ALS`, score: 96, picked: true },
                { unit: "AMB-102 BLS", score: 82, picked: false },
                { unit: "AMB-105 ALS", score: 74, picked: false },
              ].map((r) => (
                <div key={r.unit} className={`rounded-xl p-3 border ${r.picked ? "bg-green-500/5 border-green-500/30 text-green-400" : "bg-[#161D2D]/60 border-[#242E42] text-gray-400"}`}>
                  <div className="flex justify-between text-xs font-bold">
                    <span>{r.unit}</span>
                    <span>{r.score}% Compatibility</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="City Predictive Risk Assessment" description="Intelligent grid mitigations" className="bg-[#131926]/60 border border-[#242E42] text-white">
            <div className="space-y-3 text-xs leading-relaxed">
              {[
                { txt: "NH-24 corridor: 92% accident hazard probability next 6h. Recommended pre-positioning: 2 ALS responders.", badge: "Accident Risk" },
                { txt: "Sector 62: Cardiac incident spike projected 18:00–21:00. Pre-alerting volunteer defibrillator net.", badge: "Medical Spike" },
                { txt: `${aiHospital.name} ICU load reaches critical 85% utilization threshold. Routing emergency overflow to secondary hospital.`, badge: "Hospital Diversion" },
              ].map((insight, idx) => (
                <div key={idx} className="flex flex-col gap-2 rounded-xl border border-[#242E42] bg-[#161D2D]/60 p-4">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-[#00E5FF]" />
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#00E5FF]">{insight.badge}</span>
                  </div>
                  <p className="text-[11px] text-[#ECEEF2] font-semibold">{insight.txt}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ANALYTICS TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "analytics" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <SectionCard title="Response Time Analytics" description="Comparison with historical baseline" className="bg-[#131926]/60 border border-[#242E42] text-white">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={responseTimeData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#131926", border: "1px solid #242E42", borderRadius: 8, color: "#FFF", fontSize: 11 }} />
                  <Area type="monotone" dataKey="before" name="Before AEGIS" stroke="#E63946" fill="#E63946" fillOpacity={0.05} />
                  <Area type="monotone" dataKey="after" name="After AEGIS" stroke="#00E676" fill="#00E676" fillOpacity={0.05} />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <SectionCard title="Daily Prevented Fatalities" description="Impact diagnostics score" className="bg-[#131926]/60 border border-[#242E42] text-white">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={livesSavedData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#131926", border: "1px solid #242E42", borderRadius: 8, color: "#FFF", fontSize: 11 }} />
                  <Bar dataKey="lives" fill="#00E676" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </motion.div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          HEATMAPS TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "heatmaps" && (
        <SectionCard title="Metropolitan Risk Forecast" description="Pre-emptive hazard modeling" className="bg-[#131926]/60 border border-[#242E42] text-white">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {heatmapZones.map((z) => (
              <div key={z.name} className="rounded-xl border border-[#242E42] bg-[#161D2D]/60 p-4">
                <div className="flex justify-between text-xs font-bold text-white">
                  <span>{z.name}</span>
                  <span className="text-[#E63946]">{z.risk}% Risk</span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#1C2438]">
                  <div className="h-full bg-[#E63946] shadow-[0_0_8px_rgba(230,57,70,0.5)]" style={{ width: `${z.risk}%` }} />
                </div>
                <p className="mt-1.5 text-[9px] text-[#8F9BB3] font-semibold">{z.incidents} incidents logged past month</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SYSTEM HEALTH TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "health" && (
        <SectionCard title="Operations Center Gateway Telemetry" description="Active pairing validation states" className="bg-[#131926]/60 border border-[#242E42] text-white">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "GPS Dispatch Latency", value: "12 ms", stat: "Optimal" },
              { label: "API Gateway Node", value: "99.98%", stat: "Locked" },
              { label: "Traffic Signal Overrides", value: "384 active", stat: "Synced" },
              { label: "Telemetry Database Uptime", value: "99.998%", stat: "Optimal" },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl border border-[#242E42] bg-[#161D2D]/60 p-5 text-center">
                <Server className="mx-auto h-5 w-5 text-[#8F9BB3] animate-pulse" />
                <p className="mt-2.5 text-[9px] font-extrabold uppercase tracking-widest text-[#8F9BB3]">{m.label}</p>
                <p className="text-lg font-black text-white mt-1">{m.value}</p>
                <p className="text-[9px] font-extrabold text-green-400 uppercase mt-1">● {m.stat}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PROFILE TAB
      ═══════════════════════════════════════════════════════════════ */}
      {tab === "profile" && (() => {
        const profile = getProfile("admin");
        const name = getDisplayName("admin", user);
        const subtitle = `Clearance: ${profile.clearanceLevel || "Level 3"} · ID: ${profile.employeeId || "N/A"}`;
        return (
          <div className="space-y-4">
            <ProfileHeader name={name} subtitle={subtitle} role="admin" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl bg-[#131926]/60 border border-[#242E42] p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase text-[#8F9BB3] tracking-widest">System Permissions</p>
                <p className="mt-2.5 font-bold text-white text-xs">{profile.clearanceLevel || "Emergency overrides · Audit access · Configuration"}</p>
              </div>
              <div className="rounded-2xl bg-[#131926]/60 border border-[#242E42] p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase text-[#8F9BB3] tracking-widest">Region / Zone</p>
                <p className="mt-2.5 font-bold text-white text-xs">{profile.regionZone || "Delhi NCR Metropolitan Area"}</p>
              </div>
              <div className="rounded-2xl bg-[#131926]/60 border border-[#242E42] p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase text-[#8F9BB3] tracking-widest">Department / Designation</p>
                <p className="mt-2.5 font-bold text-white text-xs">{profile.departmentName || "Health Department"} · {profile.designation || "Grid Officer"}</p>
              </div>
            </div>
          </div>
        );
      })()}

    </AdminShell>
  );
}
