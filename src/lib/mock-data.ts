// Mock data generators for Smart Emergency Grid demo

export type Severity = "critical" | "high" | "medium" | "low";
export type EmergencyType = "Accident" | "Cardiac" | "Trauma" | "Stroke" | "Fire" | "Maternal";

export interface Emergency {
  id: string;
  type: EmergencyType;
  severity: Severity;
  location: string;
  lat: number;
  lng: number;
  victims: number;
  reportedAt: string;
  status: "active" | "dispatched" | "en-route" | "at-hospital" | "resolved";
  ambulanceId?: string;
  hospitalId?: string;
  eta?: number; // minutes
}

export interface Ambulance {
  id: string;
  callsign: string;
  driver: string;
  lat: number;
  lng: number;
  status: "available" | "dispatched" | "on-mission" | "offline";
  speed: number;
  zone: string;
}

export interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  beds: number;
  icuFree: number;
  emergencyFree: number;
  distanceKm: number;
  rating: number;
  specialties: string[];
}

export interface Volunteer {
  id: string;
  name: string;
  skill: string;
  lat: number;
  lng: number;
  distance: number;
  status: "available" | "responding" | "off-duty";
}

const TYPES: EmergencyType[] = ["Accident", "Cardiac", "Trauma", "Stroke", "Fire", "Maternal"];
const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
const ZONES = [
  "Sector 9",
  "Raj Nagar",
  "Indirapuram",
  "Vasundhara",
  "Vaishali",
  "Kavi Nagar",
  "Crossings",
  "Govindpuram",
];
const FIRST = [
  "Aarav",
  "Vivaan",
  "Ananya",
  "Diya",
  "Arjun",
  "Ishaan",
  "Rohan",
  "Kavya",
  "Riya",
  "Aditya",
  "Meera",
  "Karan",
];
const LAST = ["Sharma", "Verma", "Gupta", "Singh", "Khan", "Patel", "Nair", "Reddy", "Iyer", "Das"];

const seedRand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const pick = <T>(arr: T[], r: () => number) => arr[Math.floor(r() * arr.length)];

// Center: Ghaziabad / NCR area
const CENTER = { lat: 28.6692, lng: 77.4538 };

export function generateEmergencies(n = 12): Emergency[] {
  const r = seedRand(42);
  return Array.from({ length: n }, (_, i) => {
    const sev = pick(SEVERITIES, r);
    const status: Emergency["status"] =
      i < 3 ? "active" : i < 6 ? "dispatched" : i < 9 ? "en-route" : "at-hospital";
    return {
      id: `EMG-${1000 + i}`,
      type: pick(TYPES, r),
      severity: sev,
      location: `${pick(ZONES, r)}, Ghaziabad`,
      lat: CENTER.lat + (r() - 0.5) * 0.12,
      lng: CENTER.lng + (r() - 0.5) * 0.12,
      victims: 1 + Math.floor(r() * 4),
      reportedAt: `${Math.floor(r() * 20) + 1} min ago`,
      status,
      ambulanceId: status !== "active" ? `AMB-${100 + Math.floor(r() * 100)}` : undefined,
      hospitalId: status === "at-hospital" ? `HSP-${10 + Math.floor(r() * 50)}` : undefined,
      eta: status !== "active" ? Math.floor(r() * 12) + 2 : undefined,
    };
  });
}

export function generateAmbulances(n = 16): Ambulance[] {
  const r = seedRand(7);
  return Array.from({ length: n }, (_, i) => ({
    id: `AMB-${100 + i}`,
    callsign: `Unit ${String.fromCharCode(65 + (i % 26))}${i + 1}`,
    driver: `${pick(FIRST, r)} ${pick(LAST, r)}`,
    lat: CENTER.lat + (r() - 0.5) * 0.15,
    lng: CENTER.lng + (r() - 0.5) * 0.15,
    status: i % 4 === 0 ? "on-mission" : i % 4 === 1 ? "dispatched" : "available",
    speed: Math.floor(r() * 60) + 20,
    zone: pick(ZONES, r),
  }));
}

export function generateHospitals(n = 8): Hospital[] {
  const r = seedRand(99);
  const NAMES = [
    "Apollo",
    "Fortis",
    "Max",
    "Yashoda",
    "Columbia Asia",
    "Sarvodaya",
    "Atlanta",
    "Vasundhara Medical",
  ];
  return Array.from({ length: n }, (_, i) => ({
    id: `HSP-${10 + i}`,
    name: `${NAMES[i % NAMES.length]} Hospital`,
    lat: CENTER.lat + (r() - 0.5) * 0.1,
    lng: CENTER.lng + (r() - 0.5) * 0.1,
    beds: 80 + Math.floor(r() * 200),
    icuFree: Math.floor(r() * 12),
    emergencyFree: Math.floor(r() * 18) + 2,
    distanceKm: +(r() * 12 + 1).toFixed(1),
    rating: +(3.5 + r() * 1.5).toFixed(1),
    specialties: ["Trauma", "Cardiac", "Neuro", "Pediatric"].slice(0, 2 + Math.floor(r() * 2)),
  }));
}

export function generateVolunteers(n = 6): Volunteer[] {
  const r = seedRand(33);
  const SKILLS = ["CPR Certified", "First Aid", "EMT-Basic", "Nurse", "Paramedic"];
  return Array.from({ length: n }, (_, i) => ({
    id: `VOL-${200 + i}`,
    name: `${pick(FIRST, r)} ${pick(LAST, r)}`,
    skill: pick(SKILLS, r),
    lat: CENTER.lat + (r() - 0.5) * 0.05,
    lng: CENTER.lng + (r() - 0.5) * 0.05,
    distance: +(r() * 2 + 0.1).toFixed(2),
    status: i % 3 === 0 ? "responding" : "available",
  }));
}

export const responseTimeData = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
  before: 18 - Math.random() * 2,
  after: 7 - Math.random() * 1.5,
}));

export const emergencyTypeData = [
  { name: "Accident", value: 412, color: "oklch(0.65 0.25 25)" },
  { name: "Cardiac", value: 286, color: "oklch(0.62 0.2 245)" },
  { name: "Trauma", value: 198, color: "oklch(0.78 0.18 70)" },
  { name: "Stroke", value: 152, color: "oklch(0.65 0.22 305)" },
  { name: "Maternal", value: 121, color: "oklch(0.72 0.2 150)" },
];

export const utilizationData = Array.from({ length: 24 }, (_, h) => ({
  hour: `${String(h).padStart(2, "0")}:00`,
  ambulances: Math.round(40 + 50 * Math.abs(Math.sin((h - 6) / 4)) + Math.random() * 10),
  hospitals: Math.round(55 + 30 * Math.abs(Math.sin((h - 8) / 5)) + Math.random() * 8),
}));

export const livesSavedData = Array.from({ length: 7 }, (_, i) => ({
  day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
  lives: Math.round(40 + Math.random() * 30),
  incidents: Math.round(80 + Math.random() * 50),
}));

export const heatmapZones = [
  { name: "Raj Nagar Flyover", risk: 92, incidents: 48 },
  { name: "GT Road Crossing", risk: 87, incidents: 41 },
  { name: "Hindon Bridge", risk: 78, incidents: 33 },
  { name: "Mohan Nagar", risk: 71, incidents: 28 },
  { name: "Vaishali Metro", risk: 64, incidents: 22 },
  { name: "Crossings Republik", risk: 58, incidents: 19 },
];

export const platformStats = {
  hospitals: 50,
  ambulances: 100,
  volunteers: 200,
  emergencyRecords: 1000,
  avgResponseSec: 412,
  livesSaved: 8742,
  citiesActive: 12,
  uptime: 99.98,
};

// ===== AEGIS COMMAND CENTER EXTENSIONS =====

export interface AegisAgent {
  id: string;
  name: string;
  status: "idle" | "processing" | "done" | "error";
  currentTask: string;
}

export interface CCTVDetection {
  type: "accident" | "vehicle" | "person" | "fire" | "smoke" | "crowd";
  confidence: number;
  timestamp: string;
}

export interface CCTVCamera {
  id: string;
  location: string;
  zone: string;
  status: "live" | "offline";
  detections: CCTVDetection[];
}

export const cctvCameras: CCTVCamera[] = [
  {
    id: "CAM-001",
    location: "NH-24 Bridge Overpass",
    zone: "Sector 62",
    status: "live",
    detections: [
      { type: "accident", confidence: 94, timestamp: "16:22:04" },
      { type: "vehicle", confidence: 99, timestamp: "16:22:04" },
      { type: "person", confidence: 87, timestamp: "16:22:05" },
    ],
  },
  {
    id: "CAM-002",
    location: "Raj Nagar Flyover",
    zone: "Raj Nagar",
    status: "live",
    detections: [
      { type: "crowd", confidence: 78, timestamp: "16:21:30" },
      { type: "vehicle", confidence: 95, timestamp: "16:21:31" },
    ],
  },
  {
    id: "CAM-003",
    location: "Indirapuram Junction",
    zone: "Indirapuram",
    status: "offline",
    detections: [],
  },
  {
    id: "CAM-004",
    location: "Vasundhara Sector 4",
    zone: "Vasundhara",
    status: "live",
    detections: [
      { type: "smoke", confidence: 72, timestamp: "16:20:15" },
      { type: "fire", confidence: 68, timestamp: "16:20:16" },
    ],
  },
  {
    id: "CAM-005",
    location: "GT Road Junction",
    zone: "Govindpuram",
    status: "live",
    detections: [{ type: "vehicle", confidence: 91, timestamp: "16:19:44" }],
  },
];

export function getAgentStates(incidentStatus: Emergency["status"]): AegisAgent[] {
  const stageOrder: Emergency["status"][] = [
    "active",
    "dispatched",
    "en-route",
    "at-hospital",
    "resolved",
  ];
  const stageIdx = stageOrder.indexOf(incidentStatus);

  const isDone = (requiredStage: number) => stageIdx >= requiredStage;
  const isProcessing = (requiredStage: number) => stageIdx === requiredStage - 1;

  return [
    {
      id: "incident-agent",
      name: "Incident Agent",
      status: isDone(1) ? "done" : isProcessing(1) ? "processing" : "idle",
      currentTask: isDone(1)
        ? "Severity classified · Victims estimated: 4–6"
        : isProcessing(1)
          ? "Classifying incident severity..."
          : "Awaiting incident trigger",
    },
    {
      id: "vision-agent",
      name: "Vision Agent",
      status: isDone(1) ? "done" : isProcessing(1) ? "processing" : "idle",
      currentTask: isDone(1)
        ? "CCTV analyzed · Accident + 4 persons detected (94%)"
        : isProcessing(1)
          ? "Processing CCTV feed CAM-001..."
          : "Monitoring camera network",
    },
    {
      id: "ambulance-agent",
      name: "Ambulance Agent",
      status: isDone(2) ? "done" : isProcessing(2) ? "processing" : "idle",
      currentTask: isDone(2)
        ? "AMB-100 selected · 96% match · ETA 4 min"
        : isProcessing(2)
          ? "Selecting optimal ambulance..."
          : "Awaiting incident classification",
    },
    {
      id: "hospital-agent",
      name: "Hospital Agent",
      status: isDone(2) ? "done" : isProcessing(2) ? "processing" : "idle",
      currentTask: isDone(2)
        ? "Apollo Hospital matched · ICU: 8 free · 3.2 km"
        : isProcessing(2)
          ? "Matching hospital capacity..."
          : "Awaiting incident classification",
    },
    {
      id: "traffic-agent",
      name: "Traffic Agent",
      status: isDone(3) ? "done" : isProcessing(3) ? "processing" : "idle",
      currentTask: isDone(3)
        ? "Green corridor active · 6 signals overridden"
        : isProcessing(3)
          ? "Creating emergency corridor..."
          : "Awaiting dispatch confirmation",
    },
    {
      id: "volunteer-agent",
      name: "Volunteer Agent",
      status: isDone(2) ? "done" : isProcessing(2) ? "processing" : "idle",
      currentTask: isDone(2)
        ? "2 volunteers notified · Nearest ETA 3 min"
        : isProcessing(2)
          ? "Locating certified nearby responders..."
          : "Awaiting incident classification",
    },
    {
      id: "command-agent",
      name: "Command Agent",
      status: isDone(3) ? "done" : isProcessing(3) ? "processing" : "idle",
      currentTask: isDone(3)
        ? "Response plan ready · Awaiting operator approval"
        : isProcessing(3)
          ? "Generating unified response plan..."
          : "Coordinating all agents",
    },
  ];
}

// ===== TRAFFIC POLICE / TRAFFIC CONTROL EXTENSIONS =====

export interface TrafficCorridor {
  id: string;
  ambulanceId: string;
  incidentId: string;
  routeName: string;
  signalsOverridden: number;
  status: "active" | "cleared" | "pending";
  startTime: string;
  etaSavedMin: number;
  origin: string;
  destination: string;
}

export interface TrafficSignal {
  id: string;
  intersection: string;
  zone: string;
  status: "green-override" | "normal-auto" | "manual-hold" | "congested";
  overrideBy?: string;
  timeRemainingSec: number;
}

export interface TrafficCongestionZone {
  id: string;
  zoneName: string;
  congestionLevel: "critical" | "heavy" | "moderate" | "clear";
  avgSpeedKmH: number;
  activeIncidents: number;
}

export interface RoadBlockage {
  id: string;
  location: string;
  zone: string;
  cause: string;
  severity: "high" | "medium" | "low";
  reportedAt: string;
  clearingETA: string;
  reroutePlan: string;
}

export const initialTrafficCorridors: TrafficCorridor[] = [
  {
    id: "COR-101",
    ambulanceId: "AMB-1083",
    incidentId: "EMG-1258",
    routeName: "Sector 62 Crossing → NH-24 → City Care Trauma Hub",
    signalsOverridden: 6,
    status: "active",
    startTime: "16:22:10",
    etaSavedMin: 6.5,
    origin: "Sector 62 Crossing",
    destination: "City Care Trauma Hub",
  },
  {
    id: "COR-102",
    ambulanceId: "AMB-1094",
    incidentId: "EMG-1262",
    routeName: "Raj Nagar Flyover → GT Road → Fortis Hospital",
    signalsOverridden: 4,
    status: "pending",
    startTime: "16:20:00",
    etaSavedMin: 4.2,
    origin: "Raj Nagar Flyover",
    destination: "Fortis Hospital",
  },
];

export const initialTrafficSignals: TrafficSignal[] = [
  {
    id: "SIG-621",
    intersection: "Sector 62 Main Junction",
    zone: "Sector 62",
    status: "green-override",
    overrideBy: "AMB-1083 Green Corridor",
    timeRemainingSec: 140,
  },
  {
    id: "SIG-622",
    intersection: "NH-24 Bypass Slip Road",
    zone: "Sector 62",
    status: "green-override",
    overrideBy: "AMB-1083 Green Corridor",
    timeRemainingSec: 180,
  },
  {
    id: "SIG-301",
    intersection: "Raj Nagar Flyover Entry",
    zone: "Raj Nagar",
    status: "normal-auto",
    timeRemainingSec: 45,
  },
  {
    id: "SIG-404",
    intersection: "Indirapuram Metro Gate 2",
    zone: "Indirapuram",
    status: "congested",
    timeRemainingSec: 25,
  },
  {
    id: "SIG-508",
    intersection: "GT Road Central Junction",
    zone: "Govindpuram",
    status: "normal-auto",
    timeRemainingSec: 60,
  },
  {
    id: "SIG-712",
    intersection: "Vasundhara Sector 4 Crossing",
    zone: "Vasundhara",
    status: "green-override",
    overrideBy: "AMB-1094 Emergency",
    timeRemainingSec: 95,
  },
];

export const initialCongestionZones: TrafficCongestionZone[] = [
  {
    id: "Z-01",
    zoneName: "NH-24 Bridge Flyover",
    congestionLevel: "critical",
    avgSpeedKmH: 14,
    activeIncidents: 2,
  },
  {
    id: "Z-02",
    zoneName: "Raj Nagar Central Junction",
    congestionLevel: "heavy",
    avgSpeedKmH: 22,
    activeIncidents: 1,
  },
  {
    id: "Z-03",
    zoneName: "Sector 62 Metro Corridor",
    congestionLevel: "clear",
    avgSpeedKmH: 52,
    activeIncidents: 1,
  },
  {
    id: "Z-04",
    zoneName: "GT Road Industrial Crossing",
    congestionLevel: "moderate",
    avgSpeedKmH: 34,
    activeIncidents: 0,
  },
  {
    id: "Z-05",
    zoneName: "Vasundhara Link Road",
    congestionLevel: "clear",
    avgSpeedKmH: 48,
    activeIncidents: 0,
  },
];

export const initialRoadBlockages: RoadBlockage[] = [
  {
    id: "BLK-01",
    location: "NH-24 Underpass Flyover",
    zone: "Sector 62",
    cause: "Two-vehicle collision blocking Lane 1 & 2",
    severity: "high",
    reportedAt: "16:18",
    clearingETA: "15 mins",
    reroutePlan: "Divert light vehicles to Sector 62 Link Road; Keep emergency lane open",
  },
  {
    id: "BLK-02",
    location: "Raj Nagar Flyover Exit",
    zone: "Raj Nagar",
    cause: "Stalled freight truck on right shoulder",
    severity: "medium",
    reportedAt: "16:05",
    clearingETA: "10 mins",
    reroutePlan: "Use Service Road 3 for northbound traffic",
  },
];
