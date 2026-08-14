import React, { createContext, useState, useEffect } from "react";
import { User, Role } from "@/types";

const INITIAL_MOCK_USERS: User[] = [
  {
    id: "usr-citizen-1",
    email: "citizen@aegis.org",
    name: "Rahul Verma",
    role: "citizen",
    mobileNumber: "9876543210",
    isVerified: true,
  },
  {
    id: "usr-volunteer-1",
    email: "volunteer@aegis.org",
    name: "Aarav Sharma",
    role: "volunteer",
    mobileNumber: "9876543214",
    isVerified: true,
  },
  {
    id: "usr-ambulance-1",
    email: "ambulance@aegis.org",
    name: "Vivaan Sharma",
    role: "ambulance",
    mobileNumber: "9876543216",
    isVerified: true,
  },
  {
    id: "usr-hospital-1",
    email: "hospital@aegis.org",
    name: "City Care Trauma Center",
    role: "hospital",
    mobileNumber: "9876543218",
    isVerified: true,
  },
  {
    id: "usr-traffic-1",
    email: "traffic@aegis.org",
    name: "Rahul Verma",
    role: "traffic",
    mobileNumber: "9876543219",
    isVerified: true,
  },
  {
    id: "usr-command-1",
    email: "command@aegis.org",
    name: "Grid Command Officer",
    role: "command",
    mobileNumber: "9876543220",
    isVerified: true,
  },
];

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (role: Role, identifier: string, password: string) => Promise<User>;
  register: (role: Role, userData: any) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Initialize mock users if not present
    const existingMockUsers = localStorage.getItem("aegis_mock_users");
    if (!existingMockUsers) {
      localStorage.setItem("aegis_mock_users", JSON.stringify(INITIAL_MOCK_USERS));
    }

    // Check stored session
    const storedUser = localStorage.getItem("aegis_user");
    const storedToken = localStorage.getItem("aegis_token");

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (e) {
        console.error("Failed to parse stored user session", e);
        localStorage.removeItem("aegis_user");
        localStorage.removeItem("aegis_token");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (
    arg1: Role | string,
    arg2: string,
    arg3?: Role | string
  ): Promise<User> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    let role: Role;
    let identifier: string;
    let password: string | undefined;

    const validRoles = ["citizen", "volunteer", "ambulance", "hospital", "traffic", "command", "admin"];

    if (typeof arg1 === "string" && validRoles.includes(arg1)) {
      role = arg1 as Role;
      identifier = arg2;
      password = arg3 as string;
    } else if (typeof arg3 === "string" && validRoles.includes(arg3)) {
      identifier = arg1 as string;
      password = arg2;
      role = arg3 as Role;
    } else {
      role = arg1 as Role;
      identifier = arg2;
      password = arg3 as string;
    }

    const mockUsersRaw = localStorage.getItem("aegis_mock_users");
    const mockUsers: any[] = mockUsersRaw ? JSON.parse(mockUsersRaw) : INITIAL_MOCK_USERS;

    const cleanIdentifier = identifier ? identifier.trim().toLowerCase() : "";

    // Search for user by email or mobile number across all mock users
    const matchedUserByIdentifier = mockUsers.find(
      (u) =>
        (u.email && u.email.trim().toLowerCase() === cleanIdentifier) ||
        (u.mobileNumber && u.mobileNumber.trim() === cleanIdentifier)
    );

    if (!matchedUserByIdentifier) {
      setIsLoading(false);
      throw new Error("Account not found. Please create an account first.");
    }

    const userRoleLower = matchedUserByIdentifier.role ? String(matchedUserByIdentifier.role).trim().toLowerCase() : "";
    const targetRoleLower = role ? String(role).trim().toLowerCase() : "";

    const isRoleMatch =
      userRoleLower === targetRoleLower ||
      ((userRoleLower === "command" || userRoleLower === "admin") &&
        (targetRoleLower === "command" || targetRoleLower === "admin"));

    if (!isRoleMatch) {
      setIsLoading(false);
      throw new Error("Selected portal role does not match this account.");
    }

    if (matchedUserByIdentifier.password && password && matchedUserByIdentifier.password !== password) {
      setIsLoading(false);
      throw new Error("Invalid email or password.");
    }

    const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + btoa(JSON.stringify(matchedUserByIdentifier));

    localStorage.setItem("aegis_user", JSON.stringify(matchedUserByIdentifier));
    localStorage.setItem("aegis_token", mockToken);

    setUser(matchedUserByIdentifier);
    setToken(mockToken);
    setIsLoading(false);

    return matchedUserByIdentifier;
  };

  const register = async (role: Role, userData: any): Promise<User> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const mockUsersRaw = localStorage.getItem("aegis_mock_users");
    const mockUsers: any[] = mockUsersRaw ? JSON.parse(mockUsersRaw) : INITIAL_MOCK_USERS;

    const cleanEmail = userData.email?.trim().toLowerCase();
    const cleanMobile = userData.mobileNumber?.trim();
    const targetRoleLower = role ? String(role).trim().toLowerCase() : "";

    const existingIndex = mockUsers.findIndex(
      (u) =>
        (u.role?.toLowerCase() === targetRoleLower ||
          ((u.role === "command" || u.role === "admin") && (targetRoleLower === "command" || targetRoleLower === "admin"))) &&
        ((cleanEmail && u.email?.toLowerCase() === cleanEmail) ||
          (cleanMobile && u.mobileNumber === cleanMobile))
    );

    let newUser: User;
    if (existingIndex >= 0) {
      // Update existing mock user with latest registration info
      newUser = {
        ...mockUsers[existingIndex],
        email: userData.email || mockUsers[existingIndex].email,
        name: userData.fullName || userData.operatorName || userData.hospitalName || userData.officerName || userData.driverName || mockUsers[existingIndex].name,
        mobileNumber: userData.mobileNumber || mockUsers[existingIndex].mobileNumber,
        role: role,
      };
      mockUsers[existingIndex] = { ...newUser, password: userData.password, fullData: userData };
    } else {
      newUser = {
        id: `usr-${Math.random().toString(36).substr(2, 9)}`,
        email: userData.email,
        name: userData.fullName || userData.operatorName || userData.hospitalName || userData.officerName || userData.driverName || "AEGIS User",
        role: role,
        mobileNumber: userData.mobileNumber,
        isVerified: false,
      };
      mockUsers.push({ ...newUser, password: userData.password, fullData: userData });
    }

    localStorage.setItem("aegis_mock_users", JSON.stringify(mockUsers));

    const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + btoa(JSON.stringify(newUser));

    localStorage.setItem("aegis_user", JSON.stringify(newUser));
    localStorage.setItem("aegis_token", mockToken);

    setUser(newUser);
    setToken(mockToken);
    setIsLoading(false);

    return newUser;
  };

  const logout = () => {
    localStorage.removeItem("aegis_user");
    localStorage.removeItem("aegis_token");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
