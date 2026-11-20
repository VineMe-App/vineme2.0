"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { InsightsBoard } from "@/components/dashboard/InsightsBoard";
import { useAdmin } from "@/lib/dashboard/admin-context";
import {
  filterParams,
  parseFilters,
  type InsightsFilters,
} from "@/lib/dashboard/insights-filters";
import { fetchInsights } from "@/lib/dashboard/queries";
import { useDashboardQuery } from "@/lib/dashboard/use-dashboard-query";

export default function InsightsPage() {
  // useSearchParams needs a Suspense boundary on prerendered pages.
  return (
    <Suspense
      fallback={
        <DashboardPage>
          <p className="text-muted-foreground">Loading your insights...</p>
        </DashboardPage>
      }
    >
      <InsightsView />
    </Suspense>
  );
}

function InsightsView() {
  const { churchName } = useAdmin();
  const query = useDashboardQuery(fetchInsights);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseFilters(searchParams);

  const setFilters = (changes: Partial<InsightsFilters>) => {
    const next = filterParams({ ...filters, ...changes }).toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  return (
    <DashboardPage>
      <p className="font-medium text-muted-foreground text-sm">Insights</p>
      <h1 className="mt-1 font-heading text-3xl font-bold sm:text-4xl">
        How are people getting connected at {churchName ?? "your church"}?
      </h1>

      {query.status === "loading" ? (
        <p className="mt-8 text-muted-foreground">Loading your insights...</p>
      ) : null}
      {query.status === "error" ? (
        <p className="mt-8 text-muted-foreground">
          We could not load your insights. Refresh to try again.
        </p>
      ) : null}
      {query.status === "ready" ? (
        <InsightsBoard
          data={query.data}
          filters={filters}
          onChange={setFilters}
        />
      ) : null}
    </DashboardPage>
  );
}
