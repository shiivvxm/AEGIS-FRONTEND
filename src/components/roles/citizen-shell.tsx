import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Brain,
  Building2,
  CheckCircle2,
  Clock,
  HeartPulse,
  HelpCircle,
  Home,
  LogOut,
  MapPin,
  MessageCircle,
  Share2,
  Shield,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AegisBrand } from "@/components/design-system";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { getProfile, getDisplayName } from "@/lib/profile";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type CitizenTab = "home" | "emergency" | "tracking" | "history" | "profile";

export interface CitizenShellProps {
  activeTab: CitizenTab;
  onTabChange: (tab: CitizenTab) => void;
  onOpenModal?: (modal: "first-aid" | "hospitals" | "chat" | "share" | "help" | null) => void;
  children: ReactNode;
  header?: ReactNode;
}

export function CitizenShell({
  activeTab,
  onTabChange,
  onOpenModal,
  children,
  header,
}: CitizenShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const profile = getProfile("citizen");
  const name = getDisplayName("citizen", user);
  const userInitial = name ? name.charAt(0).toUpperCase() : "C";

  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  // Real Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: "n1",
      title: "Sector 62 Emergency Grid Active",
      desc: "Dispatch units & nearby trauma centers online.",
      time: "Just now",
      unread: true,
    },
    {
      id: "n2",
      title: "Medical Profile Verified",
      desc: "Emergency contacts & allergies synced with dispatch.",
      time: "2h ago",
      unread: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out of AEGIS Citizen Portal");
    navigate({ to: "/login" });
  };

  const handleHelpClick = () => {
    setHelpDialogOpen(true);
  };

  const SIDEBAR_ITEMS: {
    id: string;
    label: string;
    icon: LucideIcon;
    action: () => void;
    isActive?: boolean;
    badge?: string;
  }[] = [
    {
      id: "home",
      label: "Dashboard / Home",
      icon: Home,
      action: () => onTabChange("home"),
      isActive: activeTab === "home",
    },
    {
      id: "emergency",
      label: "Emergency",
      icon: HeartPulse,
      action: () => onTabChange("emergency"),
      isActive: activeTab === "emergency",
    },
    {
      id: "tracking",
      label: "Tracking",
      icon: MapPin,
      action: () => onTabChange("tracking"),
      isActive: activeTab === "tracking",
    },
    {
      id: "history",
      label: "History",
      icon: Clock,
      action: () => onTabChange("history"),
      isActive: activeTab === "history",
    },
    {
      id: "first-aid",
      label: "AI First Aid",
      icon: Brain,
      action: () => {
        onTabChange("home");
        if (onOpenModal) onOpenModal("first-aid");
      },
    },
    {
      id: "hospitals",
      label: "Nearby Hospitals",
      icon: Building2,
      action: () => {
        onTabChange("home");
        if (onOpenModal) onOpenModal("hospitals");
      },
    },
    {
      id: "chat",
      label: "Emergency Chat",
      icon: MessageCircle,
      action: () => {
        onTabChange("home");
        if (onOpenModal) onOpenModal("chat");
      },
    },
    {
      id: "share",
      label: "Share Location",
      icon: Share2,
      action: () => {
        onTabChange("home");
        if (onOpenModal) onOpenModal("share");
      },
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      action: () => onTabChange("profile"),
      isActive: activeTab === "profile",
    },
    {
      id: "help",
      label: "Help & Support",
      icon: HelpCircle,
      action: handleHelpClick,
    },
  ];

  return (
    <div className="flex min-h-screen bg-white">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col border-r border-[#E5E7EB] bg-white p-4 w-[280px] shrink-0 justify-between">
        <div>
          <div className="mb-6 px-1">
            <AegisBrand to="/citizen" />
          </div>

          <nav className="flex flex-col gap-1">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all cursor-pointer",
                    item.isActive
                      ? "bg-[#E63946] text-white shadow-sm font-bold"
                      : "text-[#525866] hover:bg-[#F8F9FB] hover:text-[#111111]",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-[#E63946]/10 px-2 py-0.5 text-[9px] font-bold text-[#E63946]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* LOGOUT & USER FOOTER */}
        <div className="pt-4 border-t border-[#E5E7EB] space-y-2">
          <button
            type="button"
            onClick={() => onTabChange("profile")}
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[#F8F9FB] border border-gray-150 transition-all"
          >
            <div className="h-9 w-9 rounded-full bg-[#E63946] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#111111] truncate">{name}</div>
              <div className="text-[10px] text-[#525866]">Citizen Portal</div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* HEADER */}
        <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white/95 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="lg:hidden">
                <AegisBrand compact to="/citizen" />
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-bold text-emerald-700 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  System Online · Grid Active
                </span>
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Verified Account
                </span>
              </div>
              {header}
            </div>

            <div className="flex items-center gap-2.5">
              {/* NOTIFICATION POPOVER */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="relative grid h-9 w-9 place-items-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4 text-gray-700" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-[#E63946] text-[9px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 bg-white shadow-xl border border-gray-200">
                  <div className="flex items-center justify-between border-b border-gray-100 p-3 bg-gray-50/50">
                    <span className="text-xs font-bold text-gray-900">Notifications</span>
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-[#E63946] font-bold hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn("p-3 space-y-0.5 text-xs", n.unread ? "bg-red-50/30" : "")}
                      >
                        <p className="font-bold text-gray-900">{n.title}</p>
                        <p className="text-[10px] text-gray-500">{n.desc}</p>
                        <span className="block text-[8px] text-gray-400 mt-1">{n.time}</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* USER AVATAR BUTTON */}
              <button
                type="button"
                onClick={() => onTabChange("profile")}
                aria-label="Open profile"
                className="flex items-center gap-2 rounded-xl border border-gray-200 p-1 pr-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="h-7 w-7 rounded-full bg-[#E63946] text-white flex items-center justify-center font-bold text-xs">
                  {userInitial}
                </div>
                <span className="hidden sm:inline text-xs font-bold text-gray-900 truncate max-w-[100px]">
                  {name}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* MAIN BODY CONTENT */}
        <main className="flex-1 overflow-y-auto bg-[#F8F9FB] p-4 sm:p-6 pb-24 lg:pb-6">
          {children}
        </main>

        {/* MOBILE NAVIGATION BAR */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E5E7EB] bg-white/95 backdrop-blur-md lg:hidden">
          <div className="flex w-full items-stretch justify-around px-2 py-1.5">
            {[
              { id: "home" as const, label: "Home", icon: Home },
              { id: "emergency" as const, label: "Emergency", icon: HeartPulse },
              { id: "tracking" as const, label: "Tracking", icon: MapPin },
              { id: "history" as const, label: "History", icon: Clock },
              { id: "profile" as const, label: "Profile", icon: User },
            ].map((tab) => {
              const active = activeTab === tab.id;
              const isEmergency = tab.id === "emergency";
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors",
                    active && "text-[#E63946] font-bold",
                    !active && "text-[#525866]",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-full transition-all",
                      isEmergency && "bg-[#E63946] text-white shadow-md",
                      !isEmergency && active && "bg-[#E63946]/10",
                      !isEmergency && !active && "bg-transparent",
                    )}
                  >
                    <tab.icon className={cn("h-4 w-4", isEmergency && "text-white")} />
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* HELP & SUPPORT DIALOG */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#E63946]">
              <HelpCircle className="h-5 w-5" />
              <span>AEGIS Help &amp; Emergency Support</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <p className="text-gray-600">
              Need immediate assistance? AEGIS emergency coordinators and national lifelines are
              available 24/7.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="tel:108"
                className="rounded-xl bg-[#E63946] p-3 text-center text-white font-bold hover:bg-[#C32F3A] transition-colors"
              >
                Dial Emergency 108
              </a>
              <a
                href="tel:112"
                className="rounded-xl bg-gray-900 p-3 text-center text-white font-bold hover:bg-gray-800 transition-colors"
              >
                Dial National 112
              </a>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
              <p className="font-bold text-gray-900">Noida Metropolitan Grid Support</p>
              <p className="text-gray-500">Email: support@aegis-response.gov.in</p>
              <p className="text-gray-500">Helpline: +91 120 240 0000</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
