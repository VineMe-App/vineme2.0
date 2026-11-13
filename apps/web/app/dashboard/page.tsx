"use client";

import { useState } from "react";
import { MemberSheet } from "@/components/dashboard/MemberSheet";
import { MemberTableRow } from "@/components/dashboard/MemberTableRow";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PendingRequestsChart } from "@/components/dashboard/PendingRequestsChart";
import { useAdmin } from "@/lib/dashboard/admin-context";
import { fetchFollowUps, fetchOverview } from "@/lib/dashboard/queries";
import { useDashboardQuery } from "@/lib/dashboard/use-dashboard-query";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { requestStatuses } from "@/lib/dashboard/terms";

const SHOW_INVITE_USER = false;

export default function OverviewPage() {
  const { churchName, serviceName } = useAdmin();
  const query = useDashboardQuery(fetchOverview);
  const overview = query.data;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const selectedMember =
    overview?.members.find((member) => member.id === selectedId) ?? null;
  const handleSelectMember = (id: string) => {
    setSelectedId(id);
    setIsSheetOpen(true);
  };
  const followUps = useDashboardQuery(fetchFollowUps);
  const stats = [
    ["Total users", overview?.totalPeople],
    [`${requestStatuses.pending.label} requests`, overview?.pendingFollowUps],
    ["Groups at capacity", overview?.groupsAtCapacity],
  ];

  return (
    <DashboardPage>
      <div className="flex flex-col gap-4 rounded-3xl bg-brand-dark px-6 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">
            {churchName ?? "Your church"}
          </h1>
          {serviceName ? (
            <p className="mt-1 text-white/75">{serviceName}</p>
          ) : null}
        </div>
        {/* Hidden until DEV-6 makes inviting work; set to true to bring it back. */}
        {SHOW_INVITE_USER ? <Button size="xl">Invite user</Button> : null}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardPanel>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {label}
              </p>
              <p className="mt-3 font-heading text-4xl font-bold text-foreground">
                {value ?? "-"}
              </p>
            </CardPanel>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <PendingRequestsChart
          people={followUps.data}
          hasError={followUps.status === "error"}
        />
      </div>

      <div className="mt-8">
        <CardFrame>
          <CardFrameHeader>
            <CardFrameTitle>User database</CardFrameTitle>
            <CardFrameDescription>
              {query.status === "error"
                ? "We could not load your people. Refresh to try again."
                : "The newest people at your church. See everyone under Members."}
            </CardFrameDescription>
          </CardFrameHeader>
          <Table variant="card" className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(overview?.members ?? []).map((user) => (
                <MemberTableRow
                  key={user.id}
                  member={user}
                  onSelect={handleSelectMember}
                />
              ))}
            </TableBody>
          </Table>
        </CardFrame>
      </div>

      <MemberSheet
        member={selectedMember}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </DashboardPage>
  );
}
