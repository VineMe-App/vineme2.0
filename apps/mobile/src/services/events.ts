import { supabase } from './supabase';
import { permissionService } from './permissions';
import type {
  Event,
  EventWithDetails,
  EventCategory,
  Ticket,
} from '../types/database';

export interface EventServiceResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export interface CreateTicketData {
  event_id: string;
  user_id: string;
}

export class EventService {
  /**
   * Get events by church ID with category and host information
   */
  async getEventsByChurch(
    churchId: string
  ): Promise<EventServiceResponse<EventWithDetails[]>> {
    try {
      // Check permission to access church data
      const permissionCheck =
        await permissionService.canAccessChurchData(churchId);
      if (!permissionCheck.hasPermission) {
        return {
          data: null,
          error: new Error(
            permissionCheck.reason || 'Access denied to church data'
          ),
        };
      }

      // Validate RLS compliance
      const rlsCheck = await permissionService.validateRLSCompliance(
        'events',
        'select',
        { church_id: churchId, is_public: true }
      );
      if (!rlsCheck.hasPermission) {
        return {
          data: null,
          error: new Error(rlsCheck.reason || 'RLS policy violation'),
        };
      }

      const { data, error } = await supabase
        .from('events')
        .select(
          `
          *,
          category_info:categories(
            id,
            name,
            description,
            color,
            icon
          ),
          host:users!events_host_id_fkey(
            id,
            name,
            avatar_url
          ),
          church:churches!events_church_id_fkey(
            id,
            name,
            address,
            phone,
            email
          )
        `
        )
        .eq('church_id', churchId)
        .eq('is_public', true)
        .gte('start_date', new Date().toISOString())
        .order('start_date');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to get events'),
      };
    }
  }

  /**
   * Get event by ID with detailed information
   */
  async getEventById(
    eventId: string
  ): Promise<EventServiceResponse<EventWithDetails>> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(
          `
          *,
          category_info:categories(
            id,
            name,
            description,
            color,
            icon
          ),
          host:users!events_host_id_fkey(
            id,
            name,
            avatar_url
          ),
          church:churches!events_church_id_fkey(
            id,
            name,
            address,
            phone,
            email
          )
        `
        )
        .eq('id', eventId)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Get ticket count if event requires tickets
      let ticketCount = 0;
      if (data.requires_ticket) {
        const { count } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('status', 'active');

        ticketCount = count || 0;
      }

      const eventWithDetails = {
        ...data,
        ticket_count: ticketCount,
      };

      return { data: eventWithDetails, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to get event'),
      };
    }
  }

  /**
   * Get upcoming events for a user (events they have tickets for)
   */
  async getUserEvents(
    userId: string
  ): Promise<EventServiceResponse<EventWithDetails[]>> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(
          `
          *,
          event:events(
            *,
            category_info:categories(
              id,
              name,
              description,
              color,
              icon
            ),
            host:users!events_host_id_fkey(
              id,
              name,
              avatar_url
            ),
            church:churches!events_church_id_fkey(
              id,
              name,
              address
            )
          )
        `
        )
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('event.start_date', new Date().toISOString());

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Extract events from tickets
      const events = data?.map((ticket) => ticket.event).filter(Boolean) || [];

      return { data: events, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get user events'),
      };
    }
  }

  /**
   * Get all event categories
   */
  async getEventCategories(): Promise<EventServiceResponse<EventCategory[]>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get event categories'),
      };
    }
  }

  /**
   * Get events by category
   */
  async getEventsByCategory(
    categoryId: string,
    churchId?: string
  ): Promise<EventServiceResponse<EventWithDetails[]>> {
    try {
      let queryBuilder = supabase
        .from('events')
        .select(
          `
          *,
          category_info:categories(
            id,
            name,
            description,
            color,
            icon
          ),
          host:users!events_host_id_fkey(
            id,
            name,
            avatar_url
          ),
          church:churches(
            id,
            name,
            address
          )
        `
        )
        .eq('category', categoryId)
        .eq('is_public', true)
        .gte('start_date', new Date().toISOString())
        .order('start_date');

      if (churchId) {
        queryBuilder = queryBuilder.eq('church_id', churchId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get events by category'),
      };
    }
  }

  /**
   * Create a ticket for an event
   */
  async createTicket(
    ticketData: CreateTicketData
  ): Promise<EventServiceResponse<Ticket>> {
    try {
      // Validate RLS compliance for ticket creation
      const rlsCheck = await permissionService.validateRLSCompliance(
        'tickets',
        'insert',
        { user_id: ticketData.user_id }
      );
      if (!rlsCheck.hasPermission) {
        return {
          data: null,
          error: new Error(rlsCheck.reason || 'RLS policy violation'),
        };
      }

      // Check if user already has a ticket for this event
      const { data: existingTicket } = await supabase
        .from('tickets')
        .select('id, status')
        .eq('event_id', ticketData.event_id)
        .eq('user_id', ticketData.user_id)
        .single();

      if (existingTicket) {
        if (existingTicket.status === 'active') {
          return {
            data: null,
            error: new Error('User already has a ticket for this event'),
          };
        }

        // Reactivate existing ticket
        const { data, error } = await supabase
          .from('tickets')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingTicket.id)
          .select()
          .single();

        if (error) {
          return { data: null, error: new Error(error.message) };
        }

        return { data, error: null };
      }

      // Create new ticket
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          event_id: ticketData.event_id,
          user_id: ticketData.user_id,
          status: 'active',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to create ticket'),
      };
    }
  }

  /**
   * Cancel a ticket
   */
  async cancelTicket(
    eventId: string,
    userId: string
  ): Promise<EventServiceResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to cancel ticket'),
      };
    }
  }

  /**
   * Check if user has a ticket for an event
   */
  async hasUserTicket(
    eventId: string,
    userId: string
  ): Promise<EventServiceResponse<{ hasTicket: boolean; ticket?: Ticket }>> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error
        return { data: null, error: new Error(error.message) };
      }

      return {
        data: {
          hasTicket: !!data,
          ticket: data || undefined,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to check user ticket'),
      };
    }
  }

  /**
   * Search events by title or description
   */
  async searchEvents(
    query: string,
    churchId?: string,
    limit: number = 20
  ): Promise<EventServiceResponse<EventWithDetails[]>> {
    try {
      let queryBuilder = supabase
        .from('events')
        .select(
          `
          *,
          category_info:categories(
            id,
            name,
            description,
            color,
            icon
          ),
          host:users!events_host_id_fkey(
            id,
            name,
            avatar_url,
            email
          ),
          church:churches(
            id,
            name,
            address
          )
        `
        )
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_public', true)
        .gte('start_date', new Date().toISOString())
        .limit(limit);

      if (churchId) {
        queryBuilder = queryBuilder.eq('church_id', churchId);
      }

      const { data, error } = await queryBuilder.order('start_date');

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to search events'),
      };
    }
  }
}

// Export singleton instance
export const eventService = new EventService();
