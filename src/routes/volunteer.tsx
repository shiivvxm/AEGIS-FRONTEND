import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  HeartPulse,
  Play,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { SectionCard, SeverityBadge } from "@/components/design-system";
import { VolunteerShell, type VolunteerTab } from "@/components/roles/volunteer-shell";
import { LiveMap } from "@/components/live-map";
import ProfileHeader from "@/components/profile/profile-header";
import { toast } from "sonner";

export const Route = createFileRoute("/volunteer")({
  head: () => ({ meta: [{ title: "Volunteer Response · AEGIS" }] }),
  component: VolunteerPortal,
});

import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getProfile, getDisplayName } from "@/lib/profile";

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

  if (isLoading || !isAuthenticated || user?.role?.toLowerCase() !== "volunteer") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-6 w-6 animate-ping bg-purple-600 rounded-full" />
      </div>
    );
  }
  const [volStats, setVolStats] = useState({
    rating: 4.9,
    incidentsResponded: 14,
    communityScore: 880,
    skillRank: "Gold Responder",
    rewardPoints: 2450,
  });

  const handleComplete = () => {
    setCompleted(true);
    setVolStats((s) => ({
      ...s,
      incidentsResponded: s.incidentsResponded + 1,
      communityScore: s.communityScore + 50,
      rewardPoints: s.rewardPoints + 50,
    }));
  };

  return (
    <VolunteerShell activeTab={tab} onTabChange={setTab} onDuty>
      {tab === "incidents" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-[#E63946]/30 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-[#E63946]">
                  <HeartPulse className="h-4 w-4 pulse-emergency" /> 800m away
                </span>
                <SeverityBadge severity="critical" />
              </div>
              <h3 className="mt-2 text-lg font-extrabold text-[#111111]">Cardiac Arrest — Sector 62</h3>
              <p className="mt-1 text-xs text-[#525866]">
                Male, ~56 years. Ambulance ETA 4m. CPR assistance needed immediately.
              </p>
              {!accepted ? (
                <button
                  onClick={() => {
                    setAccepted(true);
                    toast.success("Incident accepted! Route to victim highlighted.");
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-md hover:bg-purple-700 active:scale-[0.98] transition-all"
                >
                  <Play className="h-4 w-4" /> Accept Dispatch (Respond Now)
                </button>
              ) : (
                <div className="mt-4 space-y-2">
                  {!arrived ? (
                    <button
                      onClick={() => {
                        setArrived(true);
                        toast.info("Marked as arrived at victim location.");
                      }}
                      className="w-full rounded-xl bg-warning p-3 text-xs font-bold text-black"
                    >
                      Mark Arrived at Location
                    </button>
                  ) : !completed ? (
                    <button
                      onClick={handleComplete}
                      className="w-full rounded-xl bg-success p-3 text-xs font-bold text-white"
                    >
                      Complete Handover (+50 pts)
                    </button>
                  ) : (
                    <div className="rounded-xl bg-success/10 p-3 text-center text-xs font-bold text-success">
                      ✓ Response Complete · Handover Logged
                    </div>
                  )}
                </div>
              )}
            </div>
            <SectionCard title="Active Responders Nearby">
              <div className="space-y-2 text-xs text-[#525866]">
                <p>● 3 volunteers within 1km (CPR Certified)</p>
                <p>● 1 AED unit at Sector 62 Metro Station (300m)</p>
              </div>
            </SectionCard>
          </div>
          <div className="h-[450px] lg:h-auto min-h-[400px]">
            <LiveMap
              center={[77.3649, 28.6280]}
              zoom={14}
              markers={[
                { id: "vic", type: "citizen", x: 50, y: 50, label: "Victim (Sector 62)", active: true },
                { id: "vol", type: "volunteer", x: 45, y: 55, label: "You (Volunteer)", active: true },
                { id: "amb", type: "ambulance", x: 70, y: 30, label: "AMB-1083", active: true },
              ]}
              showRoute
              routeType="volunteer"
            />
          </div>
        </div>
      )}

      {tab === "training" && (
        <div className="space-y-4">
          <SectionCard title="Certified Training Modules">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: "Bystander CPR & AED Basics", level: "Beginner", time: "15 mins", done: true },
                { title: "Trauma Bleeding Control (STOP THE BLEED)", level: "Intermediate", time: "20 mins", done: true },
                { title: "Overdose & Naloxone Response", level: "Advanced", time: "25 mins", done: false },
                { title: "Crowd Control & Triage Communication", level: "Intermediate", time: "15 mins", done: false },
              ].map((m) => (
                <div key={m.title} className="rounded-xl bg-white p-4 ring-1 ring-[#E5E7EB] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-purple-600">{m.level} · {m.time}</span>
                    <h4 className="text-sm font-bold text-[#111111]">{m.title}</h4>
                  </div>
                  {m.done ? (
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                  ) : (
                    <button
                      onClick={() => toast.info(`Started course: ${m.title}`)}
                      className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700"
                    >
                      Start
                    </button>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "rewards" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#E5E7EB]">
              <Trophy className="h-6 w-6 text-purple-600" />
              <p className="mt-2 text-2xl font-bold text-[#111111]">{volStats.skillRank}</p>
              <p className="text-xs text-[#525866]">Current rank</p>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#E5E7EB]">
              <Star className="h-6 w-6 text-warning" />
              <p className="mt-2 text-2xl font-bold text-[#111111]">{volStats.rating} ★</p>
              <p className="text-xs text-[#525866]">Community rating</p>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#E5E7EB]">
              <Award className="h-6 w-6 text-success" />
              <p className="mt-2 text-2xl font-bold text-[#111111]">{volStats.rewardPoints}</p>
              <p className="text-xs text-[#525866]">Reward points</p>
            </div>
          </div>
          <SectionCard title="Achievement Badges">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["First Response", "CPR Hero", "10 Lives", "Night Owl", "Speed Responder", "Community Leader"].map((badge) => (
                <div key={badge} className="rounded-xl bg-[#F8F9FB] p-4 text-center">
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-5 w-5 text-success" />
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

      {tab === "history" && (
        <div className="space-y-3">
          {[
            { id: "EMG-1180", type: "CPR Assistance", date: "Mar 2", outcome: "Patient stabilized" },
            { id: "EMG-1092", type: "First Aid", date: "Feb 18", outcome: "Ambulance handover" },
            { id: "EMG-1055", type: "AED Deployment", date: "Feb 5", outcome: "Rhythm restored" },
          ].map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-[#E5E7EB]">
              <div>
                <p className="font-bold text-[#111111]">{h.id} · {h.type}</p>
                <p className="text-xs text-[#525866]">{h.date} · {h.outcome}</p>
              </div>
              <span className="text-[10px] font-bold text-success">+50 pts</span>
            </div>
          ))}
        </div>
      )}

      {tab === "profile" && (() => {
        const profile = getProfile("volunteer");
        const name = getDisplayName("volunteer", user);
        const subtitle = `VOL-${user?.id?.substr(-4).toUpperCase() || "202"} · ${profile.skillRank || "Gold Responder"}`;
        const skillsList = Array.isArray(profile.skills) ? profile.skills.join(", ") : (profile.skills || "CPR, First Aid, AED");
        const responseTypesList = Array.isArray(profile.preferredResponseTypes)
          ? profile.preferredResponseTypes.join(", ")
          : profile.preferredResponseTypes;

        return (
          <div className="mx-auto max-w-lg space-y-4">
            <ProfileHeader name={name} subtitle={subtitle} role="volunteer" />
            {[
              { label: "Full Name", value: name },
              { label: "Active Skills", value: skillsList },
              { label: "Preferred Response Types", value: responseTypesList || "Medical Emergency, Road Accident" },
              { label: "Government / Volunteer ID", value: profile.idNumber || profile.idProofName || "Verified ID" },
              {
                label: "Emergency Contact",
                value: profile.emergencyContactName
                  ? `${profile.emergencyContactName} (${profile.relationship || "Contact"}) - +91 ${profile.emergencyContactNumber}`
                  : "Registered Contact",
              },
              {
                label: "Emergency Dispatch Availability",
                value: profile.emergencyDispatchAvailable ? `Available (${profile.emergencyDispatchAvailable})` : "Yes",
              },
              { label: "Community Score", value: `${volStats.communityScore} XP` },
              { label: "Response Radius", value: profile.availabilityRadius || "2 km" },
              { label: "Blood Group", value: profile.bloodGroup || "O+" },
            ].map((row) => (
              <div key={row.label} className="rounded-xl bg-white p-4 ring-1 ring-[#E5E7EB]">
                <p className="text-[10px] font-bold uppercase text-[#525866]">{row.label}</p>
                <p className="text-sm font-semibold text-[#111111]">{row.value}</p>
              </div>
            ))}
            <SectionCard title="Emergency Learning Center">
              <p className="flex items-start gap-2 text-xs text-[#525866]">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-medical" />
                Complete 2 more courses to unlock Platinum Responder status and priority dispatch notifications.
              </p>
            </SectionCard>
          </div>
        );
      })()}
    </VolunteerShell>
  );
}
