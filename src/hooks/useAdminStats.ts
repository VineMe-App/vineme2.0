import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth';

export interface NewcomersStats {
  total: number;
  connected: number;
  notConnected: number;
}

export interface GroupsStats {
  total: number;
  atCapacity: number;
  notAtCapacity: number;
  pending: number;
}

export interface RequestsStats {
  outstandingRequests: number;
  archivedByReason: {
    reason: string;
    count: number;
  }[];
}

/**
 * Get newcomers stats for the admin's service
 * Connected = has at least one group request with journey_status = 3
 */
export const useNewcomersStats = () => {
  const { userProfile } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'newcomers-stats', userProfile?.service_id],
    queryFn: async (): Promise<NewcomersStats> => {
      if (!userProfile?.service_id || !userProfile.church_id) {
        throw new Error('No service or church ID found');
      }

      // Get all newcomers in the admin's church (across services)
      const { data: newcomers, error: newcomersError } = await supabase
        .from('users')
        .select('id')
        .eq('church_id', userProfile.church_id)
        .eq('newcomer', true);

      if (newcomersError) throw newcomersError;

      // Original total based on all newcomers in the service
      // const total = newcomers?.length || 0;
      // if (total === 0) {
      //   return { total: 0, connected: 0, notConnected: 0 };
      // }

      const newcomerIds = newcomers.map((n: { id: string }) => n.id);

      // Early return if no newcomers (avoid Supabase error with empty .in() filter)
      if (newcomerIds.length === 0) {
        return { total: 0, connected: 0, notConnected: 0 };
      }

      // Only consider newcomers who have at least one membership (i.e. have requested to join a group)
      const { data: membershipRequests, error: membershipRequestsError } =
        await supabase
          .from('group_memberships')
          .select(
            `
            user_id,
            status,
            journey_status,
            group:groups(id, service_id, status)
          `
          )
          .in('user_id', newcomerIds);

      if (membershipRequestsError) throw membershipRequestsError;

      const requestingUserIds = new Set(
        membershipRequests
          ?.filter(
            (m: any) =>
              m.group?.service_id === userProfile.service_id &&
              m.group?.status === 'approved'
          )
          .map((m: any) => m.user_id) || []
      );

      const requestingNewcomerIds = newcomerIds.filter((id) =>
        requestingUserIds.has(id)
      );

      const total = requestingNewcomerIds.length;

      if (total === 0) {
        return { total: 0, connected: 0, notConnected: 0 };
      }

      // Get all memberships for these newcomers where journey_status = 3
      const { data: connectedMemberships, error: membershipError } =
        await supabase
          .from('group_memberships')
          .select(
            `
            user_id,
            journey_status,
            group:groups(id, service_id, status)
          `
          )
          .in('user_id', requestingNewcomerIds);

      if (membershipError) throw membershipError;

      // Get unique user IDs who have reached journey_status 3
      const connectedUserIds = new Set(
        connectedMemberships
          ?.filter(
            (m: any) =>
              m.journey_status === 3 &&
              m.group?.service_id === userProfile.service_id &&
              m.group?.status === 'approved'
          )
          .map((m: any) => m.user_id) || []
      );

      const connected = requestingNewcomerIds.filter((id) =>
        connectedUserIds.has(id)
      ).length;
      const notConnected = total - connected;

      return {
        total,
        connected,
        notConnected,
      };
    },
    enabled: !!userProfile?.service_id,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
};

/**
 * Get groups stats for the admin's service
 * Shows breakdown by at_capacity status and pending status
 */
export const useGroupsStats = () => {
  const { userProfile } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'groups-stats', userProfile?.service_id],
    queryFn: async (): Promise<GroupsStats> => {
      if (!userProfile?.service_id) {
        throw new Error('No service ID found');
      }

      const { data: groups, error } = await supabase
        .from('groups')
        .select('id, status, at_capacity')
        .eq('service_id', userProfile.service_id);

      if (error) throw error;

      const total = groups?.length || 0;

      if (total === 0) {
        return {
          total: 0,
          atCapacity: 0,
          notAtCapacity: 0,
          pending: 0,
        };
      }

      const pending = groups.filter(
        (g: { status: string }) => g.status === 'pending'
      ).length;
      const activeGroups = groups.filter(
        (g: { status: string }) =>
          g.status === 'approved' || g.status === 'active'
      );
      const atCapacity = activeGroups.filter(
        (g: { at_capacity: boolean }) => g.at_capacity === true
      ).length;
      const notAtCapacity = activeGroups.length - atCapacity;

      return {
        total,
        atCapacity,
        notAtCapacity,
        pending,
      };
    },
    enabled: !!userProfile?.service_id,
    refetchInterval: 60000,
    staleTime: 30000,
  });
};

/**
 * Get requests stats for the admin's service
 * Shows outstanding pending requests and archived requests by reason
 */
export const useRequestsStats = () => {
  const { userProfile } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'requests-stats', userProfile?.service_id],
    queryFn: async (): Promise<RequestsStats> => {
      if (!userProfile?.service_id) {
        throw new Error('No service ID found');
      }

      // Get all groups for this service
      const { data: serviceGroups, error: groupsError } = await supabase
        .from('groups')
        .select('id')
        .eq('service_id', userProfile.service_id);

      if (groupsError) throw groupsError;

      const groupIds = serviceGroups?.map((g: { id: string }) => g.id) || [];

      if (groupIds.length === 0) {
        return {
          outstandingRequests: 0,
          archivedByReason: [],
        };
      }

      // Get outstanding (pending) requests
      const { data: pendingRequests, error: pendingError } = await supabase
        .from('group_memberships')
        .select('id')
        .in('group_id', groupIds)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      const outstandingRequests = pendingRequests?.length || 0;

      // Get archived requests
      const { data: archivedRequests, error: archivedError } = await supabase
        .from('group_memberships')
        .select('id')
        .in('group_id', groupIds)
        .eq('status', 'archived');

      if (archivedError) throw archivedError;

      const archivedMembershipIds =
        archivedRequests?.map((r: { id: string }) => r.id) || [];

      if (archivedMembershipIds.length === 0) {
        return {
          outstandingRequests,
          archivedByReason: [],
        };
      }

      // Get archive reasons from notes
      const { data: archiveNotes, error: notesError } = await supabase
        .from('group_membership_notes')
        .select('reason')
        .in('membership_id', archivedMembershipIds)
        .eq('note_type', 'request_archived')
        .not('reason', 'is', null);

      if (notesError) throw notesError;

      // Count by reason
      const reasonCounts = new Map<string, number>();
      archiveNotes?.forEach((note: { reason: string | null }) => {
        if (note.reason) {
          const count = reasonCounts.get(note.reason) || 0;
          reasonCounts.set(note.reason, count + 1);
        }
      });

      const archivedByReason = Array.from(reasonCounts.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

      return {
        outstandingRequests,
        archivedByReason,
      };
    },
    enabled: !!userProfile?.service_id,
    refetchInterval: 60000,
    staleTime: 30000,
  });
};
