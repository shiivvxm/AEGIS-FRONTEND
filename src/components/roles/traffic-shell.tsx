import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Camera,
  Compass,
  LogOut,
  MapPin,
  MessageSquare,
  Radio,
  Shield,
  Signal,
  TrafficCone,
  User,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AegisBrand } from "@/components/design-system";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { getProfile, getDisplayName } from "@/lib/profile";

export type TrafficTab = "map" | "cctv" | "corridors" | "incidents" | "coordination" | "profile";

const TABS: { id: TrafficTab; label: string; icon: LucideIcon }[] = [
  { id: "map", label: "Traffic Map", icon: TrafficCone },
  { id: "cctv", label: "CCTV Feeds", icon: Camera },
  { id: "corridors", label: "Corridors", icon: Zap },
  { id: "incidents", label: "Incidents", icon: AlertTriangle },
  { id: "coordination", label: "Inter-Agency", icon: Radio },
  { id: "profile", label: "Officer Duty", icon: User },
];

export function TrafficShell({
  activeTab,
  onTabChange,
  children,
  activeCorridorsCount = 2,
}: {
  activeTab: TrafficTab;
  onTabChange: (tab: TrafficTab) => void;
  children: ReactNode;
  activeCorridorsCount?: number;
}) {
  const { user, logout } = useAuth();
  const profile = getProfile("traffic");
  const name = getDisplayName("traffic", user);
  const badgeId = profile.employeeId || "TRF-9021";

  const initials = name
    ? name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
    : "TR";

  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      {/* Sidebar Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-[#E5E7EB] bg-white lg:flex">
        <div className="border-b border-[#E5E7EB] px-5 py-4">
          <AegisBrand to="/traffic" />
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 p-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-xs font-bold text-gray-900">Traffic Grid Active</div>
              <div className="text-[10px] text-blue-700 font-semibold">
                {activeCorridorsCount} Corridors Synced
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors cursor-pointer",
                  isActive
                    ? "bg-blue-600/10 font-bold text-blue-700"
                    : "text-gray-600 hover:bg-[#F8F9FB] hover:text-gray-900 font-medium",
                )}
              >
                <t.icon
                  className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-600" : "text-gray-400")}
                />
                <span className="flex-1 truncate">{t.label}</span>
                {t.id === "corridors" && activeCorridorsCount > 0 && (
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[9px] font-extrabold">
                    {activeCorridorsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#E5E7EB] space-y-2">
          <button
            type="button"
            onClick={() => onTabChange("profile")}
            className="flex w-full items-center gap-2.5 rounded-xl bg-gray-50 p-2.5 text-left border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-600/10 text-xs font-black text-blue-700">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-gray-900 truncate">{name}</div>
              <div className="text-[9px] text-gray-500 font-mono font-semibold">{badgeId}</div>
            </div>
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2 text-[10px] font-bold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Log Out Portal
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-56">
        <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white px-4 py-3 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-[#111111]">AEGIS Traffic Operations Grid</h1>
              <p className="text-xs text-[#525866]">Emergency Traffic Management Portal</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-extrabold text-emerald-700 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Signals Synced
              </span>
              <button
                type="button"
                onClick={() => onTabChange("profile")}
                aria-label="Open profile"
                className="cursor-pointer"
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600/10 text-xs font-black text-blue-700">
                  {initials}
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Pills */}
          <div className="mt-3 flex gap-1 overflow-x-auto lg:hidden">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-semibold cursor-pointer",
                  activeTab === t.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 bg-[#F8F9FB]">{children}</main>
      </div>
    </div>
  );
}
