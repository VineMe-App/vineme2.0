import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '../services/events';
import type {
  EventWithDetails,
  EventCategory,
  Ticket,
} from '../types/database';

// Query keys for React Query
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) =>
    [...eventKeys.lists(), { filters }] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
  categories: () => [...eventKeys.all, 'categories'] as const,
  userEvents: (userId: string) => [...eventKeys.all, 'user', userId] as const,
  userTicket: (eventId: string, userId: string) =>
    [...eventKeys.all, 'ticket', eventId, userId] as const,
};

/**
 * Hook to get events by church
 */
export function useEventsByChurch(churchId: string) {
  return useQuery({
    queryKey: eventKeys.list({ churchId }),
    queryFn: async () => {
      const response = await eventService.getEventsByChurch(churchId);
      if (response.error) {
        throw response.error;
      }
      return response.data;
    },
    enabled: !!churchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get event by ID
 */
export function useEvent(eventId: string) {
  return useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: async () => {
      const response = await eventService.getEventById(eventId);
      if (response.error) {
        throw response.error;
      }
      return response.data;
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get user's events (events they have tickets for)
 */
export function useUserEvents(userId: string) {
  return useQuery({
    queryKey: eventKeys.userEvents(userId),
    queryFn: async () => {
      const response = await eventService.getUserEvents(userId);
      if (response.error) {
        throw response.error;
      }
      return response.data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get event categories
 */
export function useEventCategories() {
  return useQuery({
    queryKey: eventKeys.categories(),
    queryFn: async () => {
      const response = await eventService.getEventCategories();
      if (response.error) {
        throw response.error;
      }
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (categories don't change often)
  });
}

/**
 * Hook to get events by category
 */
export function useEventsByCategory(categoryId: string, churchId?: string) {
  return useQuery({
    queryKey: eventKeys.list({ categoryId, churchId }),
    queryFn: async () => {
      const response = await eventService.getEventsByCategory(
        categoryId,
        churchId
      );
      if (response.error) {
        throw response.error;
      }
      return response.data;
    },
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to check if user has a ticket for an event
 */
export function useUserTicket(eventId: string, userId: string) {
  return useQuery({
    queryKey: eventKeys.userTicket(eventId, userId),
    queryFn: async () => {
      const response = await eventService.hasUserTicket(eventId, userId);
      if (response.error) {
        throw response.error;
      }
      return response.data;
    },
    enabled: !!eventId && !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to search events
 */
export function useSearchEvents(
  query: string,
  churchId?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: eventKeys.list({ search: query, churchId }),
    queryFn: async () => {
      const response = await eventService.searchEvents(query, churchId);
      if (response.error) {
        throw response.error;
      }
      return response.data;
    },
    enabled: enabled && query.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Mutation hook to create a ticket for an event
 */
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      userId,
    }: {
      eventId: string;
      userId: string;
    }) => {
      const response = await eventService.createTicket({
        event_id: eventId,
        user_id: userId,
      });
      if (response.error) {
        throw response.error;
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch user events
      queryClient.invalidateQueries({
        queryKey: eventKeys.userEvents(variables.userId),
      });
      // Invalidate user ticket status for this event
      queryClient.invalidateQueries({
        queryKey: eventKeys.userTicket(variables.eventId, variables.userId),
      });
      // Invalidate event details to update ticket count
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(variables.eventId),
      });
    },
  });
}

/**
 * Mutation hook to cancel a ticket
 */
export function useCancelTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      userId,
    }: {
      eventId: string;
      userId: string;
    }) => {
      const response = await eventService.cancelTicket(eventId, userId);
      if (response.error) {
        throw response.error;
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch user events
      queryClient.invalidateQueries({
        queryKey: eventKeys.userEvents(variables.userId),
      });
      // Invalidate user ticket status for this event
      queryClient.invalidateQueries({
        queryKey: eventKeys.userTicket(variables.eventId, variables.userId),
      });
      // Invalidate event details to update ticket count
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(variables.eventId),
      });
    },
  });
}

/**
 * Hook to get upcoming events for the home screen
 */
export function useUpcomingEvents(churchId: string, limit: number = 5) {
  return useQuery({
    queryKey: eventKeys.list({ churchId, upcoming: true, limit }),
    queryFn: async () => {
      const response = await eventService.getEventsByChurch(churchId);
      if (response.error) {
        throw response.error;
      }
      // Return only the first few events for the home screen
      return response.data?.slice(0, limit) || [];
    },
    enabled: !!churchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
