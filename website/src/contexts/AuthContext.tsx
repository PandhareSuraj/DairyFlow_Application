import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "delivery_boy" | "customer";

export interface UserProfile {
  id: string;
  full_name: string;
  dairy_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  admin_id?: string | null;
  delivery_boy_id?: string | null;
  status?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  adminId: string | null;
  isLoading: boolean;
  sendAdminWhatsAppOtp: (phone: string) => Promise<{ error?: string; message?: string }>;
  verifyAdminWhatsAppOtp: (phone: string, otp: string) => Promise<{ error?: string }>;
  consumeDeliveryQr: (token: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toProfile = (profile: any, fallbackEmail?: string | null): UserProfile | null => {
  if (!profile) return null;
  const role = profile.role === "delivery_boy" || profile.role === "customer" ? profile.role : "admin";
  return {
    id: profile.id,
    full_name: profile.full_name || profile.name || fallbackEmail || "DairyFlow User",
    dairy_name: profile.dairy_name,
    email: profile.email || profile.auth_email || fallbackEmail,
    phone: profile.phone,
    role,
    admin_id: profile.admin_id,
    delivery_boy_id: profile.delivery_boy_id,
    status: profile.status,
  };
};

const normalizeIndianPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const testAdminLogins = (
  import.meta.env.VITE_TEST_ADMIN_LOGINS ||
  (import.meta.env.DEV ? "8275838256|123456|dairyflow.admin.8275838256@test.local|DairyFlowTest@8275838256" : "")
)
  .split(",")
  .map((entry: string) => {
    const [phone, otp, email, password] = entry.split("|");
    return { phone, otp, email, password };
  })
  .filter((entry) => entry.phone && entry.otp && entry.email && entry.password);

const testAdminLoginFor = (phone: string) => {
  const digits = normalizeIndianPhone(phone);
  const withoutCountry = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return testAdminLogins.find((entry) => entry.phone === digits || entry.phone === withoutCountry);
};

const functionMessage = (data: any, fallback: string) => {
  if (!data) return fallback;
  return data.message || data.error || fallback;
};

const importSession = async (data: any) => {
  if (!data?.access_token || !data?.refresh_token) {
    throw new Error(functionMessage(data, "Login did not return a Supabase session."));
  }

  const { data: sessionData, error } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });

  if (error) throw error;
  return sessionData.session;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async (activeSession: Session | null) => {
    if (!activeSession?.user) {
      setUser(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles" as any)
      .select("*")
      .eq("id", activeSession.user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load DairyFlow profile", error);
      setUser(null);
      return;
    }

    setUser(toProfile(data, activeSession.user.email));
  };

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      await loadProfile(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
      setTimeout(() => {
        loadProfile(nextSession);
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const adminId = useMemo(() => {
    if (!user) return null;
    return user.role === "admin" ? user.id : user.admin_id || null;
  }, [user]);

  const sendAdminWhatsAppOtp = async (phone: string) => {
    setIsLoading(true);
    const normalizedPhone = normalizeIndianPhone(phone);
    if (normalizedPhone.length !== 12 || !normalizedPhone.startsWith("91")) {
      setIsLoading(false);
      return { error: "Enter a valid 10 digit Indian mobile number." };
    }

    if (testAdminLoginFor(phone)) {
      setIsLoading(false);
      return { message: "Testing OTP ready." };
    }

    const { data, error } = await supabase.functions.invoke("auth-whatsapp/request-otp", {
      body: { phone: normalizedPhone },
    });

    setIsLoading(false);
    if (error) return { error: error.message };
    if (data?.success === false) return { error: functionMessage(data, "Unable to send WhatsApp OTP.") };
    return { message: data?.message || "OTP sent on WhatsApp." };
  };

  const verifyAdminWhatsAppOtp = async (phone: string, otp: string) => {
    setIsLoading(true);
    const testLogin = testAdminLoginFor(phone);
    if (testLogin) {
      if (testLogin.otp !== otp.trim()) {
        setIsLoading(false);
        return { error: "Invalid OTP." };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: testLogin.email,
        password: testLogin.password,
      });

      if (error) {
        setIsLoading(false);
        return { error: error.message };
      }

      await loadProfile(data.session);
      setIsLoading(false);
      return {};
    }

    const normalizedPhone = normalizeIndianPhone(phone);
    const { data, error } = await supabase.functions.invoke("auth-whatsapp/verify-otp", {
      body: { phone: normalizedPhone, otp: otp.trim() },
    });

    if (error) {
      setIsLoading(false);
      return { error: error.message };
    }

    if (data?.verified === false || data?.success === false) {
      setIsLoading(false);
      return { error: functionMessage(data, "Invalid OTP.") };
    }

    if (data?.profile?.role && data.profile.role !== "admin") {
      setIsLoading(false);
      return { error: "This WhatsApp number is not linked to an admin account." };
    }

    try {
      const nextSession = await importSession(data);
      await loadProfile(nextSession);
    } catch (error: any) {
      setIsLoading(false);
      return { error: error.message || "Unable to import Supabase session." };
    }

    setIsLoading(false);
    return {};
  };

  const consumeDeliveryQr = async (token: string) => {
    setIsLoading(true);
    const rawToken = token.trim().startsWith("DAIRYFLOW_QR:")
      ? token.trim().replace("DAIRYFLOW_QR:", "")
      : token.trim();
    const { data, error } = await supabase.functions.invoke("verify-delivery-qr-login", {
      body: {
        qr_token: rawToken,
        device_id: window.navigator.userAgent.slice(0, 120),
      },
    });

    if (error) {
      setIsLoading(false);
      return { error: error.message };
    }
    if (data?.success === false) {
      setIsLoading(false);
      return { error: functionMessage(data, "Unable to verify delivery QR.") };
    }

    try {
      const nextSession = await importSession(data);
      await loadProfile(nextSession);
    } catch (error: any) {
      setIsLoading(false);
      return { error: error.message || "QR login did not return a Supabase session." };
    }

    setIsLoading(false);
    return {};
  };

  const refreshProfile = async () => {
    await loadProfile(session);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        adminId,
        isLoading,
        sendAdminWhatsAppOtp,
        verifyAdminWhatsAppOtp,
        consumeDeliveryQr,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
