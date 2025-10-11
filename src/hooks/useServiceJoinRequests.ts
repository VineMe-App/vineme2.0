import { useQuery } from '@tanstack/react-query';
import { groupAdminService } from '../services/admin';
import { useAuthStore } from '../stores/auth';

/**
 * Hook to get all pending join requests for the church admin's service
 */
export const useServiceJoinRequests = () => {
  const { userProfile } = useAuthStore();

  return useQuery({
    queryKey: ['admin', 'service-join-requests', userProfile?.service_id],
    queryFn: async () => {
      if (!userProfile?.service_id) {
        throw new Error('No service ID found');
      }

      const { data, error } = await groupAdminService.getServiceJoinRequests(
        userProfile.service_id
      );

      if (error) throw error;
      return data;
    },
    enabled: !!userProfile?.service_id,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
};

