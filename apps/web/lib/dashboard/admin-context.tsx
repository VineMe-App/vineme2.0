"use client";

import { createContext, useContext } from "react";
import type { createBrowserSupabaseClient } from "@/lib/supabase/client";

export interface ChurchOption {
  id: string;
  name: string;
}

export interface AdminContextValue {
  supabase: ReturnType<typeof createBrowserSupabaseClient>;
  userId: string;
  /** The church the dashboard is currently showing. */
  churchId: string;
  churchName: string | null;
  /** The admin's own service, on their home church only. */
  serviceId: string | null;
  serviceName: string | null;
  firstName: string;
  fullName: string;
  avatarUrl: string | null;
  /** Every church this admin may switch to, current one included. */
  churches: ChurchOption[];
  switchChurch: (churchId: string) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export const AdminProvider = AdminContext.Provider;

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) {
    throw new Error("useAdmin must be used inside the dashboard AdminGate.");
  }
  return value;
}
