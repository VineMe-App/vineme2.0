"use client";

import { ReportsBoard } from "@/components/dashboard/ReportsBoard";
import { fetchReports } from "@/lib/dashboard/queries";
import { useDashboardQuery } from "@/lib/dashboard/use-dashboard-query";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export default function ReportsPage() {
  const query = useDashboardQuery(fetchReports);

  return (
    <DashboardPage>
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">Reports</h1>
      <p className="mt-2 text-muted-foreground">
        How people are finding a group at your church.
      </p>

      {query.status === "loading" ? (
        <p className="mt-8 text-muted-foreground">Loading your reports...</p>
      ) : null}
      {query.status === "error" ? (
        <p className="mt-8 text-muted-foreground">
          We could not load your reports. Refresh to try again.
        </p>
      ) : null}
      {query.status === "ready" ? <ReportsBoard data={query.data} /> : null}
    </DashboardPage>
  );
}
