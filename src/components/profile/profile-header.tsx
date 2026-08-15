import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import ProfileEdit from "./profile-edit";
import ProfileSettings from "./profile-settings";
import NotificationPreferences from "./notification-preferences";
import SecuritySettings from "./security-settings";
import { clearSession } from "@/lib/profile";
import { toast } from "sonner";
import { MotionButton } from "@/components/ui/motion";
import { useAuth } from "@/hooks/use-auth";
import { LogOut } from "lucide-react";

export default function ProfileHeader({
  name,
  subtitle,
  role = "citizen",
  logoutPath = "/login",
  children,
}: {
  name: string;
  subtitle?: string | ReactNode;
  role?: string;
  logoutPath?: string;
  children?: ReactNode;
}) {
  const { logout } = useAuth();

  const initials = name
    ? name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
    : "";

  const handleLogout = () => {
    if (logout) {
      logout();
    }
    clearSession();
    localStorage.removeItem("aegis_user");
    localStorage.removeItem("aegis_token");
    toast.success("Logout successful");
    window.location.href = logoutPath;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[#E63946]/10 text-2xl font-bold text-[#E63946] shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-lg font-bold text-[#111111]">{name}</p>
            {subtitle && <p className="text-xs text-[#525866]">{subtitle}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ProfileEdit role={role} />
          {role !== "citizen" && <ProfileSettings role={role} />}
          <NotificationPreferences role={role} />
          <SecuritySettings role={role} />
          <MotionButton
            type="button"
            onClick={handleLogout}
            className="rounded-2xl bg-[#E63946] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#C32F3A] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <LogOut className="h-4 w-4 stroke-[2.5]" />
            <span>Logout</span>
          </MotionButton>
        </div>
      </div>
      {children}
    </div>
  );
}
