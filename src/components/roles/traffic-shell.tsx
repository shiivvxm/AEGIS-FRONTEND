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

  return (
    <div className="flex min-h-screen bg-[#080C14] text-white">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col border-r border-[#242E42] bg-[#0D1220] p-4 w-[280px]">
        <div className="mb-6 flex items-center justify-between">
          <AegisBrand to="/traffic" />
        </div>

        <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
              Traffic Control Active
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 font-medium">
            {activeCorridorsCount} Emergency Corridors Locked
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">
          {TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all",
                  isActive
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-sm"
                    : "text-gray-400 hover:bg-[#161D2D] hover:text-white border border-transparent",
                )}
              >
                <t.icon className={cn("h-4 w-4", isActive ? "text-emerald-400" : "text-gray-400")} />
                <span className="flex-1">{t.label}</span>
                {t.id === "corridors" && activeCorridorsCount > 0 && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-extrabold text-emerald-400">
                    {activeCorridorsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-4 pt-3 border-t border-[#242E42] space-y-2">
          <button
            type="button"
            onClick={() => onTabChange("profile")}
            className="flex w-full items-center gap-3 rounded-xl bg-[#161D2D]/60 p-2.5 text-left ring-1 ring-[#242E42] hover:bg-[#161D2D] transition-colors"
          >
            <Avatar className="h-8 w-8 ring-2 ring-emerald-500/40" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{name}</div>
              <div className="text-[9px] text-emerald-400 font-mono font-semibold">{badgeId}</div>
            </div>
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-2 text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Log Out Portal
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-20 border-b border-[#242E42] bg-[#0D1220]/95 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AegisBrand compact to="/traffic" />
              <div className="hidden sm:block text-xs font-bold text-white tracking-wide uppercase border-l border-[#242E42] pl-3">
                AEGIS Traffic Operations Grid
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[10px] font-extrabold text-emerald-400">
                ● Live Signals Synced
              </span>
              <button
                type="button"
                onClick={() => onTabChange("profile")}
                className="lg:hidden"
                aria-label="Open profile"
              >
                <Avatar className="h-8 w-8 ring-2 ring-emerald-500/40" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#080C14] pb-24 lg:pb-6">{children}</main>

        {/* Mobile Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#242E42] bg-[#0D1220]/95 backdrop-blur-md lg:hidden">
          <div className="flex w-full items-stretch justify-around px-2 py-1.5">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-extrabold transition-colors",
                    active ? "text-emerald-400" : "text-gray-400",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-xl transition-all",
                      active ? "bg-emerald-500/20 text-emerald-400" : "bg-transparent",
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                  </span>
                  <span className="truncate max-w-full">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
