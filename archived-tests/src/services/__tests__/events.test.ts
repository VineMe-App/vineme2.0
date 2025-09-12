import { eventService } from '../events';
import { supabase } from '../supabase';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('EventService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEventsByChurch', () => {
    it('should get events by church ID with related data', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Bible Study',
          description: 'Weekly Bible study',
          church_id: 'church-1',
          host_id: 'user-1',
          category: 'study',
          start_date: '2024-01-15T19:00:00Z',
          location: { address: '123 Main St' },
          is_public: true,
          requires_ticket: false,
          category_info: { id: 'study', name: 'Bible Study' },
          host: { id: 'user-1', name: 'John Doe' },
          church: { id: 'church-1', name: 'Test Church' },
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockEvents, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await eventService.getEventsByChurch('church-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockQuery.select).toHaveBeenCalledWith(
        expect.stringContaining('category_info:event_categories')
      );
      expect(mockQuery.eq).toHaveBeenCalledWith('church_id', 'church-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockQuery.gte).toHaveBeenCalledWith(
        'start_date',
        expect.any(String)
      );
      expect(result.data).toEqual(mockEvents);
      expect(result.error).toBeNull();
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await eventService.getEventsByChurch('church-1');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Database error');
    });
  });

  describe('getEventById', () => {
    it('should get event by ID with detailed information', async () => {
      const mockEvent = {
        id: '1',
        title: 'Bible Study',
        description: 'Weekly Bible study',
        church_id: 'church-1',
        host_id: 'user-1',
        category: 'study',
        start_date: '2024-01-15T19:00:00Z',
        requires_ticket: true,
        category_info: { id: 'study', name: 'Bible Study' },
        host: { id: 'user-1', name: 'John Doe' },
        church: { id: 'church-1', name: 'Test Church' },
      };

      const mockEventQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }),
      };

      const mockTicketQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      // Mock the select call with count options
      mockTicketQuery.select.mockReturnValue(mockTicketQuery);
      // Chain the eq calls and return the count
      mockTicketQuery.eq
        .mockReturnValueOnce(mockTicketQuery)
        .mockReturnValueOnce({
          ...mockTicketQuery,
          eq: jest.fn().mockResolvedValue({ count: 5 }),
        });

      mockSupabase.from
        .mockReturnValueOnce(mockEventQuery as any)
        .mockReturnValueOnce(mockTicketQuery as any);

      const result = await eventService.getEventById('1');

      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.from).toHaveBeenCalledWith('tickets');
      expect(result.data).toEqual({ ...mockEvent, ticket_count: 0 });
      expect(result.error).toBeNull();
    });

    it('should handle events that do not require tickets', async () => {
      const mockEvent = {
        id: '1',
        title: 'Bible Study',
        requires_ticket: false,
        category_info: { id: 'study', name: 'Bible Study' },
        host: { id: 'user-1', name: 'John Doe' },
        church: { id: 'church-1', name: 'Test Church' },
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockEvent, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await eventService.getEventById('1');

      expect(result.data).toEqual({ ...mockEvent, ticket_count: 0 });
      expect(result.error).toBeNull();
    });
  });

  describe('getUserEvents', () => {
    it('should get events for a user', async () => {
      const mockTickets = [
        {
          id: 'ticket-1',
          event_id: 'event-1',
          user_id: 'user-1',
          status: 'active',
          event: {
            id: 'event-1',
            title: 'Bible Study',
            category_info: { id: 'study', name: 'Bible Study' },
            host: { id: 'user-2', name: 'Jane Doe' },
            church: { id: 'church-1', name: 'Test Church' },
          },
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({ data: mockTickets, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await eventService.getUserEvents('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('tickets');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
      expect(result.data).toEqual([mockTickets[0].event]);
      expect(result.error).toBeNull();
    });
  });

  describe('getEventCategories', () => {
    it('should get all event categories', async () => {
      const mockCategories = [
        { id: 'study', name: 'Bible Study', color: '#blue' },
        { id: 'worship', name: 'Worship', color: '#purple' },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest
          .fn()
          .mockResolvedValue({ data: mockCategories, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await eventService.getEventCategories();

      expect(mockSupabase.from).toHaveBeenCalledWith('event_categories');
      expect(mockQuery.order).toHaveBeenCalledWith('name');
      expect(result.data).toEqual(mockCategories);
      expect(result.error).toBeNull();
    });
  });

  describe('createTicket', () => {
    it('should create a new ticket', async () => {
      const mockTicket = {
        id: 'ticket-1',
        event_id: 'event-1',
        user_id: 'user-1',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockExistingQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };

      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTicket, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockExistingQuery as any)
        .mockReturnValueOnce(mockInsertQuery as any);

      const result = await eventService.createTicket({
        event_id: 'event-1',
        user_id: 'user-1',
      });

      expect(result.data).toEqual(mockTicket);
      expect(result.error).toBeNull();
    });

    it('should prevent duplicate tickets', async () => {
      const mockExistingTicket = {
        id: 'ticket-1',
        status: 'active',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: mockExistingTicket, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await eventService.createTicket({
        event_id: 'event-1',
        user_id: 'user-1',
      });

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe(
        'User already has a ticket for this event'
      );
    });

    it('should reactivate cancelled tickets', async () => {
      const mockExistingTicket = {
        id: 'ticket-1',
        status: 'cancelled',
      };

      const mockUpdatedTicket = {
        id: 'ticket-1',
        status: 'active',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: mockExistingTicket, error: null }),
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: mockUpdatedTicket, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any);

      const result = await eventService.createTicket({
        event_id: 'event-1',
        user_id: 'user-1',
      });

      expect(result.data).toEqual(mockUpdatedTicket);
      expect(result.error).toBeNull();
    });
  });

  describe('cancelTicket', () => {
    it('should cancel a ticket', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      // Chain the eq calls properly
      mockQuery.eq.mockReturnValueOnce(mockQuery).mockReturnValueOnce({
        ...mockQuery,
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await eventService.cancelTicket('event-1', 'user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('tickets');
      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'cancelled',
        updated_at: expect.any(String),
      });
      expect(result.data).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('hasUserTicket', () => {
    it('should check if user has a ticket', async () => {
      const mockTicket = {
        id: 'ticket-1',
        event_id: 'event-1',
        user_id: 'user-1',
        status: 'active',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTicket, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await eventService.hasUserTicket('event-1', 'user-1');

      expect(result.data).toEqual({
        hasTicket: true,
        ticket: mockTicket,
      });
      expect(result.error).toBeNull();
    });

    it('should return false when user has no ticket', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await eventService.hasUserTicket('event-1', 'user-1');

      expect(result.data).toEqual({
        hasTicket: false,
        ticket: undefined,
      });
      expect(result.error).toBeNull();
    });
  });

  describe('searchEvents', () => {
    it('should search events by query', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Bible Study',
          description: 'Weekly Bible study',
          category_info: { id: 'study', name: 'Bible Study' },
          host: { id: 'user-1', name: 'John Doe' },
          church: { id: 'church-1', name: 'Test Church' },
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockEvents, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await eventService.searchEvents('Bible', 'church-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockQuery.or).toHaveBeenCalledWith(
        'title.ilike.%Bible%,description.ilike.%Bible%'
      );
      expect(mockQuery.eq).toHaveBeenCalledWith('church_id', 'church-1');
      expect(result.data).toEqual(mockEvents);
      expect(result.error).toBeNull();
    });

    it('should search events without church filter', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Bible Study',
          category_info: { id: 'study', name: 'Bible Study' },
          host: { id: 'user-1', name: 'John Doe' },
          church: { id: 'church-1', name: 'Test Church' },
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockEvents, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const result = await eventService.searchEvents('Bible');

      expect(mockQuery.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockQuery.eq).not.toHaveBeenCalledWith(
        'church_id',
        expect.anything()
      );
      expect(result.data).toEqual(mockEvents);
      expect(result.error).toBeNull();
    });
  });
});
