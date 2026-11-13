"use client";

import { useEffect, useState } from "react";
import { useAdmin, type AdminContextValue } from "@/lib/dashboard/admin-context";

type QueryState<T> =
  | { status: "loading"; data: null }
  | { status: "error"; data: null }
  | { status: "ready"; data: T };

/**
 * Runs a dashboard query once for the signed-in admin's church.
 * `fetcher` must be a stable (module-level) function.
 */
export function useDashboardQuery<T>(
  fetcher: (admin: AdminContextValue) => Promise<T>,
) {
  const admin = useAdmin();
  const [state, setState] = useState<QueryState<T>>({
    status: "loading",
    data: null,
  });

  useEffect(() => {
    let isMounted = true;

    fetcher(admin)
      .then((data) => {
        if (isMounted) setState({ status: "ready", data });
      })
      .catch(() => {
        if (isMounted) setState({ status: "error", data: null });
      });

    return () => {
      isMounted = false;
    };
  }, [admin, fetcher]);

  return state;
}
